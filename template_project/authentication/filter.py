from typing import Optional
from fastapi_filter.contrib.sqlalchemy import Filter
from .schema import User


class UserFilter(Filter):
    username__ilike: Optional[str] = None

    class Constants(Filter.Constants):
        model = User
