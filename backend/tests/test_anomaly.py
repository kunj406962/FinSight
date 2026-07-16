import uuid
from unittest.mock import patch

from app.ml import anomaly
from app.ml.anomaly import score_user_transactions


# ---------------------------------------------------------------------------
# Fake Supabase client tailored to anomaly.py's query shape:
#   .table("transactions").select(...).eq(...).in_(...).execute()
#   .table("transactions").update({...}).eq("id", value).execute()
# Each .table() call returns a fresh instance, so select and update chains
# never interfere with each other within one FakeSupabase.
# ---------------------------------------------------------------------------


class FakeResult:
    def __init__(self, data):
        self.data = data


class FakeTransactionsTable:
    def __init__(self, data, update_calls):
        self._data = data
        self._update_calls = update_calls
        self._pending_update = None
        self._pending_update_id = None

    def select(self, *args, **kwargs):
        return self

    def in_(self, *args, **kwargs):
        return self

    def eq(self, column, value):
        if self._pending_update is not None:
            self._pending_update_id = value
        return self

    def update(self, payload):
        self._pending_update = payload
        return self

    def execute(self):
        if self._pending_update is not None:
            self._update_calls.append({"id": self._pending_update_id, **self._pending_update})
            return FakeResult([])
        return FakeResult(self._data)


class FakeSupabase:
    def __init__(self, data):
        self._data = data
        self.update_calls = []

    def table(self, name):
        return FakeTransactionsTable(self._data, self.update_calls)


def _row(amount, category="Food", anomaly_score=None):
    return {
        "id": str(uuid.uuid4()),
        "amount": amount,
        "category": category,
        "anomaly_score": anomaly_score,
    }


# ---------------------------------------------------------------------------
# Threshold
# ---------------------------------------------------------------------------


def test_skips_scoring_below_minimum_transactions():
    rows = [_row(-10.0) for _ in range(anomaly.MIN_TRANSACTIONS - 1)]
    supabase = FakeSupabase(rows)

    with patch("app.ml.anomaly.IsolationForest") as mock_forest_cls:
        score_user_transactions(supabase, "user-1")

    mock_forest_cls.assert_not_called()
    assert supabase.update_calls == []


# ---------------------------------------------------------------------------
# Transfer/Savings exclusion — verified at the constant level, since the
# actual filtering happens in the Supabase query (.in_(SCORABLE_CATEGORIES)),
# which a fake client can't meaningfully verify beyond "was called with this".
# ---------------------------------------------------------------------------


def test_scorable_categories_excludes_transfer_and_savings():
    assert "Transfer" not in anomaly.SCORABLE_CATEGORIES
    assert "Savings" not in anomaly.SCORABLE_CATEGORIES


# ---------------------------------------------------------------------------
# Only rows without an existing score get updated
# ---------------------------------------------------------------------------


def test_only_updates_rows_without_existing_score():
    unscored = [_row(-10.0) for _ in range(anomaly.MIN_TRANSACTIONS)]
    already_scored = _row(-10.0, anomaly_score=0.05)
    rows = unscored + [already_scored]
    supabase = FakeSupabase(rows)

    with patch("app.ml.anomaly.joblib.dump"):
        score_user_transactions(supabase, "user-1")

    updated_ids = {call["id"] for call in supabase.update_calls}
    assert len(supabase.update_calls) == len(unscored)
    assert already_scored["id"] not in updated_ids


# ---------------------------------------------------------------------------
# Real IsolationForest behavior — deterministic via random_state, and the
# outlier (-5000 vs a cluster of -30s) is extreme enough to reliably isolate.
# ---------------------------------------------------------------------------


def test_flags_extreme_outlier_and_leaves_normal_rows_unflagged():
    normal_rows = [_row(-30.0) for _ in range(anomaly.MIN_TRANSACTIONS)]
    outlier_row = _row(-5000.0)
    rows = normal_rows + [outlier_row]
    supabase = FakeSupabase(rows)

    with patch("app.ml.anomaly.joblib.dump"):
        score_user_transactions(supabase, "user-1")

    updates_by_id = {call["id"]: call for call in supabase.update_calls}
    assert updates_by_id[outlier_row["id"]]["is_anomaly"] is True
    for row in normal_rows:
        assert updates_by_id[row["id"]]["is_anomaly"] is False


# ---------------------------------------------------------------------------
# Model persistence
# ---------------------------------------------------------------------------


def test_saves_model_to_disk_with_user_scoped_filename():
    rows = [_row(-10.0) for _ in range(anomaly.MIN_TRANSACTIONS)]
    supabase = FakeSupabase(rows)

    with patch("app.ml.anomaly.joblib.dump") as mock_dump:
        score_user_transactions(supabase, "user-42")

    mock_dump.assert_called_once()
    saved_path = mock_dump.call_args[0][1]
    assert saved_path.name == "anomaly_model_user-42.pkl"