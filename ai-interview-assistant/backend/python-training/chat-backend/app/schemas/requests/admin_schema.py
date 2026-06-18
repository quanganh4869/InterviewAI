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


class AdminUpdatePlanRequest(BaseModel):
    price: int
    description: str | None = None
    practice_sessions_per_day: int | None = None
    cv_upload_limit: int | None = None
    jd_upload_limit: int | None = None
