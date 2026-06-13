from typing import Annotated

from configuration.logger.config import log
from core.common.api_response import ApiResponse
from core.decorators.api_version import version as api_version
from core.decorators.log_time import measure_time
from core.dependencies.rbac import require_role
from core.enums.user_enum import UserRole
from core.exception_handler.custom_exception import ExceptionValueError
from db.models.users import User
from fastapi import APIRouter, Depends, Security
from fastapi.security import HTTPBearer
from schemas.requests.hr_email_schema import HrSendCandidateEmailRequest
from schemas.responses.user_schema import UserSchema
from services.email_service import EmailService

bearer_scheme = HTTPBearer(auto_error=False)
router = APIRouter(dependencies=[Security(bearer_scheme)])

HrDep = Annotated[User, Depends(require_role([UserRole.HR, UserRole.ADMIN]))]


def get_email_service() -> EmailService:
    return EmailService()


EmailServiceDep = Annotated[EmailService, Depends(get_email_service)]


@router.post("/emails/send")
@api_version(1, 0)
@measure_time
async def send_candidate_email(
    payload: HrSendCandidateEmailRequest,
    user: HrDep,
    service: EmailServiceDep,
):
    try:
        sender = UserSchema.model_validate(user)
        result = await service.send_candidate_email(
            payload=payload,
            sender_user_id=user.id,
            reply_to_email=sender.email,
            reply_to_name=sender.name,
        )
        return ApiResponse.success(
            data=result.model_dump(mode="json"),
            message="Candidate email sent successfully",
        )
    except ExceptionValueError as exc:
        log.error("Failed to send candidate email: %s", exc.message)
        return ApiResponse.error(
            message=exc.message,
            message_code=exc.message_code,
            status_code=exc.status_code,
        )
