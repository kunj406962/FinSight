import uuid
from datetime import date
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.routers import upload
from app.services.parsers.base_parser import ParsedTransaction


# ---------------------------------------------------------------------------
# Fake Supabase client
#
# Real supabase-py uses a fluent query builder: table().select().eq().execute()
# etc. MagicMock can fake this, but doesn't let different calls to the same
# table return different data (e.g. _dedupe_new_transactions hits
# "upload_batches" then "transactions" with different expected results).
# This fake is table-name-keyed instead, and records inserts/upserts so tests
# can assert on what was written without a real DB.
# ---------------------------------------------------------------------------


class FakeResult:
    def __init__(self, data):
        self.data = data


class FakeTable:
    def __init__(self, name, data, recorder):
        self.name = name
        self._data = data
        self._recorder = recorder
        self._pending_insert = None

    def select(self, *args, **kwargs):
        return self

    def eq(self, *args, **kwargs):
        return self

    def in_(self, *args, **kwargs):
        return self

    def insert(self, payload):
        self._recorder.inserted.setdefault(self.name, []).append(payload)
        self._pending_insert = payload
        return self

    def upsert(self, payload, on_conflict=None):
        self._recorder.upserted.setdefault(self.name, []).append(payload)
        self._pending_insert = payload
        return self

    def execute(self):
        if self._pending_insert is not None:
            rows = (
                self._pending_insert
                if isinstance(self._pending_insert, list)
                else [self._pending_insert]
            )
            # simulate DB-assigned ids for insert/upsert responses
            returned = [{**row, "id": str(uuid.uuid4())} for row in rows]
            return FakeResult(returned)
        return FakeResult(self._data)


class FakeSupabase:
    def __init__(self, table_data=None):
        self.table_data = table_data or {}
        self.inserted = {}
        self.upserted = {}

    def table(self, name):
        return FakeTable(name, self.table_data.get(name, []), self)


# ---------------------------------------------------------------------------
# _validate_account
# ---------------------------------------------------------------------------


def test_validate_account_returns_account_when_found():
    fake_account = {"id": "acc-1", "user_id": "user-1", "account_type": "chequing"}
    supabase = FakeSupabase(table_data={"accounts": [fake_account]})

    result = upload._validate_account(supabase, "acc-1", "user-1")

    assert result == fake_account


def test_validate_account_raises_404_when_not_found():
    supabase = FakeSupabase(table_data={"accounts": []})

    with pytest.raises(HTTPException) as exc_info:
        upload._validate_account(supabase, "acc-missing", "user-1")

    assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# _dedupe_new_transactions
# ---------------------------------------------------------------------------


def test_dedupe_filters_out_existing_transactions():
    supabase = FakeSupabase(
        table_data={
            "upload_batches": [{"id": "batch-1"}],
            "transactions": [
                {"date": "2026-01-01", "description": "TIM HORTONS", "amount": -4.5}
            ],
        }
    )
    parsed = [
        ParsedTransaction(txn_date=date(2026, 1, 1), description="TIM HORTONS", amount=-4.5),
        ParsedTransaction(txn_date=date(2026, 1, 2), description="SOBEYS", amount=-60.0),
    ]

    result = upload._dedupe_new_transactions(supabase, "acc-1", parsed)

    assert len(result) == 1
    assert result[0].description == "SOBEYS"


def test_dedupe_returns_all_when_no_existing_batches():
    supabase = FakeSupabase(table_data={"upload_batches": [], "transactions": []})
    parsed = [
        ParsedTransaction(txn_date=date(2026, 1, 1), description="SOBEYS", amount=-60.0)
    ]

    result = upload._dedupe_new_transactions(supabase, "acc-1", parsed)

    assert result == parsed


# ---------------------------------------------------------------------------
# _load_overrides
# ---------------------------------------------------------------------------


def test_load_overrides_maps_description_to_category():
    supabase = FakeSupabase(
        table_data={
            "category_overrides": [
                {"description": "A&W", "category": "Food"},
                {"description": "ONLINE TRANSFER TO SAVINGS", "category": "Savings"},
            ]
        }
    )

    result = upload._load_overrides(supabase, "user-1")

    assert result == {"A&W": "Food", "ONLINE TRANSFER TO SAVINGS": "Savings"}


def test_load_overrides_empty_when_none_exist():
    supabase = FakeSupabase(table_data={"category_overrides": []})

    result = upload._load_overrides(supabase, "user-1")

    assert result == {}


# ---------------------------------------------------------------------------
# _classify — order matters: is_savings -> is_transfer -> override -> ML
# ---------------------------------------------------------------------------


def test_classify_savings_keyword_wins_first():
    with patch("app.routers.upload.predict_category") as mock_predict:
        result = upload._classify({}, "TO FIND & SAVE")

    assert result == "Savings"
    mock_predict.assert_not_called()


def test_classify_transfer_keyword_checked_before_override():
    overrides = {"E-TRANSFER SENT": "Shopping"}  # deliberately wrong, to prove order
    with patch("app.routers.upload.predict_category") as mock_predict:
        result = upload._classify(overrides, "E-TRANSFER SENT")

    assert result == "Transfer"
    mock_predict.assert_not_called()


def test_classify_uses_override_when_no_keyword_match():
    overrides = {"A&W": "Food"}
    with patch("app.routers.upload.predict_category") as mock_predict:
        result = upload._classify(overrides, "a&w  ")  # normalization: strip + upper

    assert result == "Food"
    mock_predict.assert_not_called()


def test_classify_falls_back_to_ml_when_no_match():
    with patch("app.routers.upload.predict_category", return_value="Entertainment") as mock_predict:
        result = upload._classify({}, "SOME UNKNOWN MERCHANT")

    assert result == "Entertainment"
    mock_predict.assert_called_once_with("SOME UNKNOWN MERCHANT")


# ---------------------------------------------------------------------------
# Endpoint-level: /upload/confirm
#
# Covers behavior that only exists at the endpoint layer: batch row creation
# and the conditional category_overrides upsert (only rows where
# final_category != predicted_category).
# ---------------------------------------------------------------------------


@pytest.fixture
def client():
    from app.main import app

    return TestClient(app)


@pytest.fixture(autouse=True)
def override_current_user():
    from app.main import app
    from app.auth.dependencies import get_current_user

    class FakeUser:
        id = "user-1"
        email = "test@example.com"

    app.dependency_overrides[get_current_user] = lambda: FakeUser()
    yield
    app.dependency_overrides.clear()


def test_confirm_upserts_override_only_for_changed_category(client):
    fake_account = {"id": "acc-1", "user_id": "user-1", "account_type": "chequing"}
    fake_supabase = FakeSupabase(table_data={"accounts": [fake_account]})

    payload = {
        "account_id": "11111111-1111-1111-1111-111111111111",
        "filename": "export.csv",
        "bank_detected": "rbc",
        "transactions": [
            {
                "date": "2026-01-01",
                "description": "SOBEYS #1234",
                "amount": -60.0,
                "predicted_category": "Entertainment",
                "final_category": "Groceries",
            },
            {
                "date": "2026-01-02",
                "description": "TIM HORTONS",
                "amount": -4.5,
                "predicted_category": "Food",
                "final_category": "Food",
            },
        ],
    }

    with patch("app.routers.upload.get_supabase", return_value=fake_supabase):
        response = client.post("/upload/confirm", json=payload)

    assert response.status_code == 201
    assert len(fake_supabase.inserted["transactions"][0]) == 2

    override_rows = fake_supabase.upserted["category_overrides"][0]
    assert len(override_rows) == 1
    assert override_rows[0]["description"] == "SOBEYS #1234"
    assert override_rows[0]["category"] == "Groceries"


def test_confirm_returns_404_for_account_not_owned_by_user(client):
    fake_supabase = FakeSupabase(table_data={"accounts": []})

    payload = {
        "account_id": "22222222-2222-2222-2222-222222222222",
        "filename": "export.csv",
        "bank_detected": "rbc",
        "transactions": [],
    }

    with patch("app.routers.upload.get_supabase", return_value=fake_supabase):
        response = client.post("/upload/confirm", json=payload)

    assert response.status_code == 404