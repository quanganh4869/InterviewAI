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
from fastapi import APIRouter, Depends, Security
from fastapi.security import HTTPBearer
from schemas.requests.job_posting_schema import (
    JobPostingFromDocumentRequest,
    JobPostingUpdateRequest,
)
from schemas.responses.job_posting_schema import JobPostingListResponse, JobPostingResponse
from services.job_posting_service import JobPostingService
from sqlalchemy.ext.asyncio import AsyncSession

bearer_scheme = HTTPBearer(auto_error=False)
router = APIRouter(dependencies=[Security(bearer_scheme)])

DBSessionDep = Annotated[AsyncSession, Depends(Database.get_async_db_session)]
AnyUserDep = Annotated[User, Depends(require_role([UserRole.USER, UserRole.HR, UserRole.ADMIN]))]
HrOrAdminDep = Annotated[User, Depends(require_role([UserRole.HR, UserRole.ADMIN]))]


def get_job_posting_service(db_session: DBSessionDep) -> JobPostingService:
    return JobPostingService(db_session)


JobPostingServiceDep = Annotated[JobPostingService, Depends(get_job_posting_service)]


def _error(exc: ExceptionValueError):
    return ApiResponse.error(
        message=exc.message,
        message_code=exc.message_code,
        status_code=exc.status_code,
    )


@router.post("/from-document")
@api_version(1, 0)
@measure_time
async def create_job_posting_from_document(
    payload: JobPostingFromDocumentRequest,
    user: HrOrAdminDep,
    service: JobPostingServiceDep,
):
    try:
        result = await service.create_from_document(
            user=user,
            jd_document_id=payload.jd_document_id,
            publish=payload.publish,
        )
        return ApiResponse.success(
            data=JobPostingResponse(**result).model_dump(mode="json"),
            message="Job posting created successfully",
        )
    except ExceptionValueError as exc:
        log.error("job_posting_create_failed user_id=%s error=%s", user.id, exc.message)
        return _error(exc)


@router.get("/public")
@api_version(1, 0)
@measure_time
async def list_public_job_postings(
    user: AnyUserDep,
    service: JobPostingServiceDep,
):
    result = await service.list_public()
    return ApiResponse.success(
        data=JobPostingListResponse(**result).model_dump(mode="json"),
        message="Public job postings fetched successfully",
    )


@router.get("/hr")
@api_version(1, 0)
@measure_time
async def list_hr_job_postings(
    user: HrOrAdminDep,
    service: JobPostingServiceDep,
):
    result = await service.list_hr(user=user)
    return ApiResponse.success(
        data=JobPostingListResponse(**result).model_dump(mode="json"),
        message="HR job postings fetched successfully",
    )


@router.get("/{posting_id}")
@api_version(1, 0)
@measure_time
async def get_job_posting(
    posting_id: int,
    user: AnyUserDep,
    service: JobPostingServiceDep,
):
    try:
        result = await service.get_detail(user=user, posting_id=posting_id)
        return ApiResponse.success(
            data=JobPostingResponse(**result).model_dump(mode="json"),
            message="Job posting fetched successfully",
        )
    except ExceptionValueError as exc:
        return _error(exc)


@router.patch("/{posting_id}")
@api_version(1, 0)
@measure_time
async def update_job_posting(
    posting_id: int,
    payload: JobPostingUpdateRequest,
    user: HrOrAdminDep,
    service: JobPostingServiceDep,
):
    try:
        result = await service.update(
            user=user,
            posting_id=posting_id,
            payload=payload.model_dump(exclude_unset=True),
        )
        return ApiResponse.success(
            data=JobPostingResponse(**result).model_dump(mode="json"),
            message="Job posting updated successfully",
        )
    except ExceptionValueError as exc:
        return _error(exc)


@router.patch("/{posting_id}/publish")
@api_version(1, 0)
@measure_time
async def publish_job_posting(
    posting_id: int,
    user: HrOrAdminDep,
    service: JobPostingServiceDep,
):
    try:
        result = await service.publish(user=user, posting_id=posting_id)
        return ApiResponse.success(
            data=JobPostingResponse(**result).model_dump(mode="json"),
            message="Job posting published successfully",
        )
    except ExceptionValueError as exc:
        return _error(exc)


@router.patch("/{posting_id}/close")
@api_version(1, 0)
@measure_time
async def close_job_posting(
    posting_id: int,
    user: HrOrAdminDep,
    service: JobPostingServiceDep,
):
    try:
        result = await service.close(user=user, posting_id=posting_id)
        return ApiResponse.success(
            data=JobPostingResponse(**result).model_dump(mode="json"),
            message="Job posting closed successfully",
        )
    except ExceptionValueError as exc:
        return _error(exc)
