"""
EZtract Layout Generator
Generates synthetic plot layout images + ground truth segmentation masks.

Pixel class map (mask):
  0 = background / outside boundary
  1 = road / internal road network
  2 = plot (any available plot)
  3 = plot boundary line

Output per sample:
  data/images/layout_XXXX.png   → RGB image the model sees
  data/masks/layout_XXXX.png    → single-channel class mask
  data/previews/layout_XXXX.png → colour overlay for visual checking

Run:
  cd backend/ml
  python generate.py
"""

import random
import math
import json
import os
from PIL import Image, ImageDraw
import numpy as np

# ── reproducibility ──────────────────────────────────────────────────────────
SEED = 42
random.seed(SEED)
np.random.seed(SEED)

# ── canvas constants ─────────────────────────────────────────────────────────
IMG_W, IMG_H = 800, 800
MARGIN        = 40
ROAD_W_MAIN   = 18
ROAD_W_INNER  = 12
BOUNDARY_W    = 2

# ── colour palette (image layer) ─────────────────────────────────────────────
C_BACKGROUND = (245, 245, 240)
C_ROAD       = (200, 195, 185)
C_PLOT       = (255, 255, 255)
C_BOUNDARY   = (40,  40,  40)
C_ROAD_LINE  = (160, 155, 145)

# ── mask class values ────────────────────────────────────────────────────────
M_BG       = 0
M_ROAD     = 1
M_PLOT     = 2
M_BOUNDARY = 3

# ── preview overlay colours ──────────────────────────────────────────────────
PREVIEW = {
    M_BG:       (245, 245, 240,  80),
    M_ROAD:     (255, 180,  50, 160),
    M_PLOT:     ( 80, 180, 120, 160),
    M_BOUNDARY: ( 30,  30,  30, 200),
}


# ═══════════════════════════════════════════════════════════════════════════
#  LAYOUT STRATEGIES
# ═══════════════════════════════════════════════════════════════════════════

def _usable_rect():
    x0 = MARGIN + ROAD_W_MAIN
    y0 = MARGIN + ROAD_W_MAIN
    x1 = IMG_W - MARGIN - ROAD_W_MAIN
    y1 = IMG_H - MARGIN - ROAD_W_MAIN
    return x0, y0, x1, y1


def layout_uniform_grid(cols=4, rows=4):
    x0, y0, x1, y1 = _usable_rect()
    plots = []
    total_road_w = ROAD_W_INNER * (cols - 1)
    total_road_h = ROAD_W_INNER * (rows - 1)
    pw = (x1 - x0 - total_road_w) / cols
    ph = (y1 - y0 - total_road_h) / rows
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
    base_w = (x1 - x0 - total_road_w) / cols
    base_h = (y1 - y0 - total_road_h) / rows

    col_widths = [base_w * random.uniform(0.82, 1.18) for _ in range(cols)]
    scale = (x1 - x0 - total_road_w) / sum(col_widths)
    col_widths = [w * scale for w in col_widths]

    row_heights = [base_h * random.uniform(0.82, 1.18) for _ in range(rows)]
    scale = (y1 - y0 - total_road_h) / sum(row_heights)
    row_heights = [h * scale for h in row_heights]

    plots = []
    cy = y0
    for r in range(rows):
        cx = x0
        for c in range(cols):
            plots.append((int(cx), int(cy),
                          int(cx + col_widths[c]), int(cy + row_heights[r])))
            cx += col_widths[c] + ROAD_W_INNER
        cy += row_heights[r] + ROAD_W_INNER
    return plots


def layout_dual_row_road():
    x0, y0, x1, y1 = _usable_rect()
    mid_road_w = ROAD_W_INNER * 2
    half_h = (y1 - y0 - mid_road_w) // 2
    cols = random.randint(4, 7)
    total_road_w = ROAD_W_INNER * (cols - 1)
    pw = (x1 - x0 - total_road_w) / cols
    mid_y0 = y0 + half_h
    mid_y1 = mid_y0 + mid_road_w
    plots = []
    for c in range(cols):
        cx = x0 + c * (pw + ROAD_W_INNER)
        plots.append((int(cx), y0,    int(cx + pw), mid_y0))
        plots.append((int(cx), mid_y1, int(cx + pw), y1))
    return plots


