from fastapi import APIRouter, Depends
from fastapi_filter import FilterDepends
from uuid import UUID
from core import QueryService, Session, Pagination, PaginationData, GeneralResponse
from authentication import get_user_info, get_root_info


router = APIRouter(prefix=f"/${module-name}", tags=["${module-name}"])
