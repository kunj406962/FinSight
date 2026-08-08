# Authentication routes for sign-up, sign-in, and sign-out flows.
import logging

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from supabase_auth.errors import AuthError

from app.services.db import get_supabase

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)


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
    try:
        response = get_supabase().auth.sign_up(
            {"email": body.email, "password": body.password}
        )
    except AuthError as e:
        if e.code == "weak_password":
            raise HTTPException(status_code=400, detail=e.message) from e
        if e.code == "user_already_exists":
            logger.warning("Signup attempted for an already-registered email")
            raise HTTPException(
                status_code=409, detail="An account with this email already exists."
            ) from e
        logger.warning(
            "Unhandled Supabase signup error: %s (code=%s)", e.message, e.code
        )
        raise HTTPException(status_code=400, detail="Signup failed.") from e

    if not response.user:
        raise HTTPException(status_code=400, detail="Signup failed.")

    if not response.user.identities:
        # Signup for an email that's already registered and confirmed returns a
        # success-shaped response with no new identity created, no exception
        # raised, and no email sent — Supabase's silent path for this case.
        logger.warning("Signup attempted for an already-registered email")
        raise HTTPException(
            status_code=409, detail="An account with this email already exists."
        )

    return {"message": "Account created. Check your email to confirm."}


@router.post(
    "/login",
    summary="Sign in",
    description="Authenticate a user with email and password credentials and return a bearer access token for subsequent requests.",
    response_description="Bearer token response",
)
async def login(body: AuthRequest):
    """Authenticate a user and return a bearer token when valid credentials are supplied."""
    try:
        response = get_supabase().auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
    except AuthError as e:
        if e.code in ("invalid_credentials", "user_not_found"):
            raise HTTPException(
                status_code=401, detail="Invalid email or password."
            ) from e
        if e.code == "email_not_confirmed":
            raise HTTPException(
                status_code=401,
                detail="Please confirm your email before logging in.",
            ) from e
        logger.warning(
            "Unhandled Supabase login error: %s (code=%s)", e.message, e.code
        )
        raise HTTPException(status_code=401, detail="Login failed.") from e

    if not response.session:
        # Defensive fallback — current SDK behavior raises AuthError above
        # rather than returning a falsy session, but this costs nothing to
        # keep in case that ever changes in a future SDK version.
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
    try:
        get_supabase().auth.sign_out()
    except AuthError as e:
        logger.warning("Supabase logout error: %s (code=%s)", e.message, e.code)
    return {"message": "Logged out"}