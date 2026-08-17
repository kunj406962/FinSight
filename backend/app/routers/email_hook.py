"""Receives Supabase's Send Email Hook webhook and sends auth emails
ourselves via Gmail SMTP, replacing Supabase's built-in email sending.

This endpoint is called server-to-server by Supabase, not by our own
frontend -- there is no user JWT on these requests, so it deliberately does
NOT use get_current_user. It's protected by webhook signature verification
instead (see SEND_EMAIL_HOOK_SECRET).
"""
import logging
import os

from fastapi import APIRouter, HTTPException, Request, status
from standardwebhooks.webhooks import Webhook, WebhookVerificationError

from app.services.email_sender import build_verify_link, send_auth_email

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)


@router.post(
    "/email-hook",
    status_code=status.HTTP_200_OK,
    summary="Supabase Send Email Hook receiver",
    description="Receives Supabase's signed webhook for outgoing auth emails and sends them via our own SMTP relay instead of Supabase's built-in (rate-limited, team-only) sender.",
    response_description="Empty response on success",
)
async def email_hook(request: Request):
    """Verify the incoming webhook signature, then send the appropriate
    auth email via our own SMTP relay. Supabase treats any 2xx response
    as success and requires no response body."""
    raw_body = await request.body()
    secret = os.environ["SEND_EMAIL_HOOK_SECRET"].replace("v1,whsec_", "")

    try:
        payload = Webhook(secret).verify(raw_body, dict(request.headers))
    except WebhookVerificationError as e:
        logger.warning("Send Email Hook signature verification failed: %s", e)
        raise HTTPException(status_code=401, detail="Invalid webhook signature") from e

    user = payload["user"]
    email_data = payload["email_data"]

    link = build_verify_link(
        token_hash=email_data["token_hash"],
        email_action_type=email_data["email_action_type"],
        redirect_to=email_data["redirect_to"],
    )

    try:
        send_auth_email(
            to_email=user["email"],
            email_action_type=email_data["email_action_type"],
            link=link,
        )
    except Exception as e:
        # Genuinely broad on purpose: smtplib can raise several distinct
        # exception types (auth failure, connection refused, etc.) and any
        # of them means the email didn't go out -- Supabase should see a
        # non-2xx either way. Logged clearly so it's never silently swallowed.
        logger.error("Failed to send auth email via SMTP: %s", e)
        raise HTTPException(status_code=500, detail="Email send failed") from e

    return {}