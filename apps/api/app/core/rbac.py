"""Authentication + RBAC dependencies shared by every module's router.

Design choice: permissions are re-resolved from the database on every request
(not trusted from stale JWT claims) so that revoking a role/permission takes
effect immediately rather than waiting out the access token's lifetime. The
access token is short-lived (see Settings.access_token_expire_minutes)
specifically so this per-request DB lookup stays cheap and the security
tradeoff stays favorable.
"""

from __future__ import annotations

import uuid
from collections.abc import Callable
from dataclasses import dataclass

import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.errors import ForbiddenError, UnauthenticatedError
from app.core.security import decode_access_token
from app.modules.identity import repository
from app.modules.identity.models import User

_bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class CurrentPrincipal:
    user: User
    roles: list[str]
    permissions: set[str]


def get_current_principal(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> CurrentPrincipal:
    if credentials is None:
        raise UnauthenticatedError("Missing bearer token.")

    try:
        payload = decode_access_token(credentials.credentials)
    except jwt.PyJWTError as exc:
        raise UnauthenticatedError("Invalid or expired access token.") from exc

    user_id = uuid.UUID(payload["sub"])
    user = repository.get_user_by_id(db, user_id)
    if user is None or not user.is_active:
        raise UnauthenticatedError("Invalid or expired access token.")

    roles, permissions = repository.get_effective_permissions(db, user.id)
    principal = CurrentPrincipal(user=user, roles=[r.name for r in roles], permissions=permissions)
    request.state.current_principal = principal
    return principal


def require_permission(permission_code: str) -> Callable[..., CurrentPrincipal]:
    """FastAPI dependency factory: `Depends(require_permission("sales.quotation:approve"))`."""

    def _dependency(
        principal: CurrentPrincipal = Depends(get_current_principal),
    ) -> CurrentPrincipal:
        if permission_code not in principal.permissions:
            raise ForbiddenError(f"Missing required permission: {permission_code}")
        return principal

    return _dependency
