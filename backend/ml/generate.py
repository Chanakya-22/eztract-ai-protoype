"""
EZtract Layout Generator
Generates synthetic plot layout images + ground truth segmentation masks.

Pixel class map (mask):
  0 = background / outside boundary
  1 = road / internal road network
  2 = plot interior
  3 = plot boundary line

Output (all paths are relative to THIS file's directory — safe to run from anywhere):
  data/images/layout_XXXX.png    → RGB image the model trains on
  data/masks/layout_XXXX.png     → single-channel class mask (ground truth)
  data/previews/layout_XXXX.png  → colour overlay for visual inspection only
                                   DO NOT upload previews to the CV endpoint.
                                   Upload a raw image from data/images/ instead.

Run from any directory:
  python backend/ml/generate.py
  OR
  cd backend/ml && python generate.py
"""

import random
import json
import os
from PIL import Image, ImageDraw
import numpy as np

# ── anchor all paths to this script's directory ───────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

SEED = 42
random.seed(SEED)
np.random.seed(SEED)

IMG_W, IMG_H  = 800, 800
MARGIN        = 40
ROAD_W_MAIN   = 18
ROAD_W_INNER  = 12
BOUNDARY_W    = 2

C_BACKGROUND = (245, 245, 240)
C_ROAD       = (200, 195, 185)
C_PLOT       = (255, 255, 255)
C_BOUNDARY   = (40,  40,  40)
C_ROAD_LINE  = (160, 155, 145)

M_BG       = 0
M_ROAD     = 1
M_PLOT     = 2
M_BOUNDARY = 3

PREVIEW = {
    M_BG:       (245, 245, 240,  80),
    M_ROAD:     (255, 180,  50, 160),
    M_PLOT:     ( 80, 180, 120, 160),
    M_BOUNDARY: ( 30,  30,  30, 200),
}


def _usable_rect():
    return (MARGIN + ROAD_W_MAIN, MARGIN + ROAD_W_MAIN,
            IMG_W - MARGIN - ROAD_W_MAIN, IMG_H - MARGIN - ROAD_W_MAIN)


def layout_uniform_grid(cols=4, rows=4):
    x0, y0, x1, y1 = _usable_rect()
    pw = (x1 - x0 - ROAD_W_INNER * (cols - 1)) / cols
    ph = (y1 - y0 - ROAD_W_INNER * (rows - 1)) / rows
    plots = []
    for r in range(rows):
        for c in range(cols):
            px = x0 + c * (pw + ROAD_W_INNER)
            py = y0 + r * (ph + ROAD_W_INNER)
            plots.append((int(px), int(py), int(px + pw), int(py + ph)))
    return plots


def layout_mixed_sizes():
    x0, y0, x1, y1 = _usable_rect()
    cols = random.choice([3, 4, 5])
    rows = random.choice([3, 4, 5])
    total_road_w = ROAD_W_INNER * (cols - 1)
    total_road_h = ROAD_W_INNER * (rows - 1)
    col_widths  = [((x1-x0-total_road_w)/cols)*random.uniform(0.82,1.18) for _ in range(cols)]
    row_heights = [((y1-y0-total_road_h)/rows)*random.uniform(0.82,1.18) for _ in range(rows)]
    col_widths  = [w*(x1-x0-total_road_w)/sum(col_widths)  for w in col_widths]
    row_heights = [h*(y1-y0-total_road_h)/sum(row_heights) for h in row_heights]
    plots = []
    cy = y0
    for r in range(rows):
        cx = x0
        for c in range(cols):
            plots.append((int(cx), int(cy),
                          int(cx+col_widths[c]), int(cy+row_heights[r])))
            cx += col_widths[c] + ROAD_W_INNER
        cy += row_heights[r] + ROAD_W_INNER
    return plots


def layout_dual_row_road():
    x0, y0, x1, y1 = _usable_rect()
    mid_road_w = ROAD_W_INNER * 2
    half_h = (y1-y0-mid_road_w)//2
    cols = random.randint(4, 7)
    pw = (x1-x0-ROAD_W_INNER*(cols-1))/cols
    mid_y0, mid_y1 = y0+half_h, y0+half_h+mid_road_w
    plots = []
    for c in range(cols):
        cx = x0 + c*(pw+ROAD_W_INNER)
        plots.append((int(cx), y0,    int(cx+pw), mid_y0))
        plots.append((int(cx), mid_y1, int(cx+pw), y1))
    return plots


def layout_irregular_cluster():
    x0, y0, x1, y1 = _usable_rect()
    cols, rows = 5, 5
    pw = (x1-x0-ROAD_W_INNER*(cols-1))/cols
    ph = (y1-y0-ROAD_W_INNER*(rows-1))/rows
    skip, plots = set(), []
    for r in range(rows):
        c = 0
        while c < cols:
            if c+1<cols and random.random()<0.2 and (r,c) not in skip:
                px, py = x0+c*(pw+ROAD_W_INNER), y0+r*(ph+ROAD_W_INNER)
                plots.append((int(px),int(py),int(px+pw*2+ROAD_W_INNER),int(py+ph)))
                skip.add((r,c)); skip.add((r,c+1)); c+=2
            else:
                if (r,c) not in skip:
                    px, py = x0+c*(pw+ROAD_W_INNER), y0+r*(ph+ROAD_W_INNER)
                    plots.append((int(px),int(py),int(px+pw),int(py+ph)))
                c += 1
    return plots


