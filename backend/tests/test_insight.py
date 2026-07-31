"""Tests for app/routers/insights.py."""

from datetime import date, timedelta
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.auth.dependencies import get_current_user
from app.main import app
from app.routers import insights as insights_router


# ---------- Hand-rolled fakes (same pattern as test_forecast.py) ----------

class FakeQuery:
    """Chainable fake supporting .select().eq().gte().lte().execute() reads."""

    def __init__(self, rows):
        self._rows = list(rows)

    def select(self, *_a, **_k):
        return self

    def eq(self, field, value):
        self._rows = [r for r in self._rows if str(r.get(field)) == str(value)]
        return self

    def gte(self, field, value):
        self._rows = [r for r in self._rows if str(r.get(field)) >= str(value)]
        return self

    def lte(self, field, value):
        self._rows = [r for r in self._rows if str(r.get(field)) <= str(value)]
        return self

    def execute(self):
        return type("Result", (), {"data": self._rows})()


class FakeUpsertQuery:
    def __init__(self, table, payload):
        self._table = table
        self._payload = payload

    def execute(self):
        self._table.upserted.append(self._payload)
        data = self._payload if isinstance(self._payload, list) else [self._payload]
        return type("Result", (), {"data": data})()


class FakeTable:
    def __init__(self, rows=None):
        self.rows = rows or []
        self.upserted = []

    def select(self, *_a, **_k):
        return FakeQuery(self.rows)

    def upsert(self, payload, on_conflict=None):
        return FakeUpsertQuery(self, payload)


class FakeSupabase:
    def __init__(self, tables: dict):
        self._tables = {name: FakeTable(rows) for name, rows in tables.items()}

    def table(self, name):
        return self._tables[name]


class FakeUser:
    def __init__(self, user_id):
        self.id = user_id
        self.email = "test@example.com"


# ---------- _month_bounds / _week_start / _period_context (pure, explicit date arg) ----------

def test_month_bounds_splits_correctly_mid_month():
    today = date(2026, 7, 15)
    last_month_start, last_month_end, current_month_start = insights_router._month_bounds(today)
    assert last_month_start == date(2026, 6, 1)
    assert last_month_end == date(2026, 6, 30)
    assert current_month_start == date(2026, 7, 1)


def test_month_bounds_handles_january():
    today = date(2026, 1, 10)
    last_month_start, last_month_end, current_month_start = insights_router._month_bounds(today)
    assert last_month_start == date(2025, 12, 1)
    assert last_month_end == date(2025, 12, 31)
    assert current_month_start == date(2026, 1, 1)


def test_week_start_returns_monday():
    # 2026-07-31 is a Friday
    friday = date(2026, 7, 31)
    monday = insights_router._week_start(friday)
    assert monday.weekday() == 0
    assert monday == date(2026, 7, 27)


def test_period_context_fields():
    today = date(2026, 7, 15)
    ctx = insights_router._period_context(today)
    assert ctx["day_of_month"] == 15
    assert ctx["days_in_month"] == 31
    assert ctx["current_month_name"] == "July"
    assert ctx["last_month_name"] == "June"
    assert ctx["days_elapsed_pct"] == round(15 / 31, 4)


# ---------- _split_and_aggregate ----------

def test_split_and_aggregate_buckets_by_month_and_sums_abs():
    current_month_start = date(2026, 7, 1)
    rows = [
        {"category": "Groceries", "amount": -100.0, "date": "2026-06-10", "is_anomaly": False},
        {"category": "Groceries", "amount": -50.0, "date": "2026-06-20", "is_anomaly": False},
        {"category": "Groceries", "amount": -30.0, "date": "2026-07-05", "is_anomaly": False},
        {"category": "Income", "amount": 2000.0, "date": "2026-07-01", "is_anomaly": False},
    ]
    last_month_totals, current_month_totals = insights_router._split_and_aggregate(rows, current_month_start)

    assert last_month_totals["Groceries"] == 150.0
    assert current_month_totals["Groceries"] == 30.0
    assert current_month_totals["Income"] == 2000.0


