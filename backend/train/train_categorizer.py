"""
Trains the shared TF-IDF + LogisticRegression transaction categorizer.

Run manually (not part of the request/response cycle):
    python train/train_categorizer.py

Produces backend/app/ml/models/category_model.pkl — commit this to git.

Data sources:
- DoDataThings/us-bank-transaction-categories-v2 (HuggingFace, MIT licensed, NOT gated —
  loads directly, no manual download needed)
- canadian_merchants.csv (this directory) — ~200 well-known Canadian merchants, added to
  cover a vocabulary gap the US-formatted HF dataset doesn't: TF-IDF only has signal for
  words it saw in training, and Canadian chains (Dollarama, A&W, Shoppers Drug Mart, etc.)
  are largely absent from it. Each row is repeated REPEAT_COUNT times — a single labeled
  example is too easily outweighed by thousands of unrelated HF rows sharing incidental
  vocabulary; repetition gives it real training weight.

"Transfer" is intentionally excluded from CATEGORY_MAP — it's detected by keyword heuristic
(app/ml/transfer_detector.py) before the ML model ever runs, never ML-predicted.

Known limitation, not fixed here: merchant names that are entirely special characters
(e.g. "A&W") tokenize to nothing under TF-IDF's default token pattern — no amount of
repetition fixes that. Left for category_overrides to catch per-user rather than changing
global tokenization behavior for one merchant.
"""
from pathlib import Path

import joblib
import pandas as pd
from datasets import load_dataset
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

DATASET_NAME = "DoDataThings/us-bank-transaction-categories-v2"
CANADIAN_MERCHANTS_CSV = Path(__file__).parent / "canadian_merchants.csv"
MODEL_PATH = Path(__file__).parent.parent / "app" / "ml" / "models" / "category_model.pkl"
SAMPLE_PER_CATEGORY = 12_500
REPEAT_COUNT = 8

CATEGORY_MAP = {
    "Restaurants": "Food",
    "Groceries": "Groceries",
    "Transportation": "Transport",
    "Shopping": "Shopping",
    "Personal Care": "Shopping",
    "Entertainment": "Entertainment",
    "Utilities": "Utilities",
    "Subscription": "Utilities",
    "Insurance": "Utilities",
    "Healthcare": "Health",
    "Income": "Income",
    "Mortgage": "Rent/Mortgage",
    "Rent": "Rent/Mortgage",
    "Education": "Education",
    "Travel": "Other",
    "Fees": "Other",
    # "Transfer" intentionally omitted — heuristic-only, see module docstring
}


def main() -> None:
    ds = load_dataset(DATASET_NAME)
    df = ds["train"].to_pandas()

    df["mapped_category"] = df["category"].map(CATEGORY_MAP) # type: ignore
    unmapped = df[df["mapped_category"].isna()]["category"].unique() # type: ignore
    print(f"Unmapped source categories (only 'Transfer' expected here): {list(unmapped)}")

    sampled = (
        df.dropna(subset=["mapped_category"]) # type: ignore
        .groupby("mapped_category", group_keys=False)
        .apply(lambda g: g.sample(min(len(g), SAMPLE_PER_CATEGORY), random_state=42))
    )

    merchants = pd.read_csv(CANADIAN_MERCHANTS_CSV)
    merchants = merchants.rename(columns={"category": "mapped_category"})
    merchants = pd.concat([merchants] * REPEAT_COUNT, ignore_index=True)

    train_data = pd.concat(
        [sampled[["description", "mapped_category"]], merchants], ignore_index=True
    )
    print("Training data category counts:")
    print(train_data["mapped_category"].value_counts())

    X_train, X_test, y_train, y_test = train_test_split(
        train_data["description"],
        train_data["mapped_category"],
        test_size=0.2,
        random_state=42,
        stratify=train_data["mapped_category"],
    )

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer()),
        ("clf", LogisticRegression(max_iter=1000)),
    ])
    pipeline.fit(X_train, y_train)

    print(classification_report(y_test, pipeline.predict(X_test)))

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    print(f"Saved model to {MODEL_PATH}")


if __name__ == "__main__":
    main()