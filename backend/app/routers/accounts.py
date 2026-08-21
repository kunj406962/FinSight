# Account routes for creating and listing user-linked financial accounts.
from typing import Any, cast

from fastapi import APIRouter, Depends, HTTPException
from app.auth.dependencies import get_current_user
from app.services.db import get_supabase
from app.schemas.transactions import (
    AccountCreate,
    AccountResponse,
    ReconciliationCreate,
    ReconciliationResponse,
)

router = APIRouter(prefix="/accounts", tags=["accounts"])


def _get_owned_account(supabase, account_id: str, user_id: str) -> dict:
    """Return the account row if it exists and belongs to user_id, else raise 404."""
    response = (
        supabase.table("accounts")
        .select("*")
        .eq("id", account_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Account not found")
    return response.data[0]


def _calculate_balance(supabase, account_id: str, user_id: str, starting_balance: float) -> float:
    """Compute the account's current balance.

    Deliberately includes ALL transactions, including Transfer/Savings --
    unlike spend totals, anomaly detection, and forecasting, which exclude
    those two categories. A transfer still moves real money in or out of
    the account, so it must count here even though it isn't "spend."

    If a reconciliation event exists, the balance is calculated from the
    most recent one forward (reconciled_balance + transactions dated after
    it), not additively from starting_balance + every transaction + every
    correction ever made -- this matches how real bank reconciliation works
    and avoids double-counting if the same drift gets corrected twice.
    Accepted limitation: a transaction backfilled with a date earlier than
    the most recent reconciliation will not affect the live balance.
    """
    latest = (
        supabase.table("account_reconciliations")
        .select("*")
        .eq("account_id", account_id)
        .eq("user_id", user_id)
        .order("reconciled_at", desc=True)
        .limit(1)
        .execute()
    )

    txn_query = (
        supabase.table("transactions")
        .select("amount")
        .eq("account_id", account_id)
        .eq("user_id", user_id)
    )

    if latest.data:
        baseline = latest.data[0]["reconciled_balance"]
        since_date = latest.data[0]["reconciled_at"]
        txns = txn_query.gt("date", since_date).execute()
    else:
        baseline = starting_balance
        txns = txn_query.execute()

    return baseline + sum(t["amount"] for t in txns.data)


@router.post(
    "",
    response_model=AccountResponse,
    status_code=201,
    summary="Create account",
    description="Create a new financial account for the authenticated user and store its default metadata.",
    response_description="Created account record",
)
async def create_account(body: AccountCreate, user=Depends(get_current_user)):
    """Create a new account record for the authenticated user and return the stored account payload."""
    supabase = get_supabase()
    response = (
        supabase.table("accounts")
        .insert(
            {
                "user_id": user.id,
                "name": body.name,
                "account_type": body.account_type.value,
                "starting_balance": body.starting_balance,
            }
        )
        .execute()
    )
    account = response.data[0]
    if not isinstance(account, dict):
        raise HTTPException(status_code=500, detail="Invalid account response")
    return {**account, "current_balance": account["starting_balance"]}  # no transactions yet


@router.get(
    "",
    response_model=list[AccountResponse],
    summary="List accounts",
    description="Retrieve all accounts owned by the authenticated user, ordered from newest to oldest.",
    response_description="List of account records",
)
async def list_accounts(user=Depends(get_current_user)):
    """List the current user's accounts in reverse chronological order for display in the app."""
    supabase = get_supabase()
    response = (
        supabase.table("accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .execute()
    )
    if not isinstance(response.data, list) or not all(
        isinstance(account, dict) for account in response.data
    ):
        raise HTTPException(status_code=500, detail="Invalid accounts response")
    accounts = cast(list[dict[str, Any]], response.data)
    for account in accounts:
        account["current_balance"] = _calculate_balance(
            supabase, account["id"], user.id, account["starting_balance"]
        )
    return accounts


@router.delete(
    "/{account_id}",
    status_code=204,
    summary="Delete account",
    description="Permanently delete an account and all of its transactions and upload batches. This cannot be undone.",
    response_description="No content on success",
)
async def delete_account(account_id: str, user=Depends(get_current_user)):
    """Delete an account owned by the current user. Transactions and upload batches are removed via DB-level cascade."""
    supabase = get_supabase()
    _get_owned_account(supabase, account_id, user.id)
    supabase.table("accounts").delete().eq("id", account_id).eq("user_id", user.id).execute()


@router.post(
    "/{account_id}/reconciliations",
    response_model=ReconciliationResponse,
    status_code=201,
    summary="Reconcile account balance",
    description="Record a manually-confirmed balance for an account as of a given date. Future balance calculations use this as their new baseline.",
    response_description="Created reconciliation record",
)
async def create_reconciliation(
    account_id: str, body: ReconciliationCreate, user=Depends(get_current_user)
):
    """Record a dated balance correction for the account, used as the new baseline for future balance calculations."""
    supabase = get_supabase()
    _get_owned_account(supabase, account_id, user.id)
    response = (
        supabase.table("account_reconciliations")
        .insert(
            {
                "account_id": account_id,
                "user_id": user.id,
                "reconciled_balance": body.reconciled_balance,
                "reconciled_at": body.reconciled_at.isoformat(),
            }
        )
        .execute()
    )
    return response.data[0]


@router.get(
    "/{account_id}/reconciliations",
    response_model=list[ReconciliationResponse],
    summary="List reconciliations",
    description="Retrieve the history of manual balance corrections for an account, newest first.",
    response_description="List of reconciliation records",
)
async def list_reconciliations(account_id: str, user=Depends(get_current_user)):
    """List an account's reconciliation history, newest first."""
    supabase = get_supabase()
    _get_owned_account(supabase, account_id, user.id)
    response = (
        supabase.table("account_reconciliations")
        .select("*")
        .eq("account_id", account_id)
        .eq("user_id", user.id)
        .order("reconciled_at", desc=True)
        .execute()
    )
    return response.data