def layout_irregular_cluster():
    x0, y0, x1, y1 = _usable_rect()
    cols, rows = 5, 5
    total_road_w = ROAD_W_INNER * (cols - 1)
    total_road_h = ROAD_W_INNER * (rows - 1)
    pw = (x1 - x0 - total_road_w) / cols
    ph = (y1 - y0 - total_road_h) / rows
    skip = set()
    plots = []
    for r in range(rows):
        c = 0
        while c < cols:
            if c + 1 < cols and random.random() < 0.2 and (r, c) not in skip:
                px = x0 + c * (pw + ROAD_W_INNER)
                py = y0 + r * (ph + ROAD_W_INNER)
                plots.append((int(px), int(py),
                              int(px + pw * 2 + ROAD_W_INNER), int(py + ph)))
                skip.add((r, c))
                skip.add((r, c + 1))
                c += 2
            else:
                if (r, c) not in skip:
                    px = x0 + c * (pw + ROAD_W_INNER)
                    py = y0 + r * (ph + ROAD_W_INNER)
                    plots.append((int(px), int(py),
                                  int(px + pw), int(py + ph)))
                c += 1
    return plots


# ═══════════════════════════════════════════════════════════════════════════
#  DRAWING HELPERS
# ═══════════════════════════════════════════════════════════════════════════

def draw_base(draw_img, draw_mask):
    draw_img.rectangle([0, 0, IMG_W, IMG_H], fill=C_BACKGROUND)
    draw_mask.rectangle([0, 0, IMG_W, IMG_H], fill=M_BG)
    road_rect = [MARGIN, MARGIN, IMG_W - MARGIN, IMG_H - MARGIN]
    draw_img.rectangle(road_rect, fill=C_ROAD)
    draw_mask.rectangle(road_rect, fill=M_ROAD)


def draw_inner_roads(draw_img, draw_mask, plots):
    if not plots:
        return
    xs = [p[0] for p in plots] + [p[2] for p in plots]
    ys = [p[1] for p in plots] + [p[3] for p in plots]
    bx0, by0, bx1, by1 = min(xs), min(ys), max(xs), max(ys)
    draw_img.rectangle([bx0, by0, bx1, by1], fill=C_ROAD)
    draw_mask.rectangle([bx0, by0, bx1, by1], fill=M_ROAD)


def draw_plot(draw_img, draw_mask, rect):
    x0, y0, x1, y1 = rect
    draw_img.rectangle([x0, y0, x1, y1], fill=C_PLOT)
    draw_mask.rectangle([x0, y0, x1, y1], fill=M_PLOT)
    for offset in range(BOUNDARY_W):
        draw_img.rectangle(
            [x0 + offset, y0 + offset, x1 - offset, y1 - offset],
            outline=C_BOUNDARY)
        draw_mask.rectangle(
            [x0 + offset, y0 + offset, x1 - offset, y1 - offset],
            outline=M_BOUNDARY)


def draw_road_centre_lines(draw_img):
    dash, gap = 14, 8
    cy = MARGIN + ROAD_W_MAIN // 2
    x = MARGIN
    while x < IMG_W - MARGIN:
        draw_img.line([(x, cy), (min(x + dash, IMG_W - MARGIN), cy)],
                      fill=C_ROAD_LINE, width=1)
        x += dash + gap


# ═══════════════════════════════════════════════════════════════════════════
#  AUGMENTATION
# ═══════════════════════════════════════════════════════════════════════════

