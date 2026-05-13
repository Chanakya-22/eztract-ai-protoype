"""
EZtract U-Net Trainer

Run from any directory:
  python backend/ml/train_unet.py
  python backend/ml/train_unet.py --epochs 5   # quick smoke test

Outputs (always written next to this script):
  checkpoints/best_model.pth   best weights by val IoU
  checkpoints/last_model.pth   final epoch weights
  training_log.json            loss + IoU per epoch
"""

import os, sys, json, argparse
import numpy as np
from PIL import Image

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, random_split
import torchvision.transforms.functional as TF
import torchvision.transforms as T

# ── anchor all paths to this script's directory ───────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR  = os.path.join(BASE_DIR, "data")
CKPT_DIR  = os.path.join(BASE_DIR, "checkpoints")

# ── config ────────────────────────────────────────────────────────────────────
IMG_SIZE   = 256
N_CLASSES  = 4          # 0=background  1=road  2=plot  3=boundary
BATCH_SIZE = 8
EPOCHS     = 40
LR         = 1e-3
VAL_SPLIT  = 0.2
DEVICE     = "cuda" if torch.cuda.is_available() else "cpu"


# ═══════════════════════════════════════════════════════════════════════════
#  DATASET  — with colour jitter so model generalises to non-white-grey images
# ═══════════════════════════════════════════════════════════════════════════

class LayoutDataset(Dataset):
    def __init__(self, data_dir=DATA_DIR, size=IMG_SIZE, augment=True):
        self.img_dir  = os.path.join(data_dir, "images")
        self.mask_dir = os.path.join(data_dir, "masks")
        self.size     = size
        self.augment  = augment
        self.ids      = sorted(
            f.replace(".png","") for f in os.listdir(self.img_dir)
            if f.endswith(".png")
        )
        if len(self.ids) == 0:
            raise RuntimeError(
                f"No images found in {self.img_dir}\n"
                f"Run generate.py first: python {os.path.join(BASE_DIR,'generate.py')}"
            )
        # colour jitter applied to image only (not mask)
        self.jitter = T.ColorJitter(
            brightness=0.3, contrast=0.3, saturation=0.3, hue=0.05
        )

    def __len__(self):
        return len(self.ids)

    def __getitem__(self, idx):
        fid  = self.ids[idx]
        img  = Image.open(os.path.join(self.img_dir,  f"{fid}.png")).convert("RGB")
        mask = Image.open(os.path.join(self.mask_dir, f"{fid}.png")).convert("L")

        img  = img.resize((self.size, self.size), Image.BILINEAR)
        mask = mask.resize((self.size, self.size), Image.NEAREST)

        if self.augment:
            # geometry (must apply identically to img and mask)
            if torch.rand(1) > 0.5:
                img  = TF.hflip(img)
                mask = TF.hflip(mask)
            if torch.rand(1) > 0.5:
                img  = TF.vflip(img)
                mask = TF.vflip(mask)
            # colour jitter on image only — makes model robust to color variations
            img = self.jitter(img)

        return TF.to_tensor(img), torch.from_numpy(np.array(mask)).long()


# ═══════════════════════════════════════════════════════════════════════════
#  MODEL
# ═══════════════════════════════════════════════════════════════════════════

def double_conv(in_ch, out_ch):
    return nn.Sequential(
        nn.Conv2d(in_ch, out_ch, 3, padding=1, bias=False),
        nn.BatchNorm2d(out_ch), nn.ReLU(inplace=True),
        nn.Conv2d(out_ch, out_ch, 3, padding=1, bias=False),
        nn.BatchNorm2d(out_ch), nn.ReLU(inplace=True),
    )


