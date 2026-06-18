from core.enums.subscription_enum import SubscriptionPlanName
from core.exception_handler.custom_exception import ExceptionValueError
from core.messages import CustomMessageCode
from db.models.subscription_plan import SubscriptionPlan
from db.models.users import User
from fastapi import status
from schemas.responses.plan_schema import PlanResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class PlanService:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def list_plans(self) -> list[PlanResponse]:
        """List all available subscription plans."""
        result = await self.db_session.execute(
            select(SubscriptionPlan).order_by(SubscriptionPlan.price.asc())
        )
        plans = result.scalars().all()
        return [PlanResponse.model_validate(plan) for plan in plans]

    async def update_plan(
        self,
        plan_id: int,
        price: int,
        description: str | None = None,
        practice_sessions_per_day: int | None = None,
        cv_upload_limit: int | None = None,
        jd_upload_limit: int | None = None,
    ) -> PlanResponse:
        plan = await self._get_plan_by_id(plan_id)
        plan.price = max(0, int(price or 0))
        plan.description = description
        plan.practice_sessions_per_day = self._normalize_limit(practice_sessions_per_day)
        plan.cv_upload_limit = self._normalize_limit(cv_upload_limit)
        plan.jd_upload_limit = self._normalize_limit(jd_upload_limit)
        self.db_session.add(plan)
        await self.db_session.commit()
        await self.db_session.refresh(plan)
        return PlanResponse.model_validate(plan)

    async def assign_plan_to_user(
        self, user: User, plan_name: SubscriptionPlanName
    ) -> User:
        """Assign a subscription plan to a user and return the updated user."""
        async with self.db_session.begin():
            # Merge user into current session
            user = await self.db_session.merge(user)
            plan = await self._get_plan_by_name(plan_name)

            # Update user's plan_id
            user.plan_id = plan.id
            self.db_session.add(user)
        return user

    async def _get_plan_by_name(
        self, plan_name: SubscriptionPlanName
    ) -> SubscriptionPlan:
        """Helper to find a plan by name or raise exception."""
        result = await self.db_session.execute(
            select(SubscriptionPlan).where(SubscriptionPlan.name == plan_name)
        )
        plan = result.scalar_one_or_none()
        if not plan:
            raise ExceptionValueError(
                message=CustomMessageCode.PLAN_NOT_FOUND.title,
                message_code=CustomMessageCode.PLAN_NOT_FOUND.code,
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        return plan

    async def _get_plan_by_id(self, plan_id: int) -> SubscriptionPlan:
        result = await self.db_session.execute(
            select(SubscriptionPlan).where(SubscriptionPlan.id == plan_id)
        )
        plan = result.scalar_one_or_none()
        if not plan:
            raise ExceptionValueError(
                message=CustomMessageCode.PLAN_NOT_FOUND.title,
                message_code=CustomMessageCode.PLAN_NOT_FOUND.code,
                status_code=status.HTTP_404_NOT_FOUND,
            )
        return plan

    @staticmethod
    def _normalize_limit(value: int | None) -> int | None:
        if value is None:
            return None
        parsed = int(value)
        return parsed if parsed > 0 else None