# ---------- _forecast_or_none ----------

def test_forecast_or_none_skips_unsupported_category_without_calling_forecast():
    with patch.object(insights_router, "get_or_compute_forecast") as mock_forecast:
        result = insights_router._forecast_or_none(FakeSupabase({}), "user-1", "Health")

    assert result is None
    mock_forecast.assert_not_called()


def test_forecast_or_none_returns_none_when_insufficient_data():
    with patch.object(
        insights_router, "get_or_compute_forecast",
        return_value={"insufficient_data": True, "predicted_amount": None},
    ):
        result = insights_router._forecast_or_none(FakeSupabase({}), "user-1", "Groceries")

    assert result is None


def test_forecast_or_none_returns_predicted_amount():
    with patch.object(
        insights_router, "get_or_compute_forecast",
        return_value={"insufficient_data": False, "predicted_amount": 275.5},
    ):
        result = insights_router._forecast_or_none(FakeSupabase({}), "user-1", "Groceries")

    assert result == 275.5


# ---------- _build_category_entry ----------

def test_build_category_entry_tags_rent_as_fixed():
    entry = insights_router._build_category_entry("Rent/Mortgage", 1500.0, 1500.0, 1500.0, 15, 31)
    assert entry["type"] == "fixed"


def test_build_category_entry_tags_others_as_discretionary():
    entry = insights_router._build_category_entry("Shopping", 200.0, 50.0, 220.0, 15, 31)
    assert entry["type"] == "discretionary"


def test_build_category_entry_computes_pacing_math():
    # last month $500, forecast $600 -> +20%; day 10 of 30 -> expected_to_date $200;
    # actual so far $150 -> pace -25%
    entry = insights_router._build_category_entry("Savings", 500.0, 150.0, 600.0, 10, 30)
    assert entry["forecast_vs_last_month_pct"] == pytest.approx(0.2, abs=1e-4)
    assert entry["expected_to_date"] == pytest.approx(200.0)
    assert entry["pace_vs_expected_pct"] == pytest.approx(-0.25, abs=1e-4)


def test_build_category_entry_handles_none_forecast():
    entry = insights_router._build_category_entry("Health", 100.0, 20.0, None, 10, 30)
    assert entry["forecast_amount"] is None
    assert entry["forecast_vs_last_month_pct"] is None
    assert entry["expected_to_date"] is None
    assert entry["pace_vs_expected_pct"] is None


def test_build_category_entry_handles_zero_last_month():
    # avoid div-by-zero when last month had no spend in this category
    entry = insights_router._build_category_entry("Education", 0.0, 0.0, 300.0, 10, 30)
    assert entry["forecast_vs_last_month_pct"] is None


# ---------- _build_summary ----------

def test_build_summary_pluralizes_anomaly_correctly():
    top_categories = [{"type": "discretionary", "current_month_amount": 100.0}]
    singular = insights_router._build_summary(top_categories, 1, 500.0)
    plural = insights_router._build_summary(top_categories, 2, 500.0)
    assert "1 anomaly" in singular
    assert "2 anomalies" in plural


def test_build_summary_excludes_fixed_costs_from_discretionary_total():
    top_categories = [
        {"type": "discretionary", "current_month_amount": 100.0},
        {"type": "fixed", "current_month_amount": 1500.0},
    ]
    summary = insights_router._build_summary(top_categories, 0, 0.0)
    assert "$100.00" in summary
    assert "$1,500.00" not in summary


# ---------- build_insights (integration, forecast + Gemini mocked) ----------

