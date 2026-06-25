from core.enums.user_enum import UserRole
from pydantic import BaseModel, Field


class AdminUpdateUserRoleRequest(BaseModel):
    role: UserRole


class AdminCreateUserRequest(BaseModel):
    name: str | None = None
    email: str
    role: UserRole = UserRole.USER
    plan_id: int | None = None
    additional_practice_slots: int = Field(default=0, ge=0)


class AdminUpdateUserRequest(BaseModel):
    role: UserRole
    plan_id: int | None = None
    name: str | None = None
    email: str | None = None
    additional_practice_slots: int | None = Field(default=None, ge=0)


class AdminUpdatePlanRequest(BaseModel):
    price: int
    description: str | None = None
    practice_sessions_per_day: int | None = None
    cv_upload_limit: int | None = None
    jd_upload_limit: int | None = None
