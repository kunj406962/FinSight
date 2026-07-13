import pandas as pd
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from app.auth.dependencies import get_current_user
from app.services.db import get_supabase
from app.services.parsers.detector import detect_and_get_parser
from app.services.parsers.base_parser import ParsedTransaction
from app.ml.transfer_detector import is_savings, is_transfer
from app.ml.categorizer import predict_category
from app.ml.anomaly import score_user_transactions
from app.schemas.transactions import (
    UploadResponse,
    UploadPreviewResponse,
    PreviewTransaction,
    UploadConfirmRequest,
)

router = APIRouter(prefix="/upload", tags=["upload"])


def _validate_account(supabase, account_id: str, user_id: str) -> dict:
    account_result = (
        supabase.table("accounts")
        .select("*")
        .eq("id", account_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not account_result.data:
        raise HTTPException(status_code=404, detail="Account not found")
    return account_result.data[0]


def _dedupe_new_transactions(
    supabase, account_id: str, parsed_transactions: list[ParsedTransaction]
) -> list[ParsedTransaction]:
    existing_batches = (
        supabase.table("upload_batches")
        .select("id")
        .eq("account_id", account_id)
        .execute()
    )
    existing_batch_ids = [b["id"] for b in existing_batches.data]

    existing_keys = set()
    if existing_batch_ids:
        existing_txns = (
            supabase.table("transactions")
            .select("date,description,amount")
            .in_("batch_id", existing_batch_ids)
            .execute()
        )
        existing_keys = {
            (t["date"], t["description"], t["amount"]) for t in existing_txns.data
        }

    return [
        txn
        for txn in parsed_transactions
        if (txn.date.isoformat(), txn.description, txn.amount) not in existing_keys
    ]


def _load_overrides(supabase, user_id: str) -> dict[str, str]:
    result = (
        supabase.table("category_overrides")
        .select("description,category")
        .eq("user_id", user_id)
        .execute()
    )
    return {row["description"]: row["category"] for row in result.data}


def _classify(overrides: dict[str, str], description: str) -> str:
    if is_savings(description):
        return "Savings"
    if is_transfer(description):
        return "Transfer"
    normalized = description.strip().upper()
    if normalized in overrides:
        return overrides[normalized]
    return predict_category(description)


def _parse_csv(file: UploadFile):
    try:
        df = pd.read_csv(file.file)
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read file as CSV")

    bank_name, parser = detect_and_get_parser(df)
    if parser is None:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Unrecognized bank CSV format",
                "headers_found": list(df.columns),
            },
        )

    try:
        parsed_transactions = parser.parse(df)
    except Exception:
        raise HTTPException(
            status_code=400, detail="Failed to parse CSV — file may be malformed"
        )

    if not parsed_transactions:
        raise HTTPException(status_code=400, detail="No transactions found in file")

    return bank_name, parsed_transactions


@router.post("/preview", response_model=UploadPreviewResponse)
async def upload_preview(
    account_id: str = Form(...),
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    supabase = get_supabase()
    _validate_account(supabase, account_id, user.id)

    bank_name, parsed_transactions = _parse_csv(file)
    new_transactions = _dedupe_new_transactions(supabase, account_id, parsed_transactions)
    overrides = _load_overrides(supabase, user.id)

    preview_transactions = [
        PreviewTransaction(
            date=txn.date,
            description=txn.description,
            amount=txn.amount,
            predicted_category=_classify(overrides, txn.description), # type: ignore
        )
        for txn in new_transactions
    ]

    return UploadPreviewResponse(
        account_id=account_id, # pyright: ignore[reportArgumentType]
        filename=file.filename, # type: ignore
        bank_detected=bank_name,
        transactions=preview_transactions,
    )


@router.post("/confirm", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_confirm(
    confirm_request: UploadConfirmRequest,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user)
):
    supabase = get_supabase()
    account = _validate_account(supabase, str(confirm_request.account_id), user.id)

    batch_result = (
        supabase.table("upload_batches")
        .insert(
            {
                "user_id": user.id,
                "account_id": str(confirm_request.account_id),
                "filename": confirm_request.filename,
                "bank_detected": confirm_request.bank_detected,
                "transaction_count": len(confirm_request.transactions),
            }
        )
        .execute()
    )
    batch_id = batch_result.data[0]["id"]

    if confirm_request.transactions:
        rows = [
            {
                "user_id": user.id,
                "batch_id": batch_id,
                "date": txn.date.isoformat(),
                "description": txn.description,
                "amount": txn.amount,
                "category": txn.final_category,
                "account_type": account["account_type"],
                "is_anomaly": False,
            }
            for txn in confirm_request.transactions
        ]
        supabase.table("transactions").insert(rows).execute()

        override_rows = [
            {
                "user_id": user.id,
                "description": txn.description.strip().upper(),
                "category": txn.final_category,
            }
            for txn in confirm_request.transactions
            if txn.final_category != txn.predicted_category
        ]
        if override_rows:
            supabase.table("category_overrides").upsert(
                override_rows, on_conflict="user_id,description"
            ).execute()
        
        background_tasks.add_task(score_user_transactions, supabase, user.id)

    return UploadResponse(
        batch_id=batch_id,
        bank_detected=confirm_request.bank_detected,
        transaction_count=len(confirm_request.transactions),
        message="Upload processed successfully",
    )