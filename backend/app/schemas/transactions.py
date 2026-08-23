# Pydantic models that define the API payloads used across the backend.
from __future__ import annotations
from datetime import date, datetime
from enum import Enum
from uuid import UUID
from pydantic import BaseModel


class AccountType(str, Enum):
    """Supported account kinds for user financial accounts."""
    chequing = "chequing"
    savings = "savings"
    credit_card = "credit_card"
    other = "other"


class Category(str, Enum):
    """Allowed transaction categories used by the budgeting and ML features."""
    food = "Food"
    groceries = "Groceries"
    transport = "Transport"
    utilities = "Utilities"
    entertainment = "Entertainment"
    health = "Health"
    shopping = "Shopping"
    income = "Income"
    transfer = "Transfer"
    savings = "Savings"
    rent_mortgage = "Rent/Mortgage"
    education = "Education"
    other = "Other"


class AccountCreate(BaseModel):
    """Request body for creating a new account."""
    name: str
    account_type: AccountType
    starting_balance: float=0.0


class AccountResponse(BaseModel):
    """Response payload returned for account records."""
    id: UUID
    user_id: UUID
    name: str
    account_type: AccountType
    starting_balance: float         
    current_balance: float 
    created_at: datetime


class TransactionResponse(BaseModel):
    """Detailed transaction payload returned by transaction-related endpoints."""
    id: UUID
    user_id: UUID
    batch_id: UUID
    account_id: UUID  # NEW
    date: date
    description: str
    amount: float
    category: Category
    account_type: str
    is_anomaly: bool
    anomaly_score: float | None
    created_at: datetime


class TransactionListResponse(BaseModel):
    """Container model for paged or grouped transaction responses."""
    transactions: list[TransactionResponse]
    total: int


class UploadResponse(BaseModel):
    """Confirmation payload returned after a successful upload import."""
    batch_id: UUID
    bank_detected: str
    transaction_count: int
    message: str


class ForecastPoint(BaseModel):
    """Single forecast value for a future period."""
    date: date
    predicted_amount: float
    lower_bound: float
    upper_bound: float


class ForecastResponse(BaseModel):
    """Forecast output for a single spending category."""
    category: Category
    forecast: list[ForecastPoint]
    insufficient_data: bool


class InsightResponse(BaseModel):
    summary: str
    anomaly_count: int
    top_categories: list[dict]
    total_saved: float  # NEW
    gemini_narration: str

class PreviewTransaction(BaseModel):
    """A single transaction shown during the upload preview step."""
    date: date
    description: str
    amount: float
    predicted_category: Category


class UploadPreviewResponse(BaseModel):
    """Response payload for the upload preview endpoint."""
    account_id: UUID
    filename: str
    bank_detected: str
    transactions: list[PreviewTransaction]


class ConfirmTransaction(BaseModel):
    """User-confirmed transaction data sent during import confirmation."""
    date: date
    description: str
    amount: float
    predicted_category: Category
    final_category: Category


class UploadConfirmRequest(BaseModel):
    """Request body for finalizing an upload and storing transactions."""
    account_id: UUID
    filename: str
    bank_detected: str
    transactions: list[ConfirmTransaction]

class ReconciliationCreate(BaseModel):
    reconciled_balance: float
    reconciled_at: date

class ReconciliationResponse(BaseModel):
    id: UUID
    account_id: UUID
    reconciled_balance: float
    reconciled_at: date
    created_at: datetime