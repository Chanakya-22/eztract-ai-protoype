"""
EZtract ML — predict.py
Loaded once at FastAPI startup. Exposes run_prediction(pil_image).
"""

import os, sys

# Always resolve relative to this file — safe regardless of CWD
ML_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ML_DIR)

from train_unet import load_model, predict as _predict

_model = load_model(os.path.join(ML_DIR, "checkpoints", "best_model.pth"))


def run_prediction(pil_image):
    """
    Args:
        pil_image — PIL Image RGB
                    IMPORTANT: upload images from data/images/ NOT data/previews/
    Returns:
        list of [[x,y],...] polygon arrays — one per detected plot
    """
    _, polygons = _predict(_model, pil_image)
    return polygons