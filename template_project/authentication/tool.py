from pwdlib import PasswordHash
from sqlmodel import select
from uuid import UUID
from datetime import datetime, timedelta, timezone
import jwt
from core import settings, Session
from core.exception import NotFoundException, AuthenticationException
from .schema import User, UserClaims, JwtToken


pwd_context = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return pwd_context.hash(password + settings.app_secret)


def verify_password(password: str, hashed_password: str) -> bool:
    return pwd_context.verify(password + settings.app_secret, hashed_password)


async def update_password(
    session: Session, user_id: UUID, old_password: str, new_password: str
):
    item = await session.get(User, user_id)
    if not item:
        raise NotFoundException()

    if not verify_password(old_password, item.password):
        raise AuthenticationException(detail="old password not correct.")
    item.password = hash_password(new_password)
    await session.commit()


def create_jwt_token(user: User):
    access_token = create_token(user, "access", settings.access_token_expire_minutes)
    refresh_token = create_token(user, "refresh", settings.refresh_token_expire_minutes)
    return JwtToken(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
    )


def create_token(user: User, token_type: str, expries_delta_min: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=expries_delta_min)
    to_encode = {
        "user_id": str(user.id),
        "username": user.username,
        "root": user.root,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": token_type,
    }
    encoded_jwt = jwt.encode(
        to_encode, settings.app_secret, algorithm=settings.auth_algorithm
    )
    return encoded_jwt


async def verify_user(username: str, password: str, session: Session) -> User | None:
    statement = select(User).where(User.username == username)
    result = await session.execute(statement)
    user = result.scalar_one_or_none()

    if not user:
        return None
    if not verify_password(password, user.password):
        return None
    return user


def verify_token(token: str, token_type: str) -> UserClaims:
    try:
        payload = jwt.decode(
            token, settings.app_secret, algorithms=[settings.auth_algorithm]
        )
        user_id: str | None = payload.get("user_id")
        username: str | None = payload.get("username")
        token_type_in_payload: str | None = payload.get("type")

        if (
            user_id is None
            or username is None
            or token_type_in_payload is None
            or token_type_in_payload != token_type
        ):
            raise AuthenticationException(detail="Token is invalid.")

        return UserClaims(
            user_id=UUID(user_id),
            username=username,
            root=payload.get("root", False),
            exp=payload.get("exp"),
            iat=payload.get("iat"),
            type=token_type_in_payload,
        )
    except jwt.ExpiredSignatureError:
        raise AuthenticationException(detail="token is expired.")
    except jwt.PyJWTError:
        raise AuthenticationException(detail="token is invalid.")
