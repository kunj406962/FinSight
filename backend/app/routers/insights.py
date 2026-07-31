from collections import defaultdict
from datetime import date, timedelta

from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_user
from app.ml.forecaster import UNSUPPORTED_CATEGORIES, get_or_compute_forecast
from app.schemas.transactions import InsightResponse
from app.services.db import get_supabase
from app.services.gemini import generate_narration

router = APIRouter(tags=["insights"])

SPEND_CATEGORIES = [
    "Food", "Groceries", "Transport", "Utilities", "Entertainment",
    "Health", "Shopping", "Rent/Mortgage", "Education", "Other",
]
FIXED_CATEGORIES = ["Rent/Mortgage"]


def _month_bounds(today: date) -> tuple[date, date, date]:
    current_month_start = today.replace(day=1)
    last_month_end = current_month_start - timedelta(days=1)
    last_month_start = last_month_end.replace(day=1)
    return last_month_start, last_month_end, current_month_start


def _week_start(today: date) -> date:
    return today - timedelta(days=today.weekday())


def _query_transactions_range(supabase, user_id: str, start_date: date, end_date: date) -> list[dict]:
    return (
        supabase.table("transactions")
        .select("category, amount, date, is_anomaly")
        .eq("user_id", user_id)
        .gte("date", start_date.isoformat())
        .lte("date", end_date.isoformat())
        .execute()
    ).data


def _split_and_aggregate(rows: list[dict], current_month_start: date) -> tuple[dict, dict]:
    """Split rows into last-month/current-month buckets and sum abs(amount) per category."""
    last_month_totals: dict[str, float] = defaultdict(float)
    current_month_totals: dict[str, float] = defaultdict(float)
    for row in rows:
        txn_date = date.fromisoformat(row["date"])
        bucket = current_month_totals if txn_date >= current_month_start else last_month_totals
        bucket[row["category"]] += abs(row["amount"])
    return last_month_totals, current_month_totals


def _period_context(today: date) -> dict:
    import calendar
    days_in_month = calendar.monthrange(today.year, today.month)[1]
    last_month_name = (today.replace(day=1) - timedelta(days=1)).strftime("%B")
    return {
        "today": today.isoformat(),
        "current_month_name": today.strftime("%B"),
        "day_of_month": today.day,
        "days_in_month": days_in_month,
        "days_elapsed_pct": round(today.day / days_in_month, 4),
        "last_month_name": last_month_name,
    }


def _forecast_or_none(supabase, user_id: str, category: str) -> float | None:
    if category in UNSUPPORTED_CATEGORIES:
        return None
    result = get_or_compute_forecast(supabase, user_id, category)
    return None if result["insufficient_data"] else result["predicted_amount"]


def _build_category_entry(
    category: str,
    last_month_amount: float,
    current_month_amount: float,
    forecast_amount: float | None,
    day_of_month: int,
    days_in_month: int,
) -> dict:
    forecast_vs_last_month_pct = None
    if forecast_amount is not None and last_month_amount:
        forecast_vs_last_month_pct = (forecast_amount - last_month_amount) / last_month_amount

    expected_to_date = None
    pace_vs_expected_pct = None
    if forecast_amount is not None:
        expected_to_date = forecast_amount * (day_of_month / days_in_month)
        if expected_to_date:
            pace_vs_expected_pct = (current_month_amount - expected_to_date) / expected_to_date

    return {
        "category": category,
        "type": "fixed" if category in FIXED_CATEGORIES else "discretionary",
        "last_month_amount": round(last_month_amount, 2),
        "forecast_amount": round(forecast_amount, 2) if forecast_amount is not None else None,
        "forecast_vs_last_month_pct": round(forecast_vs_last_month_pct, 4) if forecast_vs_last_month_pct is not None else None,
        "current_month_amount": round(current_month_amount, 2),
        "expected_to_date": round(expected_to_date, 2) if expected_to_date is not None else None,
        "pace_vs_expected_pct": round(pace_vs_expected_pct, 4) if pace_vs_expected_pct is not None else None,
    }


