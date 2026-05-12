"""
EZtract ML — predict.py
Thin wrapper loaded once at FastAPI startup.
Exposes run_prediction(pil_image) for use in main.py.
"""

import os
import sys

# Make sure train_unet is importable when called from backend/app/main.py
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "ml"))

from train_unet import load_model, predict as _predict

# Load model once when FastAPI starts — not on every request
_model = load_model(
    os.path.join(os.path.dirname(__file__), "checkpoints", "best_model.pth")
)


def run_prediction(pil_image):
    """
    Args:
        pil_image — PIL Image (RGB)
    Returns:
        list of polygon point arrays, e.g. [[x1,y1],[x2,y2],...]
        one entry per detected plot — ready to pass to PlotCanvas
    """
    _, polygons = _predict(_model, pil_image)
    return polygons