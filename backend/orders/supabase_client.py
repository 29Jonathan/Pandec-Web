from supabase import create_client, Client  # type: ignore
from django.conf import settings


_client: Client | None = None


def get_supabase_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    return _client


