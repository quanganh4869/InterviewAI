from typing import Annotated

from configuration.logger.config import log
from core.common.api_response import ApiResponse
from core.decorators.api_version import version as api_version
from core.decorators.log_time import measure_time
from core.dependencies.rbac import require_role
from core.enums.user_enum import UserRole
from core.exception_handler.custom_exception import ExceptionValueError
from db.db_connection import Database
from db.models.users import User
from fastapi import APIRouter, Depends, Query, Security
from fastapi.security import HTTPBearer
from schemas.requests.admin_schema import (
    AdminUpdateUserRoleRequest,
    AdminCreateUserRequest,
    AdminUpdatePlanRequest,
    AdminUpdateUserRequest,
)
from services.admin_user_service import AdminUserService
from services.plan_service import PlanService
from sqlalchemy.ext.asyncio import AsyncSession

bearer_scheme = HTTPBearer(auto_error=False)
router = APIRouter(dependencies=[Security(bearer_scheme)])

DBSessionDep = Annotated[AsyncSession, Depends(Database.get_async_db_session)]
AdminDep = Annotated[User, Depends(require_role([UserRole.ADMIN]))]


def get_admin_user_service(db_session: DBSessionDep) -> AdminUserService:
    return AdminUserService(db_session)


AdminUserServiceDep = Annotated[AdminUserService, Depends(get_admin_user_service)]


def get_plan_service(db_session: DBSessionDep) -> PlanService:
    return PlanService(db_session)


PlanServiceDep = Annotated[PlanService, Depends(get_plan_service)]