class UNet(nn.Module):
    def __init__(self, n_classes=N_CLASSES):
        super().__init__()
        self.enc1 = double_conv(3,   32)
        self.enc2 = double_conv(32,  64)
        self.enc3 = double_conv(64,  128)
        self.enc4 = double_conv(128, 256)
        self.pool = nn.MaxPool2d(2)
        self.bottleneck = double_conv(256, 512)
        self.up4  = nn.ConvTranspose2d(512, 256, 2, stride=2)
        self.dec4 = double_conv(512, 256)
        self.up3  = nn.ConvTranspose2d(256, 128, 2, stride=2)
        self.dec3 = double_conv(256, 128)
        self.up2  = nn.ConvTranspose2d(128, 64,  2, stride=2)
        self.dec2 = double_conv(128, 64)
        self.up1  = nn.ConvTranspose2d(64,  32,  2, stride=2)
        self.dec1 = double_conv(64,  32)
        self.head = nn.Conv2d(32, n_classes, 1)

    def forward(self, x):
        e1 = self.enc1(x)
        e2 = self.enc2(self.pool(e1))
        e3 = self.enc3(self.pool(e2))
        e4 = self.enc4(self.pool(e3))
        b  = self.bottleneck(self.pool(e4))
        d4 = self.dec4(torch.cat([self.up4(b),  e4], dim=1))
        d3 = self.dec3(torch.cat([self.up3(d4), e3], dim=1))
        d2 = self.dec2(torch.cat([self.up2(d3), e2], dim=1))
        d1 = self.dec1(torch.cat([self.up1(d2), e1], dim=1))
        return self.head(d1)


# ═══════════════════════════════════════════════════════════════════════════
#  METRICS
# ═══════════════════════════════════════════════════════════════════════════

def mean_iou(preds, targets):
    ious = []
    for cls in range(1, N_CLASSES):
        pm = (preds == cls); tm = (targets == cls)
        inter = (pm & tm).sum().float()
        union = (pm | tm).sum().float()
        if union > 0:
            ious.append((inter / union).item())
    return float(np.mean(ious)) if ious else 0.0


# ═══════════════════════════════════════════════════════════════════════════
#  TRAINING LOOP
# ═══════════════════════════════════════════════════════════════════════════

def train(epochs=EPOCHS):
    os.makedirs(CKPT_DIR, exist_ok=True)

    full_ds = LayoutDataset(augment=True)
    n_val   = max(1, int(len(full_ds) * VAL_SPLIT))
    n_train = len(full_ds) - n_val
    train_ds, val_ds = random_split(
        full_ds, [n_train, n_val],
        generator=torch.Generator().manual_seed(42)
    )
    # disable augmentation on val set
    val_ds.dataset.augment = False

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True,  num_workers=0)
    val_loader   = DataLoader(val_ds,   batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

    print(f"Data dir : {DATA_DIR}")
    print(f"Ckpt dir : {CKPT_DIR}")
    print(f"Dataset  : {len(full_ds)} samples  —  train {n_train} / val {n_val}")
    print(f"Device   : {DEVICE}\n")

    model     = UNet().to(DEVICE)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=LR)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=5, factor=0.5)

    best_iou, log = 0.0, []

    for epoch in range(1, epochs + 1):
        model.train()
        t_loss = 0.0
        for imgs, masks in train_loader:
            imgs, masks = imgs.to(DEVICE), masks.to(DEVICE)
            optimizer.zero_grad()
            loss = criterion(model(imgs), masks)
            loss.backward(); optimizer.step()
            t_loss += loss.item() * imgs.size(0)
        t_loss /= n_train

        model.eval()
        v_loss = v_iou = 0.0
        with torch.no_grad():
            for imgs, masks in val_loader:
                imgs, masks = imgs.to(DEVICE), masks.to(DEVICE)
                logits = model(imgs)
                v_loss += criterion(logits, masks).item() * imgs.size(0)
                v_iou  += mean_iou(logits.argmax(dim=1), masks) * imgs.size(0)
        v_loss /= n_val; v_iou /= n_val
        scheduler.step(v_loss)

        log.append({"epoch":epoch,"train_loss":round(t_loss,4),
                    "val_loss":round(v_loss,4),"val_iou":round(v_iou,4)})
        print(f"Epoch {epoch:3d}/{epochs}  train={t_loss:.4f}  val={v_loss:.4f}  IoU={v_iou:.4f}")

        torch.save(model.state_dict(), os.path.join(CKPT_DIR, "last_model.pth"))
        if v_iou > best_iou:
            best_iou = v_iou
            torch.save(model.state_dict(), os.path.join(CKPT_DIR, "best_model.pth"))
            print(f"           ↑ new best (IoU {best_iou:.4f})")

    with open(os.path.join(BASE_DIR, "training_log.json"), "w") as f:
        json.dump(log, f, indent=2)
    print(f"\nTraining complete. Best val IoU: {best_iou:.4f}")
    print(f"Weights: {os.path.join(CKPT_DIR, 'best_model.pth')}")


