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
from schemas.requests.cv_jd_analysis_schema import CvJdAnalyzeRequest
from schemas.responses.cv_jd_analysis_schema import (
    CvJdAnalysisDetailResponse,
    CvJdAnalysisHistoryResponse,
)
from services.cv_jd_analysis_service import CvJdAnalysisService
from sqlalchemy.ext.asyncio import AsyncSession

bearer_scheme = HTTPBearer(auto_error=False)
router = APIRouter(dependencies=[Security(bearer_scheme)])

DBSessionDep = Annotated[AsyncSession, Depends(Database.get_async_db_session)]
ActorDep = Annotated[
    User,
    Depends(require_role([UserRole.USER, UserRole.HR, UserRole.ADMIN])),
]


def get_cv_jd_analysis_service(db_session: DBSessionDep) -> CvJdAnalysisService:
    return CvJdAnalysisService(db_session)


CvJdAnalysisServiceDep = Annotated[
    CvJdAnalysisService,
    Depends(get_cv_jd_analysis_service),
]


@router.post("/analyze")
@api_version(1, 0)
@measure_time
async def analyze_cv_jd(
    payload: CvJdAnalyzeRequest,
    user: ActorDep,
    service: CvJdAnalysisServiceDep,
):
    try:
        result = await service.analyze(
            user=user,
            cv_document_id=payload.cv_document_id,
            jd_text=payload.jd_text,
            job_posting_id=payload.job_posting_id,
        )
        return ApiResponse.success(
            data=CvJdAnalysisDetailResponse(**result).model_dump(mode="json"),
            message="CV/JD analysis completed successfully",
        )
    except ExceptionValueError as exc:
        log.error("cv_jd_analysis_failed user_id=%s error=%s", user.id, exc.message)
        return ApiResponse.error(
            message=exc.message,
            message_code=exc.message_code,
            status_code=exc.status_code,
        )


@router.get("/history")
@api_version(1, 0)
@measure_time
async def list_cv_jd_analysis_history(
    user: ActorDep,
    service: CvJdAnalysisServiceDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    result = await service.list_history(user=user, page=page, page_size=page_size)
    return ApiResponse.success(
        data=CvJdAnalysisHistoryResponse(**result).model_dump(mode="json"),
        message="CV/JD analysis history fetched successfully",
    )


@router.get("/{analysis_id}")
@api_version(1, 0)
@measure_time
async def get_cv_jd_analysis_detail(
    analysis_id: int,
    user: ActorDep,
    service: CvJdAnalysisServiceDep,
):
    try:
        result = await service.get_detail(user=user, analysis_id=analysis_id)
        return ApiResponse.success(
            data=CvJdAnalysisDetailResponse(**result).model_dump(mode="json"),
            message="CV/JD analysis report fetched successfully",
        )
    except ExceptionValueError as exc:
        log.error(
            "cv_jd_analysis_detail_failed user_id=%s analysis_id=%s error=%s",
            user.id,
            analysis_id,
            exc.message,
        )
        return ApiResponse.error(
            message=exc.message,
            message_code=exc.message_code,
            status_code=exc.status_code,
        )
