"""Composes and sends Supabase auth emails via Gmail's SMTP relay.

Used by the Send Email Hook (app/routers/email_hook.py), which replaces
Supabase's built-in (2/hour, team-only) email sending entirely once enabled
in the Supabase dashboard.
"""
import os
import smtplib
from email.mime.text import MIMEText

SUBJECTS = {
    "signup": "Confirm your email",
    "recovery": "Reset your password",
    "invite": "You've been invited",
    "magiclink": "Your magic link",
    "email_change": "Confirm your email change",
    "reauthentication": "Confirm reauthentication",
}

BODIES = {
    "signup": "Welcome to FinSight! Confirm your email to get started:\n\n{link}",
    "recovery": (
        "Reset your FinSight password:\n\n{link}\n\n"
        "If you didn't request this, you can safely ignore this email."
    ),
    "invite": "You've been invited to FinSight:\n\n{link}",
    "magiclink": "Log in to FinSight:\n\n{link}",
    "email_change": "Confirm your new email address for FinSight:\n\n{link}",
    "reauthentication": "Confirm this action on FinSight:\n\n{link}",
}


def build_verify_link(token_hash: str, email_action_type: str, redirect_to: str) -> str:
    """Build the Supabase-hosted verify link that redeems the token and
    redirects the user back to the frontend afterward.

    Uses our own SUPABASE_URL env var, not the payload's email_data.site_url
    -- that field is the frontend's configured Site URL (used for
    redirect_to), not the Supabase project's API URL. The verify endpoint
    only exists on the actual project URL.
    """
    supabase_url = os.environ["SUPABASE_URL"]
    return (
        f"{supabase_url}/auth/v1/verify"
        f"?token={token_hash}&type={email_action_type}&redirect_to={redirect_to}"
    )


def send_auth_email(to_email: str, email_action_type: str, link: str) -> None:
    """Send a single auth email via Gmail's SMTP relay.

    Known limitation: does not implement the dual-email "Secure Email
    Change" flow (two different OTPs sent to two different addresses with
    swapped token/token_hash field pairs -- see Supabase's Send Email Hook
    docs). FinSight has no email-change feature built, so email_change
    payloads are handled generically here using the primary token/token_hash
    pair only. Revisit this before building email-change support, or a
    change-of-email confirmation could silently go to the wrong address.
    """
    subject = SUBJECTS.get(email_action_type, "Action required")
    body_template = BODIES.get(email_action_type, "Complete this action:\n\n{link}")
    body = body_template.format(link=link)

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = os.environ["GMAIL_ADDRESS"]
    msg["To"] = to_email

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(os.environ["GMAIL_ADDRESS"], os.environ["GMAIL_APP_PASSWORD"])
        server.send_message(msg)