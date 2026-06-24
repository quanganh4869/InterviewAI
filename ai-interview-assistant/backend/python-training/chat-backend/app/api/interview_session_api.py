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
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    Security,
    UploadFile,
    Query,
)
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.security import HTTPBearer
from schemas.requests.interview_schema import InterviewCompareRequest, InterviewFinishRequest, InterviewSessionCreateRequest
from schemas.responses.interview_schema import InterviewAnswerResponse, InterviewSessionListResponse, InterviewSessionResponse
from services.interview_session_service import (
    InterviewSessionService,
    evaluate_interview_session_task,
    transcribe_interview_answer_task,
)
from sqlalchemy.ext.asyncio import AsyncSession

bearer_scheme = HTTPBearer(auto_error=False)
router = APIRouter(dependencies=[Security(bearer_scheme)])

DBSessionDep = Annotated[AsyncSession, Depends(Database.get_async_db_session)]
AnyUserDep = Annotated[User, Depends(require_role([UserRole.USER, UserRole.HR, UserRole.ADMIN]))]
HrOrAdminDep = Annotated[User, Depends(require_role([UserRole.HR, UserRole.ADMIN]))]


def get_interview_session_service(db_session: DBSessionDep) -> InterviewSessionService:
    return InterviewSessionService(db_session)


InterviewSessionServiceDep = Annotated[InterviewSessionService, Depends(get_interview_session_service)]


def _error(exc: ExceptionValueError):
    return ApiResponse.error(
        message=exc.message,
        message_code=exc.message_code,
        status_code=exc.status_code,
    )


@router.post("")
@api_version(1, 0)
@measure_time
async def create_interview_session(
    payload: InterviewSessionCreateRequest,
    user: AnyUserDep,
    service: InterviewSessionServiceDep,
):
    try:
        result = await service.create_session(
            user=user,
            session_type=payload.session_type,
            job_posting_id=payload.job_posting_id,
            cv_document_id=payload.cv_document_id,
            analysis_id=payload.analysis_id,
            practice_config=payload.practice_config,
        )
        return ApiResponse.success(
            data=InterviewSessionResponse(**result).model_dump(mode="json"),
            message="Interview session created successfully",
        )
    except ExceptionValueError as exc:
        log.error("interview_session_create_failed user_id=%s error=%s", user.id, exc.message)
        return _error(exc)


@router.post("/{session_id}/questions/generate")
@api_version(1, 0)
@measure_time
async def generate_interview_questions(
    session_id: int,
    user: AnyUserDep,
    service: InterviewSessionServiceDep,
):
    try:
        result = await service.generate_questions(user=user, session_id=session_id)
        return ApiResponse.success(
            data=InterviewSessionResponse(**result).model_dump(mode="json"),
            message="Interview questions generated successfully",
        )
    except ExceptionValueError as exc:
        return _error(exc)


@router.get("/my")
@api_version(1, 0)
@measure_time
async def list_my_interview_sessions(
    user: AnyUserDep,
    service: InterviewSessionServiceDep,
    session_type: str | None = Query(default=None),
):
    result = await service.list_my(user=user, session_type=session_type)
    return ApiResponse.success(
        data=InterviewSessionListResponse(**result).model_dump(mode="json"),
        message="Interview sessions fetched successfully",
    )


@router.get("/hr")
@api_version(1, 0)
@measure_time
async def list_hr_interview_sessions(
    user: HrOrAdminDep,
    service: InterviewSessionServiceDep,
    job_posting_id: int | None = Query(default=None, gt=0),
):
    try:
        result = await service.list_hr(user=user, job_posting_id=job_posting_id)
        return ApiResponse.success(
            data=InterviewSessionListResponse(**result).model_dump(mode="json"),
            message="HR interview sessions fetched successfully",
        )
    except ExceptionValueError as exc:
        return _error(exc)


@router.get("/{session_id}")
@api_version(1, 0)
@measure_time
async def get_interview_session(
    session_id: int,
    user: AnyUserDep,
    service: InterviewSessionServiceDep,
):
    try:
        result = await service.get_detail(user=user, session_id=session_id)
        return ApiResponse.success(
            data=InterviewSessionResponse(**result).model_dump(mode="json"),
            message="Interview session fetched successfully",
        )
    except ExceptionValueError as exc:
        return _error(exc)


