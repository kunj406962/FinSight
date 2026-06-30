from fastapi import FastAPI, Depends
from app.routers import auth
from app.routers import accounts
from app.auth.dependencies import get_current_user

app = FastAPI(title="FinSight API")

app.include_router(auth.router)
app.include_router(accounts.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/me")
async def me(user=Depends(get_current_user)):
    return {"user_id": user.id, "email": user.email}