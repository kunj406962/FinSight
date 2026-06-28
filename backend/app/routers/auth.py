from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from app.services.db import get_supabase

router = APIRouter(prefix="/auth", tags=["auth"])


class AuthRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(body: AuthRequest):
    response = get_supabase().auth.sign_up(
        {"email": body.email, "password": body.password}
    )
    if not response.user:
        raise HTTPException(status_code=400, detail="Signup failed")
    return {"message": "Account created. Check your email to confirm."}


@router.post("/login")
async def login(body: AuthRequest):
    response = get_supabase().auth.sign_in_with_password(
        {"email": body.email, "password": body.password}
    )
    if not response.session:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "access_token": response.session.access_token,
        "token_type": "bearer",
    }


@router.post("/logout")
async def logout():
    get_supabase().auth.sign_out()
    return {"message": "Logged out"}