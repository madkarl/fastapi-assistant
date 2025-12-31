from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from typing import Annotated
from core import settings, Session, QueryService
from core.exception import AuthenticationException
from .schema import JwtToken, LoginRequest, RefreshRequest, UserRead, User
from .tool import create_jwt_token, verify_user, verify_token

auth_router = APIRouter(prefix=settings.auth_uri, tags=["login"])


async def check_login(session: Session, username: str, password: str):
    user = await verify_user(username, password, session)
    if not user:
        raise AuthenticationException(detail="Username or password is incorrect.")

    return create_jwt_token(user)


@auth_router.post(settings.swagger_login_uri, response_model=JwtToken)
async def login_swagger(
    session: Session, form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
) -> JwtToken:
    return await check_login(session, form_data.username, form_data.password)


@auth_router.post("/login", response_model=JwtToken)
async def login(session: Session, login_data: LoginRequest) -> JwtToken:
    return await check_login(session, login_data.username, login_data.password)


@auth_router.post("/refresh", response_model=JwtToken)
async def refresh_token(session: Session, refresh_data: RefreshRequest) -> JwtToken:
    claims = verify_token(refresh_data.refresh_token, "refresh")

    service = QueryService[UserRead](session, User)
    user = await service.get(claims.user_id)
    if not user:
        raise AuthenticationException(detail="Token is incorrect.")

    return create_jwt_token(user)
