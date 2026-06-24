from typing import Annotated

from core.common.api_response import ApiResponse
from core.decorators.api_version import version as api_version
from core.decorators.log_time import measure_time
from core.dependencies.rbac import require_role
from core.enums.user_enum import UserRole
from db.db_connection import Database
from db.models.users import User
from fastapi import APIRouter, Depends, Query, Security
from fastapi.security import HTTPBearer
from schemas.responses.notification_schema import NotificationListResponse, NotificationResponse
from services.notification_service import NotificationService
from sqlalchemy.ext.asyncio import AsyncSession

bearer_scheme = HTTPBearer(auto_error=False)
router = APIRouter(dependencies=[Security(bearer_scheme)])

DBSessionDep = Annotated[AsyncSession, Depends(Database.get_async_db_session)]
HrOrAdminDep = Annotated[User, Depends(require_role([UserRole.HR, UserRole.ADMIN]))]


def get_notification_service(db_session: DBSessionDep) -> NotificationService:
    return NotificationService(db_session)


NotificationServiceDep = Annotated[NotificationService, Depends(get_notification_service)]


@router.get("")
@api_version(1, 0)
@measure_time
async def list_notifications(
    user: HrOrAdminDep,
    service: NotificationServiceDep,
    unread_only: bool = Query(default=False),
    limit: int = Query(default=20, ge=1, le=100),
):
    result = await service.list_for_user(user=user, unread_only=unread_only, limit=limit)
    return ApiResponse.success(
        data=NotificationListResponse(**result).model_dump(mode="json"),
        message="Notifications fetched successfully",
    )


@router.patch("/{notification_id}/read")
@api_version(1, 0)
@measure_time
async def mark_notification_read(
    notification_id: int,
    user: HrOrAdminDep,
    service: NotificationServiceDep,
):
    result = await service.mark_read(user=user, notification_id=notification_id)
    if result is None:
        return ApiResponse.error(message="Notification not found.", status_code=404)
    return ApiResponse.success(
        data=NotificationResponse(**result).model_dump(mode="json"),
        message="Notification marked as read",
    )


@router.patch("/read-all")
@api_version(1, 0)
@measure_time
async def mark_all_notifications_read(
    user: HrOrAdminDep,
    service: NotificationServiceDep,
):
    await service.mark_all_read(user=user)
    return ApiResponse.success(data=None, message="Notifications marked as read")
