# app/ml/categorizer.py
from functools import lru_cache
from pathlib import Path

import joblib

MODEL_PATH = Path(__file__).parent / "models" / "category_model.pkl"


@lru_cache
def _get_model():
    return joblib.load(MODEL_PATH)


def predict_category(description: str) -> str:
    model = _get_model()
    return model.predict([description])[0]