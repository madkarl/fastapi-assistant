from sqlmodel import SQLModel, select, func
from fastapi_filter.contrib.sqlalchemy import Filter
import math
from core.exception import NotFoundException
from .schema import PaginationData, PaginationInput, GeneralResponse
from .dependency import Session


class QueryService[T]:
    def __init__(self, session: Session, model: SQLModel):
        self._session = session
        self._model = model

    async def create(self, item_in: T):
        item = self._model(**item_in.dict())
        self._session.add(item)
        await self._session.commit()
        await self._session.refresh(item)
        return item

    async def read(self, item_id):
        item = await self._session.get(self._model, item_id)
        if not item:
            raise NotFoundException()
        return item

    async def list(self, page: PaginationInput, filter: Filter) -> PaginationData[T]:
        base_statement = filter.filter(select(self._model))
        count_statement = select(func.count()).select_from(base_statement.subquery())

        result = await self._session.execute(count_statement)
        total_count = result.one()[0]

        skip = (page.page_index - 1) * page.page_size
        limit = page.page_size
        items = await self._session.execute(base_statement.offset(skip).limit(limit))

        items = items.all()
        items = [item[0] for item in items]
        return PaginationData[T](
            detail=items,
            total_count=total_count,
            total_page=math.ceil(total_count / page.page_size),
            page_index=page.page_index,
            page_size=page.page_size,
            page_count=len(items),
        )

    async def list_all(self):
        items = await self._session.exec(self._model.select())
        return items.all()

    async def update(self, item_id, item_in: T):
        item = await self._session.get(self._model, item_id)
        if not item:
            raise NotFoundException()
        item_data = item_in.model_dump(exclude_unset=True)
        for field, value in item_data.items():
            setattr(item, field, value)
        await self._session.commit()
        await self._session.refresh(item)
        return item

    async def delete(self, item_id) -> GeneralResponse:
        item = await self._session.get(self._model, item_id)
        if not item:
            raise NotFoundException()
        await self._session.delete(item)
        await self._session.commit()
        return GeneralResponse(detail="Delete successfully.")
