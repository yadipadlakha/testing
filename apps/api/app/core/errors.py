"""Domain exceptions and the FastAPI handlers that turn them into the
standard error envelope from docs/API_DESIGN.md §3.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("app.errors")


class AppError(Exception):
    """Base class for all domain/business errors. Raise a subclass, not this directly."""

    code: str = "INTERNAL_ERROR"
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    message: str = "An unexpected error occurred."

    def __init__(
        self, message: str | None = None, details: list[dict[str, Any]] | None = None
    ) -> None:
        super().__init__(message or self.message)
        if message:
            self.message = message
        self.details = details or []


class ValidationAppError(AppError):
    code = "VALIDATION_ERROR"
    status_code = status.HTTP_422_UNPROCESSABLE_CONTENT
    message = "One or more fields are invalid."


class UnauthenticatedError(AppError):
    code = "UNAUTHENTICATED"
    status_code = status.HTTP_401_UNAUTHORIZED
    message = "Authentication is required."


class ForbiddenError(AppError):
    code = "FORBIDDEN"
    status_code = status.HTTP_403_FORBIDDEN
    message = "You do not have permission to perform this action."


class NotFoundError(AppError):
    code = "NOT_FOUND"
    status_code = status.HTTP_404_NOT_FOUND
    message = "The requested resource was not found."


class ConflictError(AppError):
    code = "CONFLICT"
    status_code = status.HTTP_409_CONFLICT
    message = "The request conflicts with the current state of the resource."


def _envelope(
    code: str, message: str, request_id: str, details: list[dict[str, Any]] | None = None
) -> dict[str, Any]:
    error: dict[str, Any] = {"code": code, "message": message, "request_id": request_id}
    if details:
        error["details"] = details
    return {"error": error}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        return JSONResponse(
            status_code=exc.status_code,
            content=_envelope(exc.code, exc.message, request_id, exc.details),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        details = [
            {"field": ".".join(str(p) for p in err["loc"][1:]), "message": err["msg"]}
            for err in exc.errors()
        ]
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content=_envelope(
                "VALIDATION_ERROR", "One or more fields are invalid.", request_id, details
            ),
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_exception(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        code = {401: "UNAUTHENTICATED", 403: "FORBIDDEN", 404: "NOT_FOUND"}.get(
            exc.status_code, "ERROR"
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=_envelope(code, str(exc.detail), request_id),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        logger.exception("Unhandled exception", extra={"request_id": request_id})
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_envelope("INTERNAL_ERROR", "An unexpected error occurred.", request_id),
        )
