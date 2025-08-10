from supabase import create_client, Client  # type: ignore
from django.conf import settings


_client: Client | None = None


def get_supabase_client() -> Client:
    global _client
    if _client is None:
        key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
        _client = create_client(settings.SUPABASE_URL, key)
    return _client


