import importlib
from pathlib import Path
from fastapi import FastAPI, APIRouter

from .logger import logger
from .settings import settings


def setup_router(app: FastAPI):
    source_path = Path(__file__).parent.parent

    logger.info("Starting to load routers...")

    for module_dir in source_path.iterdir():
        if module_dir.is_dir() and module_dir.name not in ["__pycache__", "core"]:
            router_file = module_dir / "api.py"
            if router_file.exists():
                _load_router(app, f"{module_dir.name}.api", "router")

            auth_file = module_dir / "auth.py"
            if auth_file.exists():
                _load_router(app, f"{module_dir.name}.auth", "auth_router")

    logger.info("All routers loaded successfully.")


def _load_router(app: FastAPI, module_name: str, router_name: str):
    try:
        router_module = importlib.import_module(module_name)
        if hasattr(router_module, router_name):
            router_obj = getattr(router_module, router_name)
            if isinstance(router_obj, APIRouter):
                app.include_router(router=router_obj, prefix=settings.api_prefix)
                logger.info(f"Loaded router from: {module_name}")
    except ImportError as e:
        logger.error(f"Failed to load router from {module_name}: {e}")
