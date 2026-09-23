from __future__ import annotations

import hashlib
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import bcrypt
import jwt

from app.core.config import get_settings

TokenType = Literal["access", "refresh"]


def hash_password(plain_password: str) -> str:
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), password_hash.encode("utf-8"))


def create_access_token(
    *,
    user_id: uuid.UUID,
    organization_id: uuid.UUID,
    roles: list[str],
    principal_type: str = "INTERNAL",
    audience: str = "internal-app",
) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "org": str(organization_id),
        "roles": roles,
        "principal_type": principal_type,
        "aud": audience,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token_value() -> str:
    """The refresh token handed to the client is an opaque random value; only its
    hash is stored (app.modules.identity.models.RefreshToken.token_hash), so a DB
    leak alone can't be used to forge a session.
    """
    return uuid.uuid4().hex + uuid.uuid4().hex


def hash_token(token_value: str) -> str:
    """Deterministic hash for opaque lookup tokens (refresh tokens). Not for
    passwords — those use bcrypt via hash_password/verify_password above.
    """
    return hashlib.sha256(token_value.encode("utf-8")).hexdigest()


def decode_access_token(token: str, *, audience: str = "internal-app") -> dict[str, Any]:
    settings = get_settings()
    return jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
        audience=audience,
    )
