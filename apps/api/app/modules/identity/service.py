from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.core import security
from app.core.config import get_settings
from app.core.errors import UnauthenticatedError
from app.modules.identity import repository
from app.modules.identity.models import AuditLog, User


def authenticate_user(db: Session, *, email: str, password: str) -> User:
    user = repository.get_user_by_email(db, email)
    if user is None or not user.is_active:
        raise UnauthenticatedError("Invalid email or password.")
    if not security.verify_password(password, user.password_hash):
        raise UnauthenticatedError("Invalid email or password.")
    return user


def record_audit(
    db: Session,
    *,
    organization_id: uuid.UUID,
    actor_user_id: uuid.UUID | None,
    action: str,
    entity_type: str,
    entity_id: str,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
    ip_address: str | None = None,
) -> None:
    db.add(
        AuditLog(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            before=before,
            after=after,
            ip_address=ip_address,
        )
    )


def issue_tokens(
    db: Session, *, user: User, user_agent: str | None = None, ip_address: str | None = None
) -> tuple[str, str, int]:
    """Returns (access_token, refresh_token_value, access_token_expires_in_seconds)."""
    settings = get_settings()
    roles = repository.get_user_roles(db, user.id)
    access_token = security.create_access_token(
        user_id=user.id,
        organization_id=user.organization_id,
        roles=[role.name for role in roles],
        principal_type=str(user.principal_type),
    )

    refresh_value = security.create_refresh_token_value()
    repository.create_refresh_token(
        db,
        user_id=user.id,
        token_hash=security.hash_token(refresh_value),
        expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days),
        user_agent=user_agent,
        ip_address=ip_address,
    )

    user.last_login_at = datetime.now(UTC)
    db.add(user)

    record_audit(
        db,
        organization_id=user.organization_id,
        actor_user_id=user.id,
        action="login",
        entity_type="user",
        entity_id=str(user.id),
        ip_address=ip_address,
    )

    return access_token, refresh_value, settings.access_token_expire_minutes * 60


def refresh_access_token(
    db: Session,
    *,
    refresh_token_value: str,
    user_agent: str | None = None,
    ip_address: str | None = None,
) -> tuple[str, str, int]:
    token = repository.get_refresh_token_by_hash(db, security.hash_token(refresh_token_value))
    now = datetime.now(UTC)
    if token is None or token.revoked_at is not None or token.expires_at < now:
        raise UnauthenticatedError("Refresh token is invalid or expired.")

    user = repository.get_user_by_id(db, token.user_id)
    if user is None or not user.is_active:
        raise UnauthenticatedError("Refresh token is invalid or expired.")

    # Rotate: revoke the used token and issue a brand new pair.
    repository.revoke_refresh_token(db, token, at=now)
    return issue_tokens(db, user=user, user_agent=user_agent, ip_address=ip_address)


def logout(db: Session, *, refresh_token_value: str) -> None:
    token = repository.get_refresh_token_by_hash(db, security.hash_token(refresh_token_value))
    if token is not None and token.revoked_at is None:
        repository.revoke_refresh_token(db, token, at=datetime.now(UTC))
