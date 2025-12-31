from typing import Optional
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel
from pydantic import BaseModel
from core import make_partial_model


class UserBase(SQLModel):
    username: str = Field(max_length=32, unique=True)
    email: Optional[str] = Field(max_length=128, default=None)
    name: str = Field(max_length=32)
    root: bool = Field(default=False)


class UserCreate(UserBase):
    password: str = Field(max_length=128)


class UserRead(UserBase):
    id: UUID


UserUpdate = make_partial_model("UserUpdate", UserBase, ["username"])  # type: ignore[valid-type]
UserProfile = make_partial_model("UserProfile", UserBase, ["username", "root"])  # type: ignore[valid-type]


class User(UserBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    password: str = Field(max_length=128)


class JwtToken(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenData(BaseModel):
    user_id: Optional[UUID] = None
    username: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class UserClaims(BaseModel):
    user_id: UUID
    username: str
    root: bool = False
    exp: int
    iat: int
    type: str  # "access" or "refresh"
