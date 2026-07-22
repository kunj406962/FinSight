from datetime import date

from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_user
from app.schemas.transactions import Category, TransactionListResponse
from app.services.db import get_supabase

router = APIRouter(tags=["transactions"])


@router.get(
    "/transactions",
    response_model=TransactionListResponse,
    summary="List transactions",
    description="Retrieve the current user's transactions, optionally filtered by account, date range, and category.",
    response_description="Filtered list of transactions",
)
async def get_transactions(
    account_id: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    category: Category | None = None,
    user=Depends(get_current_user),
):
    """Return the current user's transactions, applying optional account, date range, and category filters, newest first."""
    supabase = get_supabase()
    query = (
        supabase.table("transactions")
        .select("*")
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

    result = query.execute()
    transactions = result.data

    return TransactionListResponse(transactions=transactions, total=len(transactions))