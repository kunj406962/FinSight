from fastapi import APIRouter, Depends
from app.auth.dependencies import get_current_user
from app.services.db import get_supabase
from app.schemas.transactions import AccountCreate, AccountResponse

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.post("", response_model=AccountResponse, status_code=201)
async def create_account(body: AccountCreate, user=Depends(get_current_user)):
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


@router.get("", response_model=list[AccountResponse])
async def list_accounts(user=Depends(get_current_user)):
    response = (
        get_supabase()
        .table("accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data