from fastapi import APIRouter, Depends
from fastapi_filter import FilterDepends
from uuid import UUID
from core import (
    settings,
    Session,
    Pagination,
    PaginationData,
    QueryService,
    GeneralResponse,
)
from core.exception import BadRequestException, PermissionDeniedException
from .schema import User, UserCreate, UserRead, UserUpdate, UserProfile, UserClaims
from .filter import UserFilter
from .tool import hash_password, verify_password, update_password
from .dependency import GetUserInfo, get_root_info

router = APIRouter(prefix=settings.user_uri, tags=["user"])


@router.post("/")
async def create_user(session: Session, user_in: UserCreate) -> UserRead:
    """Create a new user.

    Returns:
        UserRead: User Information
    """
    user_data = user_in.model_dump()
    user_data["password"] = hash_password(user_in.password)
    user_create = UserCreate.model_validate(user_data)
    user_create.root = False
    return await QueryService[UserCreate](session, User).create(user_create)


@router.get("/profile")
async def get_user(session: Session, user_info: GetUserInfo) -> UserRead:
    """Get current user's profile.

    Returns:
        UserRead: User Profile
    """
    return await QueryService[UserRead](session, User).read(user_info.user_id)


@router.post("/update-password")
async def change_password(
    session: Session, old_password: str, new_password: str, user_info: GetUserInfo
) -> GeneralResponse:
    """Change user's password.

    Args:
        old_password (str): Old Password
        new_password (str): New Password

    Returns:
        GeneralResponse: Change Result
    """
    await update_password(session, user_info.user_id, old_password, new_password)
    return GeneralResponse(message="Password changed successfully.")


@router.get("/{user_id}", dependencies=[Depends(get_root_info)])
async def get_user(session: Session, user_id: UUID) -> UserRead:
    if user_info.user_id == user_id or user_info.root:
        return await QueryService[UserRead](session, User).read(user_id)
    raise PermissionDeniedException()


@router.get("/", dependencies=[Depends(get_root_info)])
async def get_users(
    session: Session,
    page_info: Pagination,
    filter: UserFilter = FilterDepends(UserFilter),
) -> PaginationData[UserRead]:
    """List all users.

    Returns:
        PaginationData[UserRead]: User List
    """
    return await QueryService[UserRead](session, User).list(page_info, filter)


@router.put("/update-profile")
async def update_profile(
    session: Session, user_in: UserProfile, user_info: GetUserInfo
) -> UserRead:
    return await QueryService[UserProfile](session, User).update(
        user_info.user_id, user_in
    )


@router.put("/{user_id}", dependencies=[Depends(get_root_info)])
async def update_user(session: Session, user_id: UUID, user_in: UserUpdate) -> UserRead:
    return await QueryService[UserUpdate](session, User).update(user_id, user_in)


@router.delete("/{user_id}", dependencies=[Depends(get_root_info)])
async def delete_user(session: Session, user_id: UUID) -> GeneralResponse:
    return await QueryService[UserRead](session, User).delete(user_id)