def draw_base(d_img, d_mask):
    d_img.rectangle([0,0,IMG_W,IMG_H], fill=C_BACKGROUND)
    d_mask.rectangle([0,0,IMG_W,IMG_H], fill=M_BG)
    road = [MARGIN, MARGIN, IMG_W-MARGIN, IMG_H-MARGIN]
    d_img.rectangle(road, fill=C_ROAD)
    d_mask.rectangle(road, fill=M_ROAD)


def draw_inner_roads(d_img, d_mask, plots):
    if not plots: return
    xs = [p[0] for p in plots]+[p[2] for p in plots]
    ys = [p[1] for p in plots]+[p[3] for p in plots]
    d_img.rectangle([min(xs),min(ys),max(xs),max(ys)], fill=C_ROAD)
    d_mask.rectangle([min(xs),min(ys),max(xs),max(ys)], fill=M_ROAD)


def draw_plot(d_img, d_mask, rect):
    x0,y0,x1,y1 = rect
    d_img.rectangle([x0,y0,x1,y1], fill=C_PLOT)
    d_mask.rectangle([x0,y0,x1,y1], fill=M_PLOT)
    for off in range(BOUNDARY_W):
        d_img.rectangle([x0+off,y0+off,x1-off,y1-off], outline=C_BOUNDARY)
        d_mask.rectangle([x0+off,y0+off,x1-off,y1-off], outline=M_BOUNDARY)


def draw_road_centre_lines(d_img):
    dash, gap, cy, x = 14, 8, MARGIN+ROAD_W_MAIN//2, MARGIN
    while x < IMG_W-MARGIN:
        d_img.line([(x,cy),(min(x+dash,IMG_W-MARGIN),cy)], fill=C_ROAD_LINE, width=1)
        x += dash+gap


def augment(img, mask):
    for op in random.sample(['rot90','fliph','flipv','crop_pad'], k=random.randint(1,3)):
        if op == 'rot90':
            k = random.choice([1,2,3])
            img  = img.rotate(k*90, expand=False)
            mask = mask.rotate(k*90, expand=False)
        elif op == 'fliph':
            img, mask = img.transpose(Image.FLIP_LEFT_RIGHT), mask.transpose(Image.FLIP_LEFT_RIGHT)
        elif op == 'flipv':
            img, mask = img.transpose(Image.FLIP_TOP_BOTTOM), mask.transpose(Image.FLIP_TOP_BOTTOM)
        elif op == 'crop_pad':
            pad = random.randint(20,60)
            r   = (pad, pad, IMG_W-pad, IMG_H-pad)
            img  = img.crop(r).resize((IMG_W,IMG_H), Image.BILINEAR)
            mask = mask.crop(r).resize((IMG_W,IMG_H), Image.NEAREST)
    return img, mask


def make_preview(img, mask):
    mask_arr = np.array(mask)
    overlay  = Image.new("RGBA", img.size, (0,0,0,0))
    pix      = overlay.load()
    for cls, colour in PREVIEW.items():
        ys, xs = np.where(mask_arr == cls)
        for y, x in zip(ys, xs):
            pix[x,y] = colour
    return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


STRATEGIES = [
    lambda: ('uniform_grid',  layout_uniform_grid(cols=random.randint(3,6), rows=random.randint(3,6))),
    lambda: ('mixed_sizes',   layout_mixed_sizes()),
    lambda: ('dual_row_road', layout_dual_row_road()),
    lambda: ('irregular',     layout_irregular_cluster()),
]


def generate_one(idx, out_dir, apply_augment=False):
    name, plots = random.choice(STRATEGIES)()
    img, mask   = Image.new("RGB",(IMG_W,IMG_H)), Image.new("L",(IMG_W,IMG_H),0)
    d_img, d_mask = ImageDraw.Draw(img), ImageDraw.Draw(mask)
    draw_base(d_img, d_mask)
    draw_inner_roads(d_img, d_mask, plots)
    for plot in plots:
        draw_plot(d_img, d_mask, plot)
    draw_road_centre_lines(d_img)
    if apply_augment:
        img, mask = augment(img, mask)
    tag = f"layout_{idx:04d}"
    img.save(os.path.join(out_dir,"images",  f"{tag}.png"))
    mask.save(os.path.join(out_dir,"masks",   f"{tag}.png"))
    make_preview(img,mask).save(os.path.join(out_dir,"previews",f"{tag}.png"))
    return {"id":tag,"strategy":name,"n_plots":len(plots),"augmented":apply_augment,
            "plots":[{"x0":p[0],"y0":p[1],"x1":p[2],"y1":p[3]} for p in plots]}


def generate_dataset(n=200):
    out_dir = os.path.join(BASE_DIR, "data")   # always next to this script
    for sub in ("images","masks","previews"):
        os.makedirs(os.path.join(out_dir,sub), exist_ok=True)
    all_meta = []
    for i in range(n):
        all_meta.append(generate_one(i, out_dir, apply_augment=(i >= n*0.4)))
        if (i+1) % 20 == 0:
            print(f"  generated {i+1}/{n}")
    with open(os.path.join(out_dir,"metadata.json"),"w") as f:
        json.dump(all_meta, f, indent=2)
    print(f"\nDone. Data written to: {out_dir}")
    print("  images/    ← UPLOAD FILES FROM HERE to the CV endpoint")
    print("  masks/     ← ground truth for training")
    print("  previews/  ← visual check only — DO NOT upload to CV endpoint")


if __name__ == "__main__":
    print(f"Output directory: {os.path.join(BASE_DIR,'data')}\n")
    generate_dataset(n=200)