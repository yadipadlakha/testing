import uuid

import pytest

from app.core.errors import ForbiddenError
from app.core.rbac import CurrentPrincipal, require_permission
from app.modules.identity.models import Department, PrincipalType, User


def _principal(permissions: set[str]) -> CurrentPrincipal:
    user = User(
        id=uuid.uuid4(),
        organization_id=uuid.uuid4(),
        email="test@test.dev",
        password_hash="x",
        full_name="Test User",
        department=Department.SALES,
        principal_type=PrincipalType.INTERNAL,
        is_active=True,
    )
    return CurrentPrincipal(user=user, roles=["Sales"], permissions=permissions)


def test_require_permission_allows_when_present():
    dependency = require_permission("crm.lead:write")
    principal = _principal({"crm.lead:write", "crm.lead:read"})

    result = dependency(principal)

    assert result is principal


def test_require_permission_denies_when_missing():
    dependency = require_permission("finance.invoice:write")
    principal = _principal({"crm.lead:read"})

    with pytest.raises(ForbiddenError):
        dependency(principal)
