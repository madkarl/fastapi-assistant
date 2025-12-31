from pydantic import BaseModel, create_model
from pydantic.fields import FieldInfo
from sqlmodel import SQLModel
from typing import List, TypeVar, Generic, Optional, Any


class GeneralResponse(BaseModel):
    detail: str


T = TypeVar("T")


class PaginationData(BaseModel, Generic[T]):
    detail: List[T]
    total_count: int
    total_page: int
    page_index: int
    page_size: int
    page_count: int

    model_config = {
        "json_schema_extra": {
            "example": {
                "detail": [],
                "total_count": 0,
                "total_page": 0,
                "page_index": 1,
                "page_size": 20,
                "page_count": 0,
            }
        }
    }


class PaginationInput(BaseModel):
    page_index: int
    page_size: int


def make_partial_model(
    module_name: str, model: type[SQLModel], exclude_fields: list[str] = None
) -> type[BaseModel]:
    exclude_fields = exclude_fields or []
    fields: dict[str, Any] = {
        name: (Optional[field.annotation], FieldInfo(default=None))
        for name, field in model.model_fields.items()
        if name not in exclude_fields
    }
    return create_model(module_name, __base__=(BaseModel,), **fields)
