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
from core.tools import append_to_environment
from command import command

setup_logger()
append_to_environment(settings.external_schema_path)


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