def _build_summary(top_categories: list[dict], anomaly_count: int, total_saved: float) -> str:
    """Deterministic, Python-computed summary — not LLM-authored. See InsightResponse.summary vs. gemini_narration split."""
    discretionary_spend = sum(c["current_month_amount"] for c in top_categories if c["type"] == "discretionary")
    plural = "y" if anomaly_count == 1 else "ies"
    return (
        f"So far this month you've spent ${discretionary_spend:,.2f} on discretionary categories, "
        f"saved ${total_saved:,.2f} over the last two months combined, "
        f"and {anomaly_count} anomal{plural} flagged."
    )


def _get_cached_insights(supabase, user_id: str, week_start: date) -> dict | None:
    result = (
        supabase.table("insights_cache")
        .select("*")
        .eq("user_id", user_id)
        .eq("week_start", week_start.isoformat())
        .execute()
    )
    return result.data[0]["response"] if result.data else None


def _store_insights_cache(supabase, user_id: str, week_start: date, response: dict) -> None:
    payload = {"user_id": user_id, "week_start": week_start.isoformat(), "response": response}
    # Safe to upsert: payload always includes every column, unique constraint targets exactly one row.
    supabase.table("insights_cache").upsert(payload, on_conflict="user_id,week_start").execute()


def build_insights(supabase, user_id: str) -> dict:
    """Aggregate last month + current month-to-date spend, pull forecasts for all
    10 forecastable categories, and ask Gemini to narrate the combined picture."""
    today = date.today()
    last_month_start, _last_month_end, current_month_start = _month_bounds(today)

    rows = _query_transactions_range(supabase, user_id, last_month_start, today)
    last_month_totals, current_month_totals = _split_and_aggregate(rows, current_month_start)

    anomaly_count = sum(1 for r in rows if r.get("is_anomaly"))
    total_saved = last_month_totals.get("Savings", 0.0) + current_month_totals.get("Savings", 0.0)

    ctx = _period_context(today)

    top_categories = [
        _build_category_entry(
            category,
            last_month_totals.get(category, 0.0),
            current_month_totals.get(category, 0.0),
            _forecast_or_none(supabase, user_id, category),
            ctx["day_of_month"],
            ctx["days_in_month"],
        )
        for category in SPEND_CATEGORIES
    ]
    top_categories.sort(key=lambda c: c["current_month_amount"], reverse=True)

    summary = _build_summary(top_categories, anomaly_count, total_saved)

    prompt_data = {
        "period_context": ctx,
        "top_categories": top_categories,
        "income": {
            "last_month_amount": last_month_totals.get("Income", 0.0),
            "current_month_amount": current_month_totals.get("Income", 0.0),
            "forecast_amount": _forecast_or_none(supabase, user_id, "Income"),
        },
        "savings": {
            "last_month_amount": last_month_totals.get("Savings", 0.0),
            "current_month_amount": current_month_totals.get("Savings", 0.0),
            "forecast_amount": _forecast_or_none(supabase, user_id, "Savings"),
            "total_saved": total_saved,
        },
        "anomaly_count": anomaly_count,
    }
    narration = generate_narration(prompt_data)

    return {
        "summary": summary,
        "anomaly_count": anomaly_count,
        "top_categories": top_categories,
        "total_saved": round(total_saved, 2),
        "gemini_narration": narration,
    }


@router.get(
    "/insights",
    response_model=InsightResponse,
    summary="Get natural-language spending insights",
    description="Compare last month's complete spending to this month's progress so far, per category, alongside a Prophet forecast for where each category is headed. Gemini narrates the combined picture in plain language. Cached weekly per user.",
    response_description="Structured spending comparison plus a natural-language narration",
)
async def get_insights(user=Depends(get_current_user)) -> InsightResponse:
    """Return this week's cached insights if present, otherwise aggregate transactions,
    pull/compute forecasts for all forecastable categories, generate a Gemini narration,
    cache the result for the rest of the calendar week, and return it."""
    supabase = get_supabase()
    week_start = _week_start(date.today())

    cached = _get_cached_insights(supabase, user.id, week_start)
    if cached is not None:
        return InsightResponse(**cached)

    result = build_insights(supabase, user.id)
    _store_insights_cache(supabase, user.id, week_start, result)
    return InsightResponse(**result)