def test_build_insights_aggregates_and_sorts_and_calls_gemini_once():
    today = date.today()
    current_month_start = today.replace(day=1)
    last_month_date = (current_month_start - timedelta(days=1)).replace(day=10).isoformat()
    current_month_date = current_month_start.replace(day=min(today.day, 28)).isoformat()

    rows = [
        {"user_id": "user-1", "category": "Shopping", "amount": -50.0, "date": last_month_date, "is_anomaly": False},
        {"user_id": "user-1", "category": "Shopping", "amount": -200.0, "date": current_month_date, "is_anomaly": True},
        {"user_id": "user-1", "category": "Groceries", "amount": -30.0, "date": current_month_date, "is_anomaly": False},
        {"user_id": "user-1", "category": "Savings", "amount": -100.0, "date": last_month_date, "is_anomaly": False},
        {"user_id": "user-1", "category": "Savings", "amount": -60.0, "date": current_month_date, "is_anomaly": False},
    ]
    supabase = FakeSupabase({"transactions": rows})

    with patch.object(insights_router, "get_or_compute_forecast", return_value={"insufficient_data": True, "predicted_amount": None}) as mock_forecast, \
        patch.object(insights_router, "generate_narration", return_value="You're doing fine.") as mock_narration:
        result = insights_router.build_insights(supabase, "user-1")


    # Shopping ($200) should rank above Groceries ($30) this month
    assert result["top_categories"][0]["category"] == "Shopping"
    assert result["anomaly_count"] == 1
    assert result["total_saved"] == 160.0  # 100 (last month) + 60 (current month)
    assert result["gemini_narration"] == "You're doing fine."
    mock_narration.assert_called_once()

    # Health and Education are unsupported -> never forecast
    forecasted_categories = {c.args[2] for c in mock_forecast.call_args_list}
    assert "Health" not in forecasted_categories
    assert "Education" not in forecasted_categories
    # 8 forecastable spend categories + Income + Savings = 10 calls
    assert mock_forecast.call_count == 10


def test_build_insights_summary_is_deterministic_not_from_gemini():
    supabase = FakeSupabase({"transactions": []})

    with patch.object(insights_router, "get_or_compute_forecast", return_value={"insufficient_data": True, "predicted_amount": None}), \
         patch.object(insights_router, "generate_narration", return_value="anything"):
        result = insights_router.build_insights(supabase, "user-1")

    assert "anomal" in result["summary"]
    assert result["summary"] != result["gemini_narration"]


# ---------- app/routers/insights.py ----------

@pytest.fixture(autouse=True)
def _override_auth():
    app.dependency_overrides[get_current_user] = lambda: FakeUser("user-1")
    yield
    app.dependency_overrides.pop(get_current_user, None)


def test_get_insights_returns_cached_without_recomputing():
    week_start = insights_router._week_start(date.today())
    cached_response = {
        "summary": "cached summary",
        "anomaly_count": 0,
        "top_categories": [],
        "total_saved": 0.0,
        "gemini_narration": "cached narration",
    }
    cached_row = {"user_id": "user-1", "week_start": week_start.isoformat(), "response": cached_response}
    fake_supabase = FakeSupabase({"insights_cache": [cached_row]})
    client = TestClient(app)

    with patch.object(insights_router, "get_supabase", return_value=fake_supabase), \
         patch.object(insights_router, "build_insights") as mock_build:
        response = client.get("/insights")

    assert response.status_code == 200
    assert response.json()["summary"] == "cached summary"
    mock_build.assert_not_called()


def test_get_insights_cache_miss_computes_and_stores():
    fake_supabase = FakeSupabase({"insights_cache": []})
    fake_result = {
        "summary": "fresh summary",
        "anomaly_count": 2,
        "top_categories": [],
        "total_saved": 300.0,
        "gemini_narration": "fresh narration",
    }
    client = TestClient(app)

    with patch.object(insights_router, "get_supabase", return_value=fake_supabase), \
         patch.object(insights_router, "build_insights", return_value=fake_result) as mock_build:
        response = client.get("/insights")

    assert response.status_code == 200
    assert response.json()["summary"] == "fresh summary"
    mock_build.assert_called_once()
    assert fake_supabase.table("insights_cache").upserted