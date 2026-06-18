from datetime import datetime, timedelta, timezone

from configuration.logger.config import log
from configuration.settings import configuration
from core.common.aes_gcm import AesGCMRotation
from core.constants import FIXED_ADMIN_EMAILS, TOKEN_PREFIX
from core.enums.user_enum import UserRole
from db.models import AuthIdentity, AuthProvider, OAuthToken, User
from google.auth.transport import requests
from google.oauth2 import id_token
from schemas.responses.google_auth_schema import GoogleUserSchema
from schemas.responses.user_auth_schema import OAuthTokenResponse
from services.google_auth_service import GoogleAuthService
from services.key_manager_service import KeyManager
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from werkzeug.security import gen_salt


class UserAuthService:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session
        self.aes_gcm = AesGCMRotation(configuration=configuration)

    async def get_or_create_user(
        self,
        google_user: GoogleUserSchema,
        provider_name: str = "google",
    ) -> User:
        try:
            identity = await self._get_identity(google_user.sub)
            if identity:
                await self._ensure_fixed_admin_role(identity.user)
                return identity.user

            hashed_email = self.aes_gcm.sha256_hash(
                self._normalize_email(google_user.email)
            )
            user = await self._get_user(hashed_email)

            if user is None:
                user = await self._create_user(google_user=google_user)
            else:
                await self._ensure_fixed_admin_role(user)

            await self._create_identity(
                user_id=user.id,
                provider_user_id=google_user.sub,
                provider_name=provider_name,
            )

            return user
        except Exception as e:
            log.error(f"Failed to get or create user: {e}")
            raise

    async def create_access_token(
        self,
        user: User,
    ) -> OAuthTokenResponse:
        try:
            scope = " ".join(configuration.GOOGLE_SCOPES)
            token_expires = timedelta(minutes=configuration.ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = KeyManager().create_access_token(
                payload_data={
                    "iss": "Chat App",
                    "sub": str(user.id),
                    "scope": scope,
                    "iat": int(datetime.now(timezone.utc).timestamp()),
                },
                expires_delta=token_expires,
            )
            jwt_token = {
                "access_token": access_token,
                "refresh_token": gen_salt(48),
                "expires_in": int(token_expires.total_seconds()),
            }

            oauth_token = OAuthToken(
                user_id=user.id,
                access_token=jwt_token["access_token"],
                refresh_token=jwt_token["refresh_token"],
                expires_at=datetime.now(timezone.utc)
                + timedelta(seconds=jwt_token["expires_in"]),
                user=user,
            )
            self.db_session.add(oauth_token)
            await self.db_session.flush()

            return OAuthTokenResponse(
                access_token=jwt_token["access_token"],
                refresh_token=jwt_token["refresh_token"],
                token_type=TOKEN_PREFIX,
                expires_in=jwt_token["expires_in"],
                user=user,
            )

        except Exception as e:
            log.error(f"Failed to create access token: {e}")
            raise

    async def refresh_access_token(self, refresh_token: str) -> OAuthTokenResponse:
        try:
            token_result = await self.db_session.execute(
                select(OAuthToken)
                .options(selectinload(OAuthToken.user))
                .where(
                    OAuthToken.refresh_token == refresh_token,
                    OAuthToken.deleted_at.is_(None),
                )
            )
            oauth_token = token_result.scalar_one_or_none()
            if oauth_token is None or oauth_token.user is None:
                raise ValueError("Invalid refresh token")

            if oauth_token.created_at:
                refresh_expires_at = oauth_token.created_at + timedelta(
                    days=configuration.REFRESH_TOKEN_EXPIRE_DAYS
                )
                if refresh_expires_at < datetime.now(timezone.utc):
                    oauth_token.deleted_at = datetime.now(timezone.utc)
                    self.db_session.add(oauth_token)
                    await self.db_session.commit()
                    raise ValueError("Refresh token expired")

            oauth_token.deleted_at = datetime.now(timezone.utc)
            self.db_session.add(oauth_token)

            result = await self.create_access_token(user=oauth_token.user)
            await self.db_session.commit()
            return result

        except ValueError:
            raise
        except Exception as e:
            log.error(f"Failed to refresh access token: {e}")
            raise

    async def _get_identity(self, provider_user_id: str) -> AuthIdentity | None:
        result = await self.db_session.execute(
            select(AuthIdentity)
            .options(selectinload(AuthIdentity.user))
            .where(AuthIdentity.provider_user_id == provider_user_id)
        )
        return result.scalar_one_or_none()

    async def _get_user(self, hashed_email: str) -> User | None:
        result = await self.db_session.execute(
            select(User).where(User.email_hash == hashed_email)
        )
        return result.scalar_one_or_none()

    async def _create_user(
        self,
        google_user: GoogleUserSchema,
    ) -> User:
        user = User(
            email_hash=self.aes_gcm.sha256_hash(
                self._normalize_email(google_user.email)
            ),
            email_encrypted=self.aes_gcm.encrypt_data(google_user.email),
            name_hash=self.aes_gcm.sha256_hash(google_user.name)
            if google_user.name
            else None,
            name_encrypted=self.aes_gcm.encrypt_data(google_user.name)
            if google_user.name
            else None,
            avatar_url=str(google_user.picture) if google_user.picture else None,
            role=self._resolve_role_for_email(google_user.email),
        )
        self.db_session.add(user)
        await self.db_session.flush()
        await self.db_session.refresh(user)
        return user

    @staticmethod
    def _normalize_email(email: str | None) -> str:
        return str(email or "").strip().lower()

    def _resolve_role_for_email(self, email: str | None) -> UserRole:
        if self._normalize_email(email) in self._fixed_admin_email_set():
            return UserRole.ADMIN
        return UserRole.USER

    async def _ensure_fixed_admin_role(self, user: User) -> None:
        if user.email_hash not in self._fixed_admin_email_hashes() or user.role == UserRole.ADMIN:
            return
        user.role = UserRole.ADMIN
        self.db_session.add(user)
        await self.db_session.flush()

    def _fixed_admin_email_set(self) -> set[str]:
        return {self._normalize_email(email) for email in FIXED_ADMIN_EMAILS}

    def _fixed_admin_email_hashes(self) -> set[str]:
        return {
            self.aes_gcm.sha256_hash(email)
            for email in self._fixed_admin_email_set()
        }

    async def _get_provider(self, provider_name: str) -> AuthProvider | None:
        provider_name = provider_name.strip().lower()
        result = await self.db_session.execute(
            select(AuthProvider).where(AuthProvider.provider_name == provider_name)
        )
        return result.scalar_one_or_none()

    async def _get_or_create_provider(self, provider_name: str) -> AuthProvider:
        provider_name = provider_name.strip().lower()
        provider = await self._get_provider(provider_name)
        if provider is not None:
            return provider

        provider = AuthProvider(provider_name=provider_name, is_active=True)
        self.db_session.add(provider)
        await self.db_session.flush()
        await self.db_session.refresh(provider)
        return provider

    async def _create_identity(
        self,
        user_id: int,
        provider_user_id: str,
        provider_name: str,
    ) -> None:
        provider = await self._get_or_create_provider(provider_name)

        identity = AuthIdentity(
            user_id=user_id,
            provider_id=provider.id,
            provider_user_id=provider_user_id,
        )
        self.db_session.add(identity)
        await self.db_session.flush()

    async def handle_google_login_callback(
        self,
        code: str,
        provider_name: str = "google",
    ) -> OAuthTokenResponse:
        token_data = await GoogleAuthService.exchange_code_for_token(code)
        return await self.handle_google_login_post(
            token=token_data["id_token"],
            provider_name=provider_name,
        )

    async def handle_google_login_post(
        self,
        token: str,
        provider_name: str = "google",
    ) -> OAuthTokenResponse:
        try:
            idinfo = id_token.verify_oauth2_token(
                token,
                requests.Request(),
                configuration.GOOGLE_CLIENT_ID,
            )

            google_user = GoogleUserSchema(
                sub=idinfo.get("sub"),
                email=idinfo.get("email"),
                name=idinfo.get("name"),
                picture=idinfo.get("picture"),
                iss=idinfo.get("iss"),
                aud=idinfo.get("aud"),
                iat=idinfo.get("iat"),
                exp=idinfo.get("exp"),
            )

            async with self.db_session.begin():
                user = await self.get_or_create_user(
                    google_user=google_user,
                    provider_name=provider_name,
                )
                return await self.create_access_token(user=user)

        except ValueError as e:
            log.error(f"Invalid Google token: {e}")
            raise

        except Exception as e:
            log.error(f"Failed to handle Google login POST: {e}")
            raise
