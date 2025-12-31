from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated, TypeAlias
from .session import get_session
from .schema import PaginationInput

Session: TypeAlias = Annotated[AsyncSession, Depends(get_session)]


def get_pagination_info(page_index: int | None = None, page_size: int | None = None):
    return PaginationInput(
        page_index=page_index if page_index else 1,
        page_size=page_size if page_size else 20,
    )


Pagination = Annotated[PaginationInput, Depends(get_pagination_info)]
