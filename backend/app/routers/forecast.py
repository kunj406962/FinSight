from datetime import date

from fastapi import APIRouter, Depends, HTTPException

from app.auth.dependencies import get_current_user
from app.ml.forecaster import UNSUPPORTED_CATEGORIES, forecast_category
from app.schemas.transactions import Category, ForecastPoint, ForecastResponse
from app.services.db import get_supabase

router = APIRouter(tags=["forecast"])


def _current_month_start() -> date:
    return date.today().replace(day=1)


def _get_cached_forecast(supabase, user_id: str, category: str, month_start: date) -> dict | None:
    result = (
        supabase.table("forecast_cache")
        .select("*")
        .eq("user_id", user_id)
        .eq("category", category)
        .eq("target_month", month_start.isoformat())
        .execute()
    )
    return result.data[0] if result.data else None


def _store_forecast_cache(supabase, user_id: str, category: str, month_start: date, result: dict) -> None:
    payload = {
        "user_id": user_id,
        "category": category,
        "target_month": month_start.isoformat(),
        "insufficient_data": result["insufficient_data"],
        "predicted_amount": result["predicted_amount"],
        "lower_bound": result["lower_bound"],
        "upper_bound": result["upper_bound"],
    }
    # Upsert is safe here (unlike the anomaly/category_overrides cases) because
    # the payload includes every column — no partial-update NOT NULL risk, and
    # only one row per (user, category, month) can ever be a target.
    supabase.table("forecast_cache").upsert(
        payload, on_conflict="user_id,category,target_month"
    ).execute()


def _to_response(category: str, data: dict) -> ForecastResponse:
    if data["insufficient_data"]:
        return ForecastResponse(category=category, forecast=[], insufficient_data=True) # type: ignore

    point = ForecastPoint(
        date=data["target_month"],
        predicted_amount=data["predicted_amount"],
        lower_bound=data["lower_bound"],
        upper_bound=data["upper_bound"],
    )
    return ForecastResponse(category=category, forecast=[point], insufficient_data=False) # type: ignore


@router.get(
    "/forecast",
    response_model=ForecastResponse,
    summary="Forecast the current month's spending for a category",
    description="Predict the current, in-progress month's total for a single spending category, using Prophet fit on prior complete months. Result is cached for the remainder of the calendar month.",
    response_description="Forecasted amount with an uncertainty range for the current month",
)
async def get_forecast(category: Category, user=Depends(get_current_user)) -> ForecastResponse:
    """Return a monthly forecast for one category. Health, Transfer, and Education aren't supported and return 400. Cached per (user, category, month) so repeat calls within the same month skip refitting."""
    if category.value in UNSUPPORTED_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Forecasting is not supported for category '{category.value}'")

    supabase = get_supabase()
    month_start = _current_month_start()

    cached = _get_cached_forecast(supabase, user.id, category.value, month_start)
    if cached is not None:
        return _to_response(category.value, cached)

    result = forecast_category(supabase, user.id, category.value)
    _store_forecast_cache(supabase, user.id, category.value, month_start, result)
    return _to_response(category.value, result)