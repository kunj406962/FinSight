import pandas as pd
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from app.auth.dependencies import get_current_user
from app.services.db import get_supabase
from app.services.parsers.detector import detect_and_get_parser
from app.schemas.transactions import UploadResponse

router = APIRouter(prefix="/upload", tags=["upload"])


@router.post("", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_csv(
    account_id: str = Form(...),
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    supabase = get_supabase()

    account_result = (
        supabase.table("accounts")
        .select("*")
        .eq("id", account_id)
        .eq("user_id", user.id)
        .execute()
    )
    if not account_result.data:
        raise HTTPException(status_code=404, detail="Account not found")
    account = account_result.data[0]

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

    new_transactions = [
        txn
        for txn in parsed_transactions
        if (txn.date.isoformat(), txn.description, txn.amount) not in existing_keys
    ]

    batch_result = (
        supabase.table("upload_batches")
        .insert(
            {
                "user_id": user.id,
                "account_id": account_id,
                "filename": file.filename,
                "bank_detected": bank_name,
                "transaction_count": len(new_transactions),
            }
        )
        .execute()
    )
    batch_id = batch_result.data[0]["id"]

    if new_transactions:
        rows = [
            {
                "user_id": user.id,
                "batch_id": batch_id,
                "date": txn.date.isoformat(),
                "description": txn.description,
                "amount": txn.amount,
                "category": "Other",
                "account_type": account["account_type"],
                "is_anomaly": False,
            }
            for txn in new_transactions
        ]
        supabase.table("transactions").insert(rows).execute()

    return UploadResponse(
        batch_id=batch_id,
        bank_detected=bank_name,
        transaction_count=len(new_transactions),
        message=(
            "Upload processed successfully"
            if new_transactions
            else "No new transactions — all rows were duplicates of existing data"
        ),
    )