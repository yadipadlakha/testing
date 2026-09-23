from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, EmailStr

from app.modules.identity.models import Department, PrincipalType


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    email: EmailStr
    full_name: str
    department: Department
    principal_type: PrincipalType
    is_active: bool


class MeResponse(BaseModel):
    user: UserOut
    roles: list[str]
    permissions: list[str]