# ═══════════════════════════════════════════════════════════════════════════
#  INFERENCE  (called by predict.py)
# ═══════════════════════════════════════════════════════════════════════════

def load_model(weights_path=None):
    if weights_path is None:
        weights_path = os.path.join(CKPT_DIR, "best_model.pth")
    if not os.path.exists(weights_path):
        raise FileNotFoundError(
            f"No trained model found at {weights_path}\n"
            f"Run training first: python {os.path.join(BASE_DIR,'train_unet.py')}"
        )
    model = UNet()
    model.load_state_dict(torch.load(weights_path, map_location="cpu"))
    model.eval()
    return model


def predict(model, pil_image):
    """
    Args:
        model     — UNet returned by load_model()
        pil_image — PIL Image RGB (upload from data/images/, NOT data/previews/)
    Returns:
        mask_arr  — numpy H×W class indices at original resolution
        polygons  — list of [[x,y],...] polygon arrays ready for PlotCanvas
    """
    import cv2

    orig_w, orig_h = pil_image.size
    resized = pil_image.resize((IMG_SIZE, IMG_SIZE), Image.BILINEAR)
    tensor  = TF.to_tensor(resized).unsqueeze(0)   # [1,3,256,256]

    with torch.no_grad():
        pred = model(tensor).argmax(dim=1).squeeze(0).numpy().astype(np.uint8)

    # debug info — printed to backend logs
    unique, counts = np.unique(pred, return_counts=True)
    names = {0:"bg", 1:"road", 2:"PLOT", 3:"boundary"}
    dist  = {names.get(u,u): int(c) for u, c in zip(unique, counts)}
    print(f"[CV] Model output class distribution: {dist}")

    # scale mask back to original resolution
    mask_full = cv2.resize(pred, (orig_w, orig_h), interpolation=cv2.INTER_NEAREST)

    # extract individual plot regions
    plot_pixels = (mask_full == 2).astype(np.uint8) * 255
    n_labels, labels = cv2.connectedComponents(plot_pixels)
    print(f"[CV] Connected components found: {n_labels - 1}")

    # adaptive area threshold — 0.1% of total image area
    min_area = orig_w * orig_h * 0.001
    print(f"[CV] Area threshold: {min_area:.0f} px²")

    polygons = []
    for label_id in range(1, n_labels):
        component = (labels == label_id).astype(np.uint8) * 255
        contours, _ = cv2.findContours(
            component, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            continue
        contour = max(contours, key=cv2.contourArea)
        area    = cv2.contourArea(contour)
        if area < min_area:
            print(f"[CV]   component {label_id}: {area:.0f}px² — skipped (below threshold)")
            continue
        epsilon = 0.02 * cv2.arcLength(contour, True)
        approx  = cv2.approxPolyDP(contour, epsilon, True)
        poly    = [[int(pt[0][0]), int(pt[0][1])] for pt in approx]
        polygons.append(poly)
        print(f"[CV]   component {label_id}: {area:.0f}px² — accepted ({len(poly)} vertices)")

    print(f"[CV] Final polygons returned: {len(polygons)}")
    return mask_full, polygons


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=EPOCHS)
    train(epochs=parser.parse_args().epochs)