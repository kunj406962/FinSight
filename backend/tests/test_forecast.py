"""Tests for app/ml/forecaster.py and app/routers/forecast.py."""

from datetime import date, timedelta
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.auth.dependencies import get_current_user
from app.main import app
from app.ml import forecaster
from app.routers import forecast as forecast_router


# ---------- Hand-rolled fakes (same pattern as test_transactions.py) ----------

class FakeQuery:
    """Chainable fake supporting .select().eq()...execute() reads."""

    def __init__(self, rows):
        self._rows = list(rows)

    def select(self, *_a, **_k):
        return self

    def eq(self, field, value):
        self._rows = [r for r in self._rows if str(r.get(field)) == str(value)]
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


def _historical_months(n):
    """n consecutive month-starts strictly before the current calendar month."""
    cursor = date.today().replace(day=1)
    months = []
    for _ in range(n):
        cursor = (cursor - timedelta(days=1)).replace(day=1)
        months.append(cursor)
    return list(reversed(months))


def _rows_for_category(category, months, amount, user_id="user-1"):
    return [
        {"user_id": user_id, "category": category, "date": m.isoformat(), "amount": amount}
        for m in months
    ]


# ---------- forecaster._build_monthly_series ----------

def test_build_monthly_series_empty_when_no_transactions():
    supabase = FakeSupabase({"transactions": []})
    result = forecaster._build_monthly_series(supabase, "user-1", "Groceries")
    assert result.empty
    assert list(result.columns) == ["ds", "y"]


def test_build_monthly_series_excludes_current_month():
    current_month = date.today().replace(day=1)
    months = _historical_months(2) + [current_month]
    rows = _rows_for_category("Groceries", months, -100.0)
    supabase = FakeSupabase({"transactions": rows})

    result = forecaster._build_monthly_series(supabase, "user-1", "Groceries")

    assert len(result) == 2
    assert current_month not in result["ds"].dt.date.tolist()


def test_build_monthly_series_zero_fills_gap_months():
    rows = [
        {"user_id": "user-1", "category": "Groceries", "date": "2025-01-15", "amount": -50.0},
        {"user_id": "user-1", "category": "Groceries", "date": "2025-03-10", "amount": -75.0},
    ]
    supabase = FakeSupabase({"transactions": rows})

    result = forecaster._build_monthly_series(supabase, "user-1", "Groceries")

    assert len(result) == 3  # Jan, Feb (gap), Mar
    feb = result[result["ds"] == __import__("pandas").Timestamp("2025-02-01")]
    assert feb["y"].iloc[0] == 0.0


# ---------- forecaster.forecast_category ----------

def test_forecast_category_insufficient_data_below_min_months():
    rows = _rows_for_category("Groceries", _historical_months(1), -50.0)
    supabase = FakeSupabase({"transactions": rows})

    result = forecaster.forecast_category(supabase, "user-1", "Groceries")

    assert result["insufficient_data"] is True


def test_forecast_category_no_regressor_returns_prediction():
    """Real Prophet fit, no-regressor category (Groceries)."""
    rows = _rows_for_category("Groceries", _historical_months(6), -400.0)
    supabase = FakeSupabase({"transactions": rows})

    result = forecaster.forecast_category(supabase, "user-1", "Groceries")

    assert result["insufficient_data"] is False
    assert result["lower_bound"] <= result["predicted_amount"] <= result["upper_bound"]


def test_forecast_category_regressor_uses_income():
    """Real Prophet fits, regressor category (Savings) with matching Income history."""
    months = _historical_months(6)
    rows = _rows_for_category("Income", months, 2000.0) + _rows_for_category("Savings", months, -300.0)
    supabase = FakeSupabase({"transactions": rows})

    result = forecaster.forecast_category(supabase, "user-1", "Savings")

    assert result["insufficient_data"] is False
    assert result["lower_bound"] <= result["predicted_amount"] <= result["upper_bound"]


def test_forecast_category_regressor_falls_back_without_income():
    months = _historical_months(6)
    rows = _rows_for_category("Savings", months, -300.0) + _rows_for_category("Income", months[-1:], 2000.0)
    supabase = FakeSupabase({"transactions": rows})

    with patch.object(forecaster, "_fit_with_regressor") as mock_regressor:
        result = forecaster.forecast_category(supabase, "user-1", "Savings")

    mock_regressor.assert_not_called()
    assert result["insufficient_data"] is False


