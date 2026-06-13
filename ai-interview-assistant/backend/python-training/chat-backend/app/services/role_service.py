from http import HTTPStatus

from configuration.settings import configuration
from core.common.aes_gcm import AesGCMRotation
from core.constants import FIXED_ADMIN_EMAILS
from core.enums.user_enum import UserRole
from core.exception_handler.custom_exception import ExceptionValueError
from db.models.users import User
from sqlalchemy.ext.asyncio import AsyncSession


class RoleService:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session
        self.aes_gcm = AesGCMRotation(configuration=configuration)

    async def list_available_roles(self) -> list[str]:
        """List all available roles from the UserRole enum."""
        return UserRole.get_member_values()

    async def assign_role_to_user(self, user: User, role: UserRole) -> User:
        """Assign a role to a specific user and return the updated user."""
        if role == UserRole.ADMIN:
            raise ExceptionValueError(
                message="ADMIN role cannot be assigned from onboarding.",
                status_code=HTTPStatus.FORBIDDEN.value,
            )
        if self._is_fixed_admin(user):
            raise ExceptionValueError(
                message="The fixed admin role cannot be changed.",
                status_code=HTTPStatus.FORBIDDEN.value,
            )
        async with self.db_session.begin():
            # Merge user into current session
            user = await self.db_session.merge(user)
            user.role = role
            self.db_session.add(user)
        return user

    def _is_fixed_admin(self, user: User) -> bool:
        admin_email_hashes = {
            self.aes_gcm.sha256_hash(email.strip().lower())
            for email in FIXED_ADMIN_EMAILS
        }
        return user.email_hash in admin_email_hashes
