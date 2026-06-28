from __future__ import annotations
from datetime import date, datetime
from enum import Enum
from uuid import UUID
from pydantic import BaseModel


class AccountType(str, Enum):
    chequing = "chequing"
    savings = "savings"
    credit_card = "credit_card"
    other = "other"


class Category(str, Enum):
    food = "Food"
    transport = "Transport"
    utilities = "Utilities"
    entertainment = "Entertainment"
    health = "Health"
    shopping = "Shopping"
    income = "Income"
    other = "Other"


class AccountCreate(BaseModel):
    name: str
    account_type: AccountType


class AccountResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    account_type: AccountType
    created_at: datetime


class TransactionResponse(BaseModel):
    id: UUID
    user_id: UUID
    batch_id: UUID
    date: date
    description: str
    amount: float
    category: Category
    account_type: str
    is_anomaly: bool
    anomaly_score: float
    created_at: datetime


class TransactionListResponse(BaseModel):
    transactions: list[TransactionResponse]
    total: int


class UploadResponse(BaseModel):
    batch_id: UUID
    bank_detected: str
    transaction_count: int
    message: str


class ForecastPoint(BaseModel):
    date: date
    predicted_amount: float
    lower_bound: float
    upper_bound: float


class ForecastResponse(BaseModel):
    category: Category
    forecast: list[ForecastPoint]
    insufficient_data: bool


class InsightResponse(BaseModel):
    summary: str
    anomaly_count: int
    top_categories: list[dict]
    gemini_narration: str