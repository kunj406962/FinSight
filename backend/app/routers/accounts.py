# Account routes for creating and listing user-linked financial accounts.
from fastapi import APIRouter, Depends
from app.auth.dependencies import get_current_user
from app.services.db import get_supabase
from app.schemas.transactions import AccountCreate, AccountResponse

router = APIRouter(prefix="/accounts", tags=["accounts"])


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
    response = (
        get_supabase()
        .table("accounts")
        .insert(
            {
                "user_id": user.id,
                "name": body.name,
                "account_type": body.account_type.value,
            }
        )
        .execute()
    )
    return response.data[0]


@router.get(
    "",
    response_model=list[AccountResponse],
    summary="List accounts",
    description="Retrieve all accounts owned by the authenticated user, ordered from newest to oldest.",
    response_description="List of account records",
)
async def list_accounts(user=Depends(get_current_user)):
    """List the current user's accounts in reverse chronological order for display in the app."""
    response = (
        get_supabase()
        .table("accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data