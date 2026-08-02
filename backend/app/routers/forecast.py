from fastapi import APIRouter, Depends, HTTPException

from app.auth.dependencies import get_current_user
from app.ml.forecaster import UNSUPPORTED_CATEGORIES, get_or_compute_forecast
from app.schemas.transactions import Category, ForecastPoint, ForecastResponse
from app.services.db import get_supabase

router = APIRouter(tags=["forecast"])


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
    result = get_or_compute_forecast(supabase, user.id, category.value)
    return _to_response(category.value, result)