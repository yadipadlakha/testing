from typing import Generic, TypeVar

from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from sqlalchemy.sql import Select

T = TypeVar("T")


class PageParams(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=25, ge=1, le=100)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class Pagination(BaseModel):
    page: int
    page_size: int
    total: int


class Page(BaseModel, Generic[T]):
    data: list[T]
    pagination: Pagination


def paginate(db: Session, stmt: Select[tuple[T]], params: PageParams) -> tuple[list[T], Pagination]:
    """Runs a count query and a page query for the given SELECT statement.

    `stmt` should already have ORDER BY applied; this adds LIMIT/OFFSET.
    """
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.execute(stmt.limit(params.page_size).offset(params.offset)).scalars().all()
    return list(rows), Pagination(page=params.page, page_size=params.page_size, total=total)
