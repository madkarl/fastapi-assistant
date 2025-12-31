from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi import FastAPI

from .settings import settings
from .logger import logger


def setup_middleware(app: FastAPI):
    logger.info("Starting load middlewares...")

    logger.info("Adding CORS middleware")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_credentials=settings.cors_allow_credentials,
        allow_methods=settings.cors_allow_methods,
        allow_headers=settings.cors_allow_headers,
    )

    logger.info("Adding GZip middleware")
    app.add_middleware(
        GZipMiddleware,
        minimum_size=settings.gzip_minimum_size,
        compresslevel=settings.gzip_compress_level,
    )

    logger.info("All middlewares loaded successfully.")
