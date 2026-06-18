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
from schemas.requests.assistant_schema import AssistantChatRequest
from schemas.responses.user_schema import UserSchema
from services.assistant_service import AssistantService

bearer_scheme = HTTPBearer(auto_error=False)
router = APIRouter(dependencies=[Security(bearer_scheme)])

ActorDep = Annotated[
    User,
    Depends(require_role([UserRole.USER, UserRole.HR, UserRole.ADMIN])),
]


def get_assistant_service() -> AssistantService:
    return AssistantService()


AssistantServiceDep = Annotated[
    AssistantService,
    Depends(get_assistant_service),
]


@router.post("/chat")
@api_version(1, 0)
@measure_time
async def chat_with_assistant(
    payload: AssistantChatRequest,
    user: ActorDep,
    service: AssistantServiceDep,
):
    try:
        user_schema = UserSchema.model_validate(user)
        user_name = user_schema.name or "Bạn"

        chat_messages = [msg.model_dump() for msg in payload.messages]

        reply = await service.get_response(user_name=user_name, messages=chat_messages)

        return ApiResponse.success(
            data={"reply": reply},
            message="Assistant response generated successfully",
        )
    except ExceptionValueError as exc:
        log.error("assistant_chat_failed user_id=%s error=%s", user.id, exc.message)
        return ApiResponse.error(
            message=exc.message,
            message_code=exc.message_code,
            status_code=exc.status_code,
        )
    except Exception as e:
        log.error("assistant_chat_failed user_id=%s error=%s", user.id, str(e))
        return ApiResponse.error(
            message="Đã xảy ra lỗi khi xử lý hội thoại.",
            status_code=500,
        )
