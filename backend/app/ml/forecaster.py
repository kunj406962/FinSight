import pandas as pd
from prophet import Prophet

MIN_MONTHS = 3

NO_REGRESSOR_CATEGORIES = ["Income", "Utilities", "Rent/Mortgage", "Groceries"]
REGRESSOR_CATEGORIES = ["Entertainment", "Shopping", "Food", "Savings", "Other", "Transport"]
UNSUPPORTED_CATEGORIES = ["Health", "Transfer", "Education"]


def _make_prophet() -> Prophet:
    # Seasonality explicitly off: ~19 months of history isn't enough to
    # reliably identify a real annual pattern (needs 2+ full cycles), and
    # weekly/daily seasonality are meaningless once bucketed monthly.
    return Prophet(yearly_seasonality=False, weekly_seasonality=False, daily_seasonality=False) # type: ignore


def _build_monthly_series(supabase, user_id: str, category: str) -> pd.DataFrame:
    """Aggregate a user's transactions in one category to monthly totals.
    Zero-fills gap months. Excludes the current, still-in-progress month."""
    rows = (
        supabase.table("transactions")
        .select("date, amount")
        .eq("user_id", user_id)
        .eq("category", category)
        .execute()
    ).data

    if not rows:
        return pd.DataFrame(columns=["ds", "y"])

    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    df["month"] = df["date"].dt.to_period("M")

    monthly = df.groupby("month")["amount"].sum().abs()

    current_month = pd.Timestamp.now().to_period("M")
    monthly = monthly[monthly.index < current_month]

    if monthly.empty:
        return pd.DataFrame(columns=["ds", "y"])

    full_range = pd.period_range(monthly.index.min(), monthly.index.max(), freq="M")
    monthly = monthly.reindex(full_range, fill_value=0.0)

    result = monthly.reset_index()
    result.columns = ["month", "y"]
    result["ds"] = result["month"].dt.to_timestamp()
    return result[["ds", "y"]]


def _fit_no_regressor(series: pd.DataFrame) -> dict:
    model = _make_prophet()
    model.fit(series[["ds", "y"]])

    target_ds = series["ds"].max() + pd.DateOffset(months=1)
    forecast = model.predict(pd.DataFrame({"ds": [target_ds]}))
    row = forecast.iloc[0]

    return {
        "insufficient_data": False,
        "target_month": target_ds.date(),
        "predicted_amount": float(row["yhat"]),
        "lower_bound": float(row["yhat_lower"]),
        "upper_bound": float(row["yhat_upper"]),
    }


def _fit_with_regressor(series: pd.DataFrame, merged: pd.DataFrame, income_future_value: float) -> dict:
    train = merged.rename(columns={"y_income": "income"})[["ds", "y", "income"]]

    model = _make_prophet()
    model.add_regressor("income")
    model.fit(train)

    target_ds = series["ds"].max() + pd.DateOffset(months=1)
    future = pd.DataFrame({"ds": [target_ds], "income": [income_future_value]})
    forecast = model.predict(future)
    row = forecast.iloc[0]

    return {
        "insufficient_data": False,
        "target_month": target_ds.date(),
        "predicted_amount": float(row["yhat"]),
        "lower_bound": float(row["yhat_lower"]),
        "upper_bound": float(row["yhat_upper"]),
    }


_INSUFFICIENT = {
    "insufficient_data": True,
    "target_month": None,
    "predicted_amount": None,
    "lower_bound": None,
    "upper_bound": None,
}


def forecast_category(supabase, user_id: str, category: str) -> dict:
    """Forecast next month's total for a category. Caller is responsible for
    rejecting UNSUPPORTED_CATEGORIES before calling this (400, not insufficient_data)."""
    series = _build_monthly_series(supabase, user_id, category)
    if len(series) < MIN_MONTHS:
        return _INSUFFICIENT

    if category not in REGRESSOR_CATEGORIES:
        return _fit_no_regressor(series)

    income_series = _build_monthly_series(supabase, user_id, "Income")
    merged = series.merge(income_series, on="ds", suffixes=("", "_income"))

    if len(income_series) < MIN_MONTHS or len(merged) < MIN_MONTHS:
        return _fit_no_regressor(series)

    income_forecast = _fit_no_regressor(income_series)
    return _fit_with_regressor(series, merged, income_forecast["predicted_amount"])