from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from typing import Annotated
from core import settings
from core.exception import AuthenticationException, PermissionDeniedException
from .schema import UserClaims
from .tool import verify_token

security = OAuth2PasswordBearer(
    tokenUrl=f"{settings.api_prefix}{settings.auth_uri}{settings.swagger_login_uri}"
)


def get_user_info(
    token: Annotated[str, Depends(security)],
) -> UserClaims:
    """
    Get user information and verify jwt token
    """
    try:
        user_claims = verify_token(token, "access")
        return user_claims
    except (InvalidTokenException, TokenExpiredException) as e:
        raise e
    except Exception:
        raise AuthenticationException()


def get_root_info(
    current_user: Annotated[UserClaims, Depends(get_user_info)],
) -> UserClaims:
    """
    Get user information, check if current root user and verify jwt token
    """
    if not current_user.root:
        raise PermissionDeniedException("Require root user.")
    return current_user


GetUserInfo = Annotated[UserClaims, Depends(get_user_info)]
GetRootInfo = Annotated[UserClaims, Depends(get_root_info)]