@router.get("/users")
@api_version(1, 0)
@measure_time
async def list_users(
    _: AdminDep,
    service: AdminUserServiceDep,
    role: UserRole | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    page_data = await service.list_users(
        role=role,
        search=search,
        page=page,
        page_size=page_size,
    )
    return ApiResponse.success(data=page_data.model_dump(mode="json"))


@router.get("/statistics")
@api_version(1, 0)
@measure_time
async def get_statistics(
    _: AdminDep,
    service: AdminUserServiceDep,
):
    try:
        stats = await service.get_statistics()
        return ApiResponse.success(data=stats)
    except ExceptionValueError as e:
        return ApiResponse.error(
            message=e.message,
            message_code=e.message_code,
            status_code=e.status_code,
        )


@router.get("/plans")
@api_version(1, 0)
@measure_time
async def list_admin_plans(
    _: AdminDep,
    service: PlanServiceDep,
):
    plans = await service.list_plans()
    return ApiResponse.success(data=[plan.model_dump() for plan in plans])


@router.patch("/plans/{plan_id}")
@api_version(1, 0)
@measure_time
async def update_admin_plan(
    plan_id: int,
    payload: AdminUpdatePlanRequest,
    _: AdminDep,
    service: PlanServiceDep,
):
    try:
        plan = await service.update_plan(
            plan_id=plan_id,
            price=payload.price,
            description=payload.description,
            practice_sessions_per_day=payload.practice_sessions_per_day,
            cv_upload_limit=payload.cv_upload_limit,
            jd_upload_limit=payload.jd_upload_limit,
        )
        return ApiResponse.success(
            data=plan.model_dump(),
            message="Plan updated successfully",
        )
    except ExceptionValueError as e:
        return ApiResponse.error(
            message=e.message,
            message_code=e.message_code,
            status_code=e.status_code,
        )


@router.post("/users")
@api_version(1, 0)
@measure_time
async def create_user(
    payload: AdminCreateUserRequest,
    _: AdminDep,
    service: AdminUserServiceDep,
):
    try:
        user = await service.create_user(
            name=payload.name,
            email=payload.email,
            role=payload.role,
            plan_id=payload.plan_id,
            additional_practice_slots=payload.additional_practice_slots,
        )
        return ApiResponse.success(
            data=user.model_dump(mode="json"),
            message="User created successfully",
        )
    except ExceptionValueError as e:
        return ApiResponse.error(
            message=e.message,
            message_code=e.message_code,
            status_code=e.status_code,
        )


@router.patch("/users/{user_id}/role")
@api_version(1, 0)
@measure_time
async def update_user_role(
    user_id: int,
    payload: AdminUpdateUserRoleRequest,
    _: AdminDep,
    service: AdminUserServiceDep,
):
    try:
        user = await service.update_user_role(user_id=user_id, role=payload.role)
        return ApiResponse.success(
            data=user.model_dump(mode="json"),
            message="User role updated successfully",
        )
    except ExceptionValueError as e:
        log.error("Failed to update user role: %s", e.message)
        return ApiResponse.error(
            message=e.message,
            message_code=e.message_code,
            status_code=e.status_code,
        )


@router.patch("/users/{user_id}")
@api_version(1, 0)
@measure_time
async def update_user(
    user_id: int,
    payload: AdminUpdateUserRequest,
    _: AdminDep,
    service: AdminUserServiceDep,
):
    try:
        user = await service.update_user(
            user_id=user_id,
            role=payload.role,
            plan_id=payload.plan_id,
            name=payload.name,
            email=payload.email,
            additional_practice_slots=payload.additional_practice_slots,
        )

        return ApiResponse.success(
            data=user.model_dump(mode="json"),
            message="User updated successfully",
        )
    except ExceptionValueError as e:
        return ApiResponse.error(
            message=e.message,
            message_code=e.message_code,
            status_code=e.status_code,
        )


@router.delete("/users/{user_id}")
@api_version(1, 0)
@measure_time
async def delete_user(
    user_id: int,
    _: AdminDep,
    service: AdminUserServiceDep,
):
    try:
        await service.delete_user(user_id=user_id)
        return ApiResponse.success(
            data=None,
            message="User deleted successfully",
        )
    except ExceptionValueError as e:
        return ApiResponse.error(
            message=e.message,
            message_code=e.message_code,
            status_code=e.status_code,
        )


@router.get("/documents")
@api_version(1, 0)
@measure_time
async def list_all_documents(
    _: AdminDep,
    service: AdminUserServiceDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    try:
        data = await service.list_all_documents(page=page, page_size=page_size)
        return ApiResponse.success(data=data)
    except ExceptionValueError as e:
        return ApiResponse.error(
            message=e.message,
            message_code=e.message_code,
            status_code=e.status_code,
        )


@router.get("/interviews")
@api_version(1, 0)
@measure_time
async def list_all_interviews(
    _: AdminDep,
    service: AdminUserServiceDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    try:
        data = await service.list_all_interviews(page=page, page_size=page_size)
        return ApiResponse.success(data=data)
    except ExceptionValueError as e:
        return ApiResponse.error(
            message=e.message,
            message_code=e.message_code,
            status_code=e.status_code,
        )


@router.get("/matches")
@api_version(1, 0)
@measure_time
async def list_all_matches(
    _: AdminDep,
    service: AdminUserServiceDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    try:
        data = await service.list_all_matches(page=page, page_size=page_size)
        return ApiResponse.success(data=data)
    except ExceptionValueError as e:
        return ApiResponse.error(
            message=e.message,
            message_code=e.message_code,
            status_code=e.status_code,
        )


@router.delete("/matches/{analysis_id}")
@api_version(1, 0)
@measure_time
async def delete_match_report(
    analysis_id: int,
    _: AdminDep,
    service: AdminUserServiceDep,
):
    try:
        await service.delete_match_report(analysis_id=analysis_id)
        return ApiResponse.success(
            data=None,
            message="Match report deleted successfully",
        )
    except ExceptionValueError as e:
        return ApiResponse.error(
            message=e.message,
            message_code=e.message_code,
            status_code=e.status_code,
        )


@router.get("/users/{user_id}/details")
@api_version(1, 0)
@measure_time
async def get_user_details(
    user_id: int,
    _: AdminDep,
    service: AdminUserServiceDep,
):
    try:
        data = await service.get_user_details(user_id=user_id)
        return ApiResponse.success(data=data)
    except ExceptionValueError as e:
        return ApiResponse.error(
            message=e.message,
            message_code=e.message_code,
            status_code=e.status_code,
        )
