# Detects unusual spending patterns by scoring user transactions with an isolation forest.
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import IsolationForest

from app.schemas.transactions import Category

MODEL_DIR = Path(__file__).parent / "models"
MIN_TRANSACTIONS = 20

# Transfer/Savings are excluded deliberately — they're not spending behavior,
# and including them risks either noisy false positives (large routine
# transfers) or widening the model's "normal" baseline enough to mask real
# spend anomalies. Known accepted limitation: an anomalous transfer (e.g.
# fraud) will never be scored, since the category is excluded entirely.
SCORABLE_CATEGORIES = [c.value for c in Category if c.value not in ("Transfer", "Savings")]


def _model_path(user_id: str) -> Path:
    """Return the persisted anomaly model path for a specific user."""
    return MODEL_DIR / f"anomaly_model_{user_id}.pkl"


def _build_feature_frame(rows: list[dict]) -> pd.DataFrame:
    """Convert transaction rows into a numeric feature matrix for the anomaly model."""
    df = pd.DataFrame(rows)
    # Fixed column set (reindexed to the full scorable category list) so the
    # feature matrix shape stays consistent across retrains, even if this
    # particular user hasn't used every category yet.
    dummies = pd.get_dummies(df["category"]).reindex(columns=SCORABLE_CATEGORIES, fill_value=0)
    return pd.concat([df[["amount"]].reset_index(drop=True), dummies.reset_index(drop=True)], axis=1)


def score_user_transactions(supabase, user_id: str) -> None:
    """
    Refits an Isolation Forest on all of a user's scorable (non-Transfer/
    Savings) transactions, then scores only the rows that don't have a score
    yet. Skips entirely if the user has fewer than MIN_TRANSACTIONS.
    Intended to run as a FastAPI BackgroundTask after /upload/confirm.
    """
    result = (
        supabase.table("transactions")
        .select("id,amount,category,anomaly_score")
        .eq("user_id", user_id)
        .in_("category", SCORABLE_CATEGORIES)
        .execute()
    )
    rows = result.data
    if len(rows) < MIN_TRANSACTIONS:
        return

    features = _build_feature_frame(rows)
    model = IsolationForest(contamination="auto", random_state=42)
    model.fit(features)

    scores = model.decision_function(features)
    predictions = model.predict(features)  # -1 = anomaly, 1 = normal

    updates = [
        {
            "id": row["id"],
            "is_anomaly": bool(pred == -1),
            "anomaly_score": float(score),
        }
        for row, pred, score in zip(rows, predictions, scores)
        if row["anomaly_score"] is None
    ]

    # NOTE: deliberately UPDATE, not upsert. Postgres upsert (INSERT ... ON
    # CONFLICT DO UPDATE) validates NOT NULL constraints against the
    # tentative insert row *before* checking for a conflict — so a
    # partial-column upsert payload fails on columns we didn't include
    # (user_id, description, etc.), even though the row already exists and
    # was only ever going to be updated. UPDATE has no such problem since it
    # only ever touches the columns given. Trade-off: one round trip per row
    # instead of a single batch call — acceptable here since this runs in a
    # background task, off the request path.
    for update in updates:
        supabase.table("transactions").update(
            {"is_anomaly": update["is_anomaly"], "anomaly_score": update["anomaly_score"]}
        ).eq("id", update["id"]).execute()

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, _model_path(user_id))