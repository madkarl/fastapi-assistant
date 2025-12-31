from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlmodel import create_engine, Session
from typing import AsyncGenerator
from .settings import settings


engine = create_async_engine(str(settings.database_uri), echo=settings.debug_mode)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session


def get_session_sync(echo: bool = False) -> Session:
    engine = create_engine(str(settings.database_uri), echo=echo)
    return Session(engine)
