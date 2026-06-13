from core.enums.user_enum import UserRole
from pydantic import BaseModel


class AdminUpdateUserRoleRequest(BaseModel):
    role: UserRole


class AdminCreateUserRequest(BaseModel):
    name: str | None = None
    email: str
    role: UserRole = UserRole.USER
    plan_id: int | None = None
    additional_practice_slots: int = 0


class AdminUpdateUserRequest(BaseModel):
    role: UserRole
    plan_id: int | None = None
    name: str | None = None
    email: str | None = None
    additional_practice_slots: int | None = None

