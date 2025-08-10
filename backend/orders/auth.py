from typing import Optional, Tuple
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from rest_framework.authentication import BaseAuthentication
from rest_framework import exceptions
import jwt
import requests


class SupabaseUser:
    def __init__(self, user_id: str, email: str, username: Optional[str], role: Optional[str], is_admin: bool):
        self.id = user_id
        self.email = email
        self.username = username
        self.role = role
        self.is_admin = is_admin

    @property
    def is_authenticated(self) -> bool:  # type: ignore[override]
        return True


class SupabaseJWTAuthentication(BaseAuthentication):
    def authenticate(self, request) -> Optional[Tuple[SupabaseUser, None]]:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.lower().startswith('bearer '):
            return None
        token = auth_header.split(' ', 1)[1]
        try:
            jwks_url = settings.SUPABASE_JWKS_URL
            jwks = requests.get(jwks_url, timeout=5).json()
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header.get('kid')
            key = None
            for k in jwks.get('keys', []):
                if k.get('kid') == kid:
                    key = jwt.algorithms.RSAAlgorithm.from_jwk(k)
                    break
            if key is None:
                raise exceptions.AuthenticationFailed('Invalid token')
            payload = jwt.decode(token, key=key, algorithms=['RS256'], audience=None, options={"verify_aud": False})
            user_id = payload.get('sub')
            email = payload.get('email') or payload.get('user_metadata', {}).get('email')
            user_meta = payload.get('user_metadata') or {}
            app_meta = payload.get('app_metadata') or {}
            username = user_meta.get('username')
            role = user_meta.get('role')
            is_admin = (email == settings.ADMIN_EMAIL) if email else False
            user = SupabaseUser(user_id=user_id, email=email, username=username, role=role, is_admin=is_admin)
            return (user, None)
        except Exception as exc:  # noqa: BLE001
            raise exceptions.AuthenticationFailed('Invalid authentication') from exc


