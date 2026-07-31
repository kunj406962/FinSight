# Application entrypoint that wires together the FinSight FastAPI routers.
from fastapi import FastAPI, Depends
from app.routers import auth
from app.routers import accounts
from app.routers import upload
from app.routers import transactions
from app.routers import forecast
from app.routers import insights
from app.auth.dependencies import get_current_user

app = FastAPI(title="FinSight API")

app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(upload.router)
app.include_router(transactions.router)
app.include_router(forecast.router)
app.include_router(insights.router)

@app.get(
    "/health",
    summary="Health check",
    description="Return a simple status payload to confirm that the API is running and reachable.",
    response_description="Service health status",
)
async def health():
    """Provide a lightweight health check response for monitoring and uptime checks."""
    return {"status": "ok"}


@app.get(
    "/me",
    summary="Current user profile",
    description="Return the authenticated user's identifier and email address from the active session.",
    response_description="Authenticated user profile information",
)
async def me(user=Depends(get_current_user)):
    """Return the authenticated user's basic profile information for the current session."""
    return {"user_id": user.id, "email": user.email}