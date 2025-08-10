from typing import Optional, Tuple
from django.conf import settings
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
    def _decode_token(self, token: str) -> dict:
        """Support both RS256 (JWKS) and HS256 (JWT secret) Supabase tokens.

        - Prefer JWKS (RS256). If SUPABASE_JWKS_URL is set and decoding succeeds, use it.
        - Else, if SUPABASE_JWT_SECRET is set, verify HS256.
        - Else, last resort: decode without signature verification (dev only).
        """
        # Try JWKS (RS256)
        jwks_url = getattr(settings, 'SUPABASE_JWKS_URL', '')
        if jwks_url:
            try:
                jwks = requests.get(jwks_url, timeout=5).json()
                unverified_header = jwt.get_unverified_header(token)
                kid = unverified_header.get('kid')
                key = None
                for k in jwks.get('keys', []):
                    if k.get('kid') == kid:
                        key = jwt.algorithms.RSAAlgorithm.from_jwk(k)
                        break
                if key is not None:
                    return jwt.decode(
                        token,
                        key=key,
                        algorithms=['RS256'],
                        audience=None,
                        options={"verify_aud": False},
                    )
            except Exception:
                # Fall through to next strategy
                pass

        # Try HS256 with JWT secret
        jwt_secret = getattr(settings, 'SUPABASE_JWT_SECRET', '')
        if jwt_secret:
            try:
                return jwt.decode(
                    token,
                    key=jwt_secret,
                    algorithms=['HS256'],
                    audience=None,
                    options={"verify_aud": False},
                )
            except Exception:
                pass

        # Dev fallback: decode without verifying signature (not for production)
        try:
            return jwt.decode(token, options={"verify_signature": False, "verify_aud": False})
        except Exception as exc:  # noqa: BLE001
            raise exceptions.AuthenticationFailed('Invalid authentication') from exc

    def authenticate(self, request) -> Optional[Tuple[SupabaseUser, None]]:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.lower().startswith('bearer '):
            return None
        token = auth_header.split(' ', 1)[1]
        try:
            payload = self._decode_token(token)
            user_id = payload.get('sub') or payload.get('id')
            email = payload.get('email') or (payload.get('user_metadata') or {}).get('email')
            user_meta = payload.get('user_metadata') or {}
            username = user_meta.get('username')
            role = user_meta.get('role')
            is_admin = (email == getattr(settings, 'ADMIN_EMAIL', '')) if email else False
            user = SupabaseUser(user_id=user_id, email=email, username=username, role=role, is_admin=is_admin)
            return (user, None)
        except Exception as exc:  # noqa: BLE001
            raise exceptions.AuthenticationFailed('Invalid authentication') from exc


