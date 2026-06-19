from typing import Annotated
from urllib.parse import urlencode, urlparse

from configuration.logger.config import log
from configuration.settings import configuration
from core.common.api_response import ApiResponse
from core.decorators.api_version import version as api_version
from core.decorators.log_time import measure_time
from core.exception_handler.custom_exception import ExceptionValueError
from core.messages import CustomMessageCode
from db.db_connection import Database
from fastapi import APIRouter, Depends, status
from schemas.requests.google_auth_schema import GoogleLoginRequest
from schemas.requests.user_auth_schema import RefreshTokenRequest
from services.google_auth_service import GoogleAuthService
from services.key_manager_service import KeyManager
from services.user_auth_service import UserAuthService
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import RedirectResponse

router = APIRouter()


@router.get("/jwks")
@api_version(1, 0)
@measure_time
def jwks():
    """Expose public keys (JWKS) for internal JWT verification."""
    try:
        key_manager = KeyManager()
        return ApiResponse.success(data=key_manager.get_all_active_public_jwks())
    except Exception as e:
        log.error(f"Failed to fetch JWKS: {e}")
        return ApiResponse.error(
            message=CustomMessageCode.UNKNOWN_ERROR.title,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@router.get("/login/google")
@api_version(1, 0)
@measure_time
async def init_google_login():
    """Redirect user to Google OAuth2 consent screen."""
    try:
        google_auth_service = GoogleAuthService()
        return RedirectResponse(url=google_auth_service.get_authorization_url())
    except Exception as e:
        log.error(f"Failed to initialize Google login: {e}")
        return RedirectResponse(
            url=f"{configuration.FRONTEND_URL}/login?error=auth_init_failed"
        )


@router.get("/login/google/callback")
@api_version(1, 0)
@measure_time
async def google_login_callback(
    code: str,
    db_session: Annotated[AsyncSession, Depends(Database.get_async_db_session)],
):
    """Handle Google OAuth2 callback and redirect back to frontend."""
    try:
        auth_service = UserAuthService(db_session)
        login_result = await auth_service.handle_google_login_callback(code=code)

        redirect_url = f"{configuration.FRONTEND_URL}/google-callback#{urlencode({
            'access_token': login_result.access_token,
            'refresh_token': login_result.refresh_token,
            'token_type': 'bearer',
        })}"
        redirect_target = urlparse(redirect_url)
        log.info(
            "Redirecting Google login to frontend: "
            f"{redirect_target.scheme}://{redirect_target.netloc}{redirect_target.path}"
        )
        return RedirectResponse(url=redirect_url)

    except ExceptionValueError as e:
        log.error(f"Google callback business error: {e.message}")
        return RedirectResponse(
            url=f"{configuration.FRONTEND_URL}/login?error_code={e.message_code}"
        )
    except ValueError as e:
        log.error(f"Google callback invalid token: {e}")
        return RedirectResponse(
            url=f"{configuration.FRONTEND_URL}/login?error=invalid_token"
        )
    except Exception as e:
        log.error(f"Google callback system error: {e}")
        return RedirectResponse(
            url=f"{configuration.FRONTEND_URL}/login?error=auth_failed"
        )


@router.post("/google/login")
@api_version(1, 0)
@measure_time
async def login_google(
    request_data: GoogleLoginRequest,
    db_session: Annotated[AsyncSession, Depends(Database.get_async_db_session)],
):
    """Handle Google OAuth2 login and return internal JWT tokens."""
    try:
        auth_service = UserAuthService(db_session=db_session)

        result = await auth_service.handle_google_login_post(
            token=request_data.id_token,
        )

        return ApiResponse.success(
            data=result.model_dump(),
        )

    except ValueError as e:
        log.error(f"Invalid Google token in login_google: {e}")
        return ApiResponse.error(
            message=CustomMessageCode.GOOGLE_AUTH_FAILED.title,
            message_code=CustomMessageCode.GOOGLE_AUTH_FAILED.code,
            message_errors=[str(e)],
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    except Exception as e:
        log.error(f"Failed to process Google login POST: {e}")
        return ApiResponse.error(
            message=CustomMessageCode.UNKNOWN_ERROR.title,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@router.post("/refresh")
@api_version(1, 0)
@measure_time
async def refresh_token(
    request_data: RefreshTokenRequest,
    db_session: Annotated[AsyncSession, Depends(Database.get_async_db_session)],
):
    try:
        auth_service = UserAuthService(db_session=db_session)
        result = await auth_service.refresh_access_token(
            refresh_token=request_data.refresh_token,
        )
        return ApiResponse.success(data=result.model_dump())

    except ValueError as e:
        log.error(f"Invalid refresh token: {e}")
        return ApiResponse.error(
            message=CustomMessageCode.TOKEN_EXPIRED.title,
            message_code=CustomMessageCode.TOKEN_EXPIRED.code,
            message_errors=[str(e)],
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    except Exception as e:
        log.error(f"Failed to refresh token: {e}")
        return ApiResponse.error(
            message=CustomMessageCode.UNKNOWN_ERROR.title,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
