# Authentication routes for sign-up, sign-in, and sign-out flows.
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from app.services.db import get_supabase

router = APIRouter(prefix="/auth", tags=["auth"])


class AuthRequest(BaseModel):
    """Input payload for authentication endpoints."""
    email: EmailStr
    password: str


@router.post(
    "/signup",
    status_code=status.HTTP_201_CREATED,
    summary="Create account",
    description="Create a new user account using the provided email and password, then send a confirmation prompt through Supabase authentication.",
    response_description="Account created confirmation message",
)
async def signup(body: AuthRequest):
    """Create a new user account through Supabase authentication and return a confirmation message."""
    response = get_supabase().auth.sign_up(
        {"email": body.email, "password": body.password}
    )
    if not response.user:
        raise HTTPException(status_code=400, detail="Signup failed")
    return {"message": "Account created. Check your email to confirm."}


@router.post(
    "/login",
    summary="Sign in",
    description="Authenticate a user with email and password credentials and return a bearer access token for subsequent requests.",
    response_description="Bearer token response",
)
async def login(body: AuthRequest):
    """Authenticate a user and return a bearer token when valid credentials are supplied."""
    response = get_supabase().auth.sign_in_with_password(
        {"email": body.email, "password": body.password}
    )
    if not response.session:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "access_token": response.session.access_token,
        "token_type": "bearer",
    }


@router.post(
    "/logout",
    summary="Sign out",
    description="End the current authenticated session and clear the Supabase auth context for the client.",
    response_description="Logout confirmation",
)
async def logout():
    """Sign the current user out of the Supabase session and return a confirmation message."""
    get_supabase().auth.sign_out()
    return {"message": "Logged out"}