def augment(img, mask):
    ops = random.sample(['rot90', 'fliph', 'flipv', 'crop_pad'],
                        k=random.randint(1, 3))
    for op in ops:
        if op == 'rot90':
            k = random.choice([1, 2, 3])
            img  = img.rotate(k * 90, expand=False)
            mask = mask.rotate(k * 90, expand=False)
        elif op == 'fliph':
            img  = img.transpose(Image.FLIP_LEFT_RIGHT)
            mask = mask.transpose(Image.FLIP_LEFT_RIGHT)
        elif op == 'flipv':
            img  = img.transpose(Image.FLIP_TOP_BOTTOM)
            mask = mask.transpose(Image.FLIP_TOP_BOTTOM)
        elif op == 'crop_pad':
            pad = random.randint(20, 60)
            region = (pad, pad, IMG_W - pad, IMG_H - pad)
            img  = img.crop(region).resize((IMG_W, IMG_H), Image.BILINEAR)
            mask = mask.crop(region).resize((IMG_W, IMG_H), Image.NEAREST)
    return img, mask


# ═══════════════════════════════════════════════════════════════════════════
#  PREVIEW BUILDER
# ═══════════════════════════════════════════════════════════════════════════

def make_preview(img, mask):
    mask_arr = np.array(mask)
    overlay  = Image.new("RGBA", img.size, (0, 0, 0, 0))
    pix      = overlay.load()
    for cls, colour in PREVIEW.items():
        ys, xs = np.where(mask_arr == cls)
        for y, x in zip(ys, xs):
            pix[x, y] = colour
    base = img.convert("RGBA")
    return Image.alpha_composite(base, overlay).convert("RGB")


# ═══════════════════════════════════════════════════════════════════════════
#  MAIN GENERATOR
# ═══════════════════════════════════════════════════════════════════════════

STRATEGIES = [
    lambda: ('uniform_grid',  layout_uniform_grid(
                                  cols=random.randint(3, 6),
                                  rows=random.randint(3, 6))),
    lambda: ('mixed_sizes',   layout_mixed_sizes()),
    lambda: ('dual_row_road', layout_dual_row_road()),
    lambda: ('irregular',     layout_irregular_cluster()),
]


def generate_one(idx, out_dir, apply_augment=False):
    name, plots = random.choice(STRATEGIES)()

    img  = Image.new("RGB", (IMG_W, IMG_H))
    mask = Image.new("L",   (IMG_W, IMG_H), 0)
    d_img  = ImageDraw.Draw(img)
    d_mask = ImageDraw.Draw(mask)

    draw_base(d_img, d_mask)
    draw_inner_roads(d_img, d_mask, plots)
    for plot in plots:
        draw_plot(d_img, d_mask, plot)
    draw_road_centre_lines(d_img)

    if apply_augment:
        img, mask = augment(img, mask)

    tag = f"layout_{idx:04d}"
    img.save(os.path.join(out_dir, "images",   f"{tag}.png"))
    mask.save(os.path.join(out_dir, "masks",    f"{tag}.png"))
    make_preview(img, mask).save(os.path.join(out_dir, "previews", f"{tag}.png"))

    meta = {
        "id":        tag,
        "strategy":  name,
        "n_plots":   len(plots),
        "augmented": apply_augment,
        "plots": [{"x0": p[0], "y0": p[1], "x1": p[2], "y1": p[3]}
                  for p in plots]
    }
    return meta


def generate_dataset(n=200, out_dir="data"):
    for sub in ("images", "masks", "previews"):
        os.makedirs(os.path.join(out_dir, sub), exist_ok=True)

    all_meta = []
    for i in range(n):
        do_aug = (i >= n * 0.4)        # last 60% get augmented
        meta   = generate_one(i, out_dir, apply_augment=do_aug)
        all_meta.append(meta)
        if (i + 1) % 20 == 0:
            print(f"  generated {i + 1}/{n}")

    with open(os.path.join(out_dir, "metadata.json"), "w") as f:
        json.dump(all_meta, f, indent=2)

    print(f"\nDone. {n} samples written to {out_dir}/")
    print("  images/   — RGB layout images (model input)")
    print("  masks/    — single-channel class masks (ground truth)")
    print("  previews/ — colour overlay for visual inspection")
    print("  metadata.json — plot coordinates per sample")


if __name__ == "__main__":
    generate_dataset(n=200)