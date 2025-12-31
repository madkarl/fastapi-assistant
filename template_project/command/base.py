import typer
from core import settings
from .migrate import migrate_database
from .create_root_user import create_root_user

command = typer.Typer(help=f"{settings.app_name} command line tool")


@command.command(help="Start FastAPI application with Uvicorn")
def serve(
    host: str = typer.Argument(default="127.0.0.1", help="Host address"),
    port: int = typer.Argument(default=9000, help="Port number"),
):
    import uvicorn

    uvicorn.run("main:app", host=host, port=port, reload=True)


@command.command(help="Auto-detect all schemas and migrate database")
def migrate(
    message: str = typer.Argument(
        default="Automatically generated.", help="Migration message"
    )
):
    migrate_database(message)


@command.command(help="Create root user")
def root_user():
    create_root_user()
