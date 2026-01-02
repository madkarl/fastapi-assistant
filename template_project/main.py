from fastapi import FastAPI
from contextlib import asynccontextmanager
import typer

from core import (
    settings,
    logger,
    setup_logger,
    setup_middleware,
    setup_router,
    task_broker,
)
from command import command

setup_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Application startup...")
    await task_broker.startup()
    yield
    logger.info("Application shutdown...")
    await task_broker.shutdown()


app = FastAPI(
    title=settings.app_name,
    description=settings.app_description,
    lifespan=lifespan,
    debug=settings.debug_mode,
    docs_url=settings.docs_url,
    redoc_url=settings.redoc_url,
)
setup_middleware(app)
setup_router(app)


if __name__ == "__main__":
    command()