@router.delete("/{session_id}")
@api_version(1, 0)
@measure_time
async def delete_interview_session(
    session_id: int,
    user: AnyUserDep,
    service: InterviewSessionServiceDep,
):
    try:
        await service.delete_session(user=user, session_id=session_id)
        return ApiResponse.success(
            data=None,
            message="Interview session deleted successfully",
        )
    except ExceptionValueError as exc:
        return _error(exc)


@router.post("/{session_id}/answers")
@api_version(1, 0)
@measure_time
async def upload_interview_answer(
    session_id: int,
    background_tasks: BackgroundTasks,
    user: AnyUserDep,
    service: InterviewSessionServiceDep,
    question_id: Annotated[int, Form()],
    duration_seconds: Annotated[float | None, Form()] = None,
    client_transcript: Annotated[str | None, Form()] = None,
    audio: Annotated[UploadFile | None, File()] = None,
    video: Annotated[UploadFile | None, File()] = None,
):
    try:
        result, media_bytes, file_name, content_type = await service.upload_answer(
            user=user,
            session_id=session_id,
            question_id=question_id,
            duration_seconds=duration_seconds,
            client_transcript=client_transcript,
            audio=audio,
            video=video,
        )
        if media_bytes:
            background_tasks.add_task(
                transcribe_interview_answer_task,
                result["id"],
                media_bytes,
                file_name,
                content_type,
                client_transcript,
            )
        return ApiResponse.success(
            data=InterviewAnswerResponse(**result).model_dump(mode="json"),
            message="Interview answer uploaded successfully",
        )
    except ExceptionValueError as exc:
        return _error(exc)


@router.post("/{session_id}/finish")
@api_version(1, 0)
@measure_time
async def finish_interview_session(
    session_id: int,
    payload: InterviewFinishRequest,
    background_tasks: BackgroundTasks,
    user: AnyUserDep,
    service: InterviewSessionServiceDep,
):
    try:
        result = await service.finish_session(user=user, session_id=session_id)
        background_tasks.add_task(evaluate_interview_session_task, session_id)
        return ApiResponse.success(
            data=InterviewSessionResponse(**result).model_dump(mode="json"),
            message="Interview session submitted for evaluation",
        )
    except ExceptionValueError as exc:
        return _error(exc)


@router.get("/{session_id}/report")
@api_version(1, 0)
@measure_time
async def get_interview_report(
    session_id: int,
    user: AnyUserDep,
    service: InterviewSessionServiceDep,
):
    try:
        result = await service.get_report(user=user, session_id=session_id)
        return ApiResponse.success(
            data=InterviewSessionResponse(**result).model_dump(mode="json"),
            message="Interview report fetched successfully",
        )
    except ExceptionValueError as exc:
        return _error(exc)


@router.post("/compare")
@api_version(1, 0)
@measure_time
async def compare_interview_sessions(
    payload: InterviewCompareRequest,
    user: AnyUserDep,
    service: InterviewSessionServiceDep,
):
    try:
        result = await service.compare_sessions(user=user, session_ids=payload.session_ids)
        return ApiResponse.success(
            data=result,
            message="Interview sessions compared successfully",
        )
    except ExceptionValueError as exc:
        return _error(exc)



@router.get("/answers/{answer_id}/media/{kind}")
@api_version(1, 0)
@measure_time
async def get_interview_answer_media(
    answer_id: int,
    kind: str,
    user: AnyUserDep,
    service: InterviewSessionServiceDep,
):
    try:
        if kind not in {"audio", "video"}:
            raise ExceptionValueError(message="Invalid media kind.", status_code=422)
        mode, target, media_type = await service.get_media_path_or_url(
            user=user,
            answer_id=answer_id,
            kind=kind,
        )
        if mode == "redirect":
            return RedirectResponse(target)
        return FileResponse(path=target, media_type=media_type)
    except ExceptionValueError as exc:
        return _error(exc)
