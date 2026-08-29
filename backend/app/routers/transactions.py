from datetime import date

from fastapi import APIRouter, Depends, Query

from app.auth.dependencies import get_current_user
from app.schemas.transactions import Category, TransactionListResponse
from app.services.db import get_supabase

router = APIRouter(tags=["transactions"])

DEFAULT_LIMIT = 50
MAX_LIMIT = 200


@router.get(
    "/transactions",
    response_model=TransactionListResponse,
    summary="List transactions",
    description="Retrieve the current user's transactions, optionally filtered by account, date range, category, and a case-insensitive description search, paginated newest first.",
    response_description="A page of filtered transactions, plus the total count across all matching rows",
)
async def get_transactions(
    account_id: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    category: Category | None = None,
    search: str | None = None,
    limit: int = Query(DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    offset: int = Query(0, ge=0),
    user=Depends(get_current_user),
):
    """Return a page of the current user's transactions, applying optional account,
    date range, category, and description-search filters, newest first.
    `total` reflects the full filtered count (via Supabase's count="exact"),
    not just the size of the returned page, so the frontend can compute
    total pages without a second request."""
    supabase = get_supabase()
    query = (
        supabase.table("transactions")
        .select("*", count="exact")
        .eq("user_id", user.id)
        .order("date", desc=True)
    )

    if account_id:
        query = query.eq("account_id", account_id)
    if start_date:
        query = query.gte("date", start_date.isoformat())
    if end_date:
        query = query.lte("date", end_date.isoformat())
    if category:
        query = query.eq("category", category.value)
    if search:
        query = query.ilike("description", f"%{search}%")

    query = query.range(offset, offset + limit - 1)
    result = query.execute()

    return TransactionListResponse(transactions=result.data, total=result.count or 0)