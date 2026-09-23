from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.modules.identity.models import (
    Permission,
    RefreshToken,
    Role,
    RolePermission,
    User,
    UserRole,
)


def get_user_by_email(db: Session, email: str) -> User | None:
    stmt = select(User).where(User.email == email.lower())
    return db.execute(stmt).scalar_one_or_none()


def get_user_by_id(db: Session, user_id: uuid.UUID) -> User | None:
    return db.get(User, user_id)


def get_user_roles(db: Session, user_id: uuid.UUID) -> list[Role]:
    stmt = (
        select(Role).join(UserRole, UserRole.role_id == Role.id).where(UserRole.user_id == user_id)
    )
    return list(db.execute(stmt).scalars().all())


def get_permissions_for_roles(db: Session, role_ids: list[uuid.UUID]) -> set[str]:
    if not role_ids:
        return set()
    stmt = (
        select(Permission.code)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .where(RolePermission.role_id.in_(role_ids))
    )
    return set(db.execute(stmt).scalars().all())


def get_effective_permissions(db: Session, user_id: uuid.UUID) -> tuple[list[Role], set[str]]:
    roles = get_user_roles(db, user_id)
    permissions = get_permissions_for_roles(db, [role.id for role in roles])
    return roles, permissions


def create_refresh_token(
    db: Session,
    *,
    user_id: uuid.UUID,
    token_hash: str,
    expires_at: datetime,
    user_agent: str | None,
    ip_address: str | None,
) -> RefreshToken:
    token = RefreshToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
        user_agent=user_agent,
        ip_address=ip_address,
    )
    db.add(token)
    db.flush()
    return token


def get_refresh_token_by_hash(db: Session, token_hash: str) -> RefreshToken | None:
    stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    return db.execute(stmt).scalar_one_or_none()


def revoke_refresh_token(db: Session, token: RefreshToken, *, at: datetime) -> None:
    token.revoked_at = at
    db.add(token)


def eager_user_with_roles(db: Session, user_id: uuid.UUID) -> User | None:
    stmt = (
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.user_roles).selectinload(UserRole.role))
    )
    return db.execute(stmt).scalar_one_or_none()
