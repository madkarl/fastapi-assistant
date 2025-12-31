from pydantic_settings import BaseSettings
from pydantic_core import MultiHostUrl
from pydantic import computed_field


class Settings(BaseSettings):
    # Basic Info
    app_name: str = "${app-name}"
    app_description: str = "${app-description}"
    app_secret: str = "${app-secret}"

    api_version: str = "v1"
    api_prefix: str = "/api"
    debug_mode: bool = True

    # Authentication
    user_uri: str = "/user"
    auth_uri: str = "/auth"
    auth_algorithm: str = "HS256"
    swagger_login_uri: str = "/swagger-login"
    access_token_expire_minutes: int = 30
    refresh_token_expire_minutes: int = 60

    # Documents
    docs_url: str = "/docs"
    redoc_url: str = "/redocs"

    # Database
    db_host: str = "${db-host}"
    db_port: str = "${db-port}"
    db_username: str = "${db-username}"
    db_password: str = "${db-password}"
    db_name: str = "${db-name}"

    @computed_field
    @property
    def database_uri(self) -> MultiHostUrl:
        try:
            port = int(self.db_port)
        except ValueError:
            port = 5432

        return MultiHostUrl.build(
            scheme="postgresql+psycopg",
            username=self.db_username,
            password=self.db_password,
            host=self.db_host,
            port=port,
            path=self.db_name,
        )

    # CORS
    cors_allow_origins: list = ["*"]
    cors_allow_credentials: bool = True
    cors_allow_methods: list = ["*"]
    cors_allow_headers: list = ["*"]

    # GZip
    gzip_minimum_size: int = 2000
    gzip_compress_level: int = 9


settings = Settings()