def test_forecast_category_regressor_falls_back_when_no_overlap():
    savings_months = _historical_months(6)
    income_months = [d.replace(year=d.year - 5) for d in savings_months]
    rows = _rows_for_category("Savings", savings_months, -300.0) + _rows_for_category("Income", income_months, 2000.0)
    supabase = FakeSupabase({"transactions": rows})

    with patch.object(forecaster, "_fit_with_regressor") as mock_regressor:
        result = forecaster.forecast_category(supabase, "user-1", "Savings")

    mock_regressor.assert_not_called()
    assert result["insufficient_data"] is False


# ---------- forecaster._current_month_start / get_or_compute_forecast (moved here from router) ----------

def test_current_month_start_returns_first_of_month():
    assert forecaster._current_month_start().day == 1


def test_get_or_compute_forecast_returns_cached_without_recomputing():
    month_start = date.today().replace(day=1)
    cached_row = {
        "user_id": "user-1",
        "category": "Groceries",
        "target_month": month_start.isoformat(),
        "insufficient_data": False,
        "predicted_amount": 450.0,
        "lower_bound": 400.0,
        "upper_bound": 500.0,
    }
    fake_supabase = FakeSupabase({"forecast_cache": [cached_row]})

    with patch.object(forecaster, "forecast_category") as mock_forecast:
        result = forecaster.get_or_compute_forecast(fake_supabase, "user-1", "Groceries")

    mock_forecast.assert_not_called()
    assert result["predicted_amount"] == 450.0


def test_get_or_compute_forecast_computes_and_stores_on_cache_miss():
    fake_supabase = FakeSupabase({"forecast_cache": []})
    fake_result = {
        "insufficient_data": False,
        "target_month": date.today().replace(day=1),
        "predicted_amount": 300.0,
        "lower_bound": 250.0,
        "upper_bound": 350.0,
    }

    with patch.object(forecaster, "forecast_category", return_value=fake_result) as mock_forecast:
        result = forecaster.get_or_compute_forecast(fake_supabase, "user-1", "Groceries")

    mock_forecast.assert_called_once()
    assert fake_supabase.table("forecast_cache").upserted
    assert result["predicted_amount"] == 300.0


# ---------- app/routers/forecast.py ----------

@pytest.fixture(autouse=True)
def _override_auth():
    app.dependency_overrides[get_current_user] = lambda: FakeUser("user-1")
    yield
    app.dependency_overrides.pop(get_current_user, None)


def test_get_forecast_unsupported_category_returns_400():
    client = TestClient(app)
    with patch.object(forecast_router, "get_or_compute_forecast") as mock_get_or_compute:
        response = client.get("/forecast", params={"category": "Health"})

    assert response.status_code == 400
    mock_get_or_compute.assert_not_called()


def test_get_forecast_returns_shaped_response():
    fake_result = {
        "insufficient_data": False,
        "target_month": date.today().replace(day=1),
        "predicted_amount": 450.0,
        "lower_bound": 400.0,
        "upper_bound": 500.0,
    }
    client = TestClient(app)

    with patch.object(forecast_router, "get_supabase", return_value=FakeSupabase({})), \
         patch.object(forecast_router, "get_or_compute_forecast", return_value=fake_result) as mock_get_or_compute:
        response = client.get("/forecast", params={"category": "Groceries"})

    assert response.status_code == 200
    body = response.json()
    assert body["insufficient_data"] is False
    assert body["forecast"][0]["predicted_amount"] == 450.0
    mock_get_or_compute.assert_called_once()


def test_get_forecast_insufficient_data_response_shape():
    fake_result = {
        "insufficient_data": True,
        "target_month": None,
        "predicted_amount": None,
        "lower_bound": None,
        "upper_bound": None,
    }
    client = TestClient(app)

    with patch.object(forecast_router, "get_supabase", return_value=FakeSupabase({})), \
         patch.object(forecast_router, "get_or_compute_forecast", return_value=fake_result):
        response = client.get("/forecast", params={"category": "Groceries"})

    body = response.json()
    assert body["insufficient_data"] is True
    assert body["forecast"] == []