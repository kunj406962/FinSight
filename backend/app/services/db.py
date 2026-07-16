# Shared Supabase client accessors used by the API routers and services.
import os
from functools import lru_cache
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

@lru_cache()
def get_supabase() -> Client:
    """Create and cache a Supabase client using environment configuration."""
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_KEY"]
    return create_client(url, key)