from datetime import date, datetime
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.auth.dependencies import get_current_user
from app.main import app


class FakeResult:
    def __init__(self, data, count=None):
        self.data = data
        self.count = count


class FakeQuery:
    """Chainable fake mirroring the subset of PostgREST query builder methods
    get_transactions actually calls: select(count=...), eq, gte, lte, ilike,
    order, range, execute."""

    def __init__(self, rows, count_exact=False):
        self.rows = list(rows)
        self._count_exact = count_exact
        self._range = None

    def eq(self, col, val):
        self.rows = [r for r in self.rows if str(r.get(col)) == str(val)]
        return self

    def gte(self, col, val):
        self.rows = [r for r in self.rows if r.get(col) >= val]
        return self

    def lte(self, col, val):
        self.rows = [r for r in self.rows if r.get(col) <= val]
        return self

    def ilike(self, col, pattern):
        needle = pattern.strip("%").lower()
        self.rows = [r for r in self.rows if needle in str(r.get(col, "")).lower()]
        return self

    def order(self, col, desc=False):
        self.rows = sorted(self.rows, key=lambda r: r.get(col), reverse=desc)
        return self

    def range(self, start, end):
        self._range = (start, end)
        return self

    def execute(self):
        # count reflects every row matching the filters applied so far,
        # taken BEFORE range() slices the page -- mirrors real Supabase
        # count="exact" behavior (count is over the full filtered set, not
        # just the returned page).
        total = len(self.rows) if self._count_exact else None
        data = self.rows
        if self._range:
            start, end = self._range
            data = data[start : end + 1]
        return FakeResult(data, count=total)


class FakeTable:
    def __init__(self, rows):
        self._rows = rows

    def select(self, *args, count=None, **kwargs):
        return FakeQuery(self._rows, count_exact=(count == "exact"))


class FakeSupabase:
    def __init__(self, transactions):
        self._transactions = transactions

    def table(self, name):
        if name == "transactions":
            return FakeTable(self._transactions)
        raise ValueError(f"Unexpected table: {name}")


USER_1 = "11111111-1111-1111-1111-111111111111"
USER_2 = "22222222-2222-2222-2222-222222222222"
ACC_1 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1"
ACC_2 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2"
ACC_3 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3"
BATCH_1 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1"
BATCH_2 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2"
BATCH_3 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3"

CREATED_AT = datetime(2026, 1, 1, 12, 0, 0).isoformat()


class FakeUser:
    id = USER_1
    email = "test@example.com"


SAMPLE_TRANSACTIONS = [
    {
        "id": "10000000-0000-0000-0000-000000000001", "user_id": USER_1,
        "batch_id": BATCH_1, "account_id": ACC_1,
        "date": date(2026, 1, 5).isoformat(), "description": "Groceries",
        "amount": -50.0, "category": "Groceries", "account_type": "chequing",
        "is_anomaly": False, "anomaly_score": 0.1, "created_at": CREATED_AT,
    },
    {
        "id": "10000000-0000-0000-0000-000000000002", "user_id": USER_1,
        "batch_id": BATCH_1, "account_id": ACC_1,
        "date": date(2026, 2, 10).isoformat(), "description": "Rent",
        "amount": -1200.0, "category": "Rent/Mortgage", "account_type": "chequing",
        "is_anomaly": False, "anomaly_score": 0.2, "created_at": CREATED_AT,
    },
    {
        "id": "10000000-0000-0000-0000-000000000003", "user_id": USER_1,
        "batch_id": BATCH_2, "account_id": ACC_2,
        "date": date(2026, 3, 1).isoformat(), "description": "Movies",
        "amount": -30.0, "category": "Entertainment", "account_type": "credit_card",
        "is_anomaly": False, "anomaly_score": 0.3, "created_at": CREATED_AT,
    },
    {
        "id": "10000000-0000-0000-0000-000000000004", "user_id": USER_2,
        "batch_id": BATCH_3, "account_id": ACC_3,
        "date": date(2026, 3, 2).isoformat(), "description": "Someone else's txn",
        "amount": -20.0, "category": "Food", "account_type": "chequing",
        "is_anomaly": False, "anomaly_score": 0.1, "created_at": CREATED_AT,
    },
]


@pytest.fixture
def client():
    app.dependency_overrides[get_current_user] = lambda: FakeUser()
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def fake_supabase():
    return FakeSupabase(SAMPLE_TRANSACTIONS)


def test_no_filters_returns_all_user_transactions(client, fake_supabase):
    with patch("app.routers.transactions.get_supabase", return_value=fake_supabase):
        response = client.get("/transactions")

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    ids = {t["id"] for t in data["transactions"]}
    assert "10000000-0000-0000-0000-000000000004" not in ids  # other user excluded


def test_results_ordered_newest_first(client, fake_supabase):
    with patch("app.routers.transactions.get_supabase", return_value=fake_supabase):
        response = client.get("/transactions")

    dates = [t["date"] for t in response.json()["transactions"]]
    assert dates == sorted(dates, reverse=True)


def test_account_id_filter(client, fake_supabase):
    with patch("app.routers.transactions.get_supabase", return_value=fake_supabase):
        response = client.get("/transactions", params={"account_id": ACC_1})

    data = response.json()
    assert data["total"] == 2
    assert all(t["account_id"] == ACC_1 for t in data["transactions"])


def test_date_range_filter(client, fake_supabase):
    with patch("app.routers.transactions.get_supabase", return_value=fake_supabase):
        response = client.get(
            "/transactions",
            params={"start_date": "2026-02-01", "end_date": "2026-02-28"},
        )

    data = response.json()
    assert data["total"] == 1
    assert data["transactions"][0]["id"] == "10000000-0000-0000-0000-000000000002"


def test_category_filter(client, fake_supabase):
    with patch("app.routers.transactions.get_supabase", return_value=fake_supabase):
        response = client.get("/transactions", params={"category": "Entertainment"})

    data = response.json()
    assert data["total"] == 1
    assert data["transactions"][0]["id"] == "10000000-0000-0000-0000-000000000003"


def test_combined_filters(client, fake_supabase):
    with patch("app.routers.transactions.get_supabase", return_value=fake_supabase):
        response = client.get(
            "/transactions",
            params={"account_id": ACC_1, "category": "Rent/Mortgage"},
        )

    data = response.json()
    assert data["total"] == 1
    assert data["transactions"][0]["id"] == "10000000-0000-0000-0000-000000000002"


def test_unowned_account_id_returns_empty_not_404(client, fake_supabase):
    with patch("app.routers.transactions.get_supabase", return_value=fake_supabase):
        response = client.get("/transactions", params={"account_id": ACC_3})

    assert response.status_code == 200
    assert response.json()["total"] == 0


def test_search_filter_matches_description_case_insensitively(client, fake_supabase):
    with patch("app.routers.transactions.get_supabase", return_value=fake_supabase):
        response = client.get("/transactions", params={"search": "rent"})

    data = response.json()
    assert data["total"] == 1
    assert data["transactions"][0]["id"] == "10000000-0000-0000-0000-000000000002"


def test_search_filter_no_match_returns_empty(client, fake_supabase):
    with patch("app.routers.transactions.get_supabase", return_value=fake_supabase):
        response = client.get(
            "/transactions", params={"search": "nonexistent merchant"}
        )

    data = response.json()
    assert data["total"] == 0
    assert data["transactions"] == []


def test_pagination_limit_returns_partial_page_but_full_total(client, fake_supabase):
    with patch("app.routers.transactions.get_supabase", return_value=fake_supabase):
        response = client.get("/transactions", params={"limit": 1, "offset": 0})

    data = response.json()
    assert len(data["transactions"]) == 1
    assert data["total"] == 3  # full filtered count, not just this page


def test_pagination_offset_returns_next_page(client, fake_supabase):
    with patch("app.routers.transactions.get_supabase", return_value=fake_supabase):
        first_page = client.get("/transactions", params={"limit": 1, "offset": 0}).json()
        second_page = client.get(
            "/transactions", params={"limit": 1, "offset": 1}
        ).json()

    assert first_page["transactions"][0]["id"] != second_page["transactions"][0]["id"]
    assert first_page["total"] == second_page["total"] == 3


def test_pagination_combined_with_filters(client, fake_supabase):
    with patch("app.routers.transactions.get_supabase", return_value=fake_supabase):
        response = client.get(
            "/transactions", params={"account_id": ACC_1, "limit": 1, "offset": 0}
        )

    data = response.json()
    assert len(data["transactions"]) == 1
    assert data["total"] == 2  # ACC_1 has 2 matching rows total, not just this page