# Predicts transaction categories from merchant descriptions using a cached model.
from functools import lru_cache
from pathlib import Path

import joblib

MODEL_PATH = Path(__file__).parent / "models" / "category_model.pkl"


@lru_cache
def _get_model():
    """Load the trained categorizer model once and reuse it across requests."""
    return joblib.load(MODEL_PATH)


def predict_category(description: str) -> str:
    """Return the predicted category for a transaction description."""
    model = _get_model()
    return model.predict([description])[0]