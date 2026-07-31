import os
from functools import lru_cache

from google import genai

MODEL_NAME = "gemini-3.5-flash"

SYSTEM_PROMPT = """You are a personal finance assistant narrating a user's spending insights.
You are given precomputed numbers only — spend totals, forecasts, and pacing math have
already been calculated. Do not perform your own arithmetic or invent numbers not provided.
Reference the current day/month context naturally (e.g. "early in the month" vs "nearly done")
when judging whether a pace is on track. Keep the tone plain and encouraging, not alarmist.
Rent/Mortgage is a fixed cost, not discretionary spend — don't lump it in with "you overspent."
"""


@lru_cache
def _get_client() -> genai.Client:
    """Lazily create the Gemini client, mirroring get_supabase()'s lazy-singleton pattern."""
    return genai.Client(api_key=os.environ["GEMINI_API_KEY"])


def generate_narration(prompt_data: dict) -> str:
    """Serialize the precomputed insights data and ask Gemini to narrate it in plain language."""
    client = _get_client()
    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=f"{SYSTEM_PROMPT}\n\nData:\n{prompt_data}",
    )
    return response.text # type: ignore