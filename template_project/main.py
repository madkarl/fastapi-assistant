from fastapi import FastAPI
from contextlib import asynccontextmanager
import typer

from core import settings, logger, setup_logger, setup_middleware, setup_router
from command import command

setup_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Application startup...")
    yield
    # Shutdown
    logger.info("Application shutdown...")


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
