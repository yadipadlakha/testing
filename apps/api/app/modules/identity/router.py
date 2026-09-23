from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import get_db
from app.core.errors import UnauthenticatedError
from app.core.rbac import CurrentPrincipal, get_current_principal
from app.modules.identity import service
from app.modules.identity.schemas import LoginRequest, MeResponse, TokenResponse, UserOut

router = APIRouter(tags=["identity"])

REFRESH_COOKIE_NAME = "refresh_token"


def _set_refresh_cookie(response: Response, value: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=value,
        httponly=True,
        secure=settings.environment == "production",
        samesite="lax",
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        path="/",
    )


@router.post("/auth/login", response_model=TokenResponse)
def login(
    body: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)
) -> TokenResponse:
    user = service.authenticate_user(db, email=body.email, password=body.password)
    access_token, refresh_value, expires_in = service.issue_tokens(
        db,
        user=user,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    db.commit()

    _set_refresh_cookie(response, refresh_value)
    return TokenResponse(access_token=access_token, expires_in=expires_in)


@router.post("/auth/refresh", response_model=TokenResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)) -> TokenResponse:
    refresh_value = request.cookies.get(REFRESH_COOKIE_NAME)
    if not refresh_value:
        raise UnauthenticatedError("Missing refresh token.")

    access_token, new_refresh_value, expires_in = service.refresh_access_token(
        db,
        refresh_token_value=refresh_value,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    db.commit()

    _set_refresh_cookie(response, new_refresh_value)
    return TokenResponse(access_token=access_token, expires_in=expires_in)


@router.post("/auth/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> None:
    refresh_value = request.cookies.get(REFRESH_COOKIE_NAME)
    if refresh_value:
        service.logout(db, refresh_token_value=refresh_value)
        db.commit()
    response.delete_cookie(REFRESH_COOKIE_NAME, path="/")


@router.get("/me", response_model=MeResponse)
def me(principal: CurrentPrincipal = Depends(get_current_principal)) -> MeResponse:
    return MeResponse(
        user=UserOut.model_validate(principal.user),
        roles=principal.roles,
        permissions=sorted(principal.permissions),
    )
