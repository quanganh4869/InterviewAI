from http import HTTPStatus
from typing import Any
from datetime import datetime, time

from configuration.settings import configuration
from core.common.aes_gcm import AesGCMRotation
from core.constants import FIXED_ADMIN_EMAILS
from core.enums.user_enum import UserRole
from core.exception_handler.custom_exception import ExceptionValueError
from db.models.users import User
from schemas.responses.admin_schema import AdminUserSchema, AdminUsersPageSchema
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


class AdminUserService:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session
        self.aes_gcm = AesGCMRotation(configuration=configuration)

    async def list_users(
        self,
        role: UserRole | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> AdminUsersPageSchema:
        page = max(1, page)
        page_size = min(max(1, page_size), 100)

        query = select(User).options(selectinload(User.plan)).order_by(User.id.desc())
        if role is not None:
            query = query.where(User.role == role)

        result = await self.db_session.execute(query)
        users = list(result.scalars().all())
        usage_by_user_id = await self._practice_usage_today_by_user_id([user.id for user in users])
        items = [
            self._serialize_admin_user_with_practice_quota(
                user=user,
                used_today=usage_by_user_id.get(user.id, 0),
            )
            for user in users
        ]

        normalized_search = str(search or "").strip().lower()
        if normalized_search:
            items = [
                item
                for item in items
                if normalized_search in item.email.lower()
                or normalized_search in (item.name or "").lower()
            ]

        total = len(items)
        start = (page - 1) * page_size
        return AdminUsersPageSchema(
            items=items[start : start + page_size],
            total=total,
            page=page,
            page_size=page_size,
        )

    async def _practice_usage_today_by_user_id(self, user_ids: list[int]) -> dict[int, int]:
        if not user_ids:
            return {}
        from db.models.interview import InterviewSession

        start_of_day = datetime.combine(datetime.utcnow().date(), time.min)
        result = await self.db_session.execute(
            select(InterviewSession.candidate_user_id, func.count(InterviewSession.id))
            .where(
                InterviewSession.candidate_user_id.in_(user_ids),
                InterviewSession.session_type == "practice",
                InterviewSession.created_at >= start_of_day,
                InterviewSession.deleted_at.is_(None),
            )
            .group_by(InterviewSession.candidate_user_id)
        )
        return {int(user_id): int(count or 0) for user_id, count in result.all()}

    @staticmethod
    def _practice_quota_for_user(user: User, used_today: int) -> dict[str, int | None]:
        plan = getattr(user, "plan", None)
        base = getattr(plan, "practice_sessions_per_day", None)
        if base is None and plan is None:
            base = 2
        additional = int(getattr(user, "additional_practice_slots", 0) or 0)
        total = None if base is None else max(0, int(base) + additional)
        remaining = None if total is None else max(0, total - int(used_today or 0))
        return {
            "practice_slots_base": base,
            "practice_slots_total": total,
            "practice_slots_used_today": int(used_today or 0),
            "practice_slots_remaining_today": remaining,
        }

    def _serialize_admin_user_with_practice_quota(self, user: User, used_today: int) -> AdminUserSchema:
        schema = AdminUserSchema.model_validate(user)
        return schema.model_copy(update=self._practice_quota_for_user(user, used_today))

    async def update_user_role(self, user_id: int, role: UserRole) -> AdminUserSchema:
        if role == UserRole.ADMIN:
            raise ExceptionValueError(
                message="ADMIN role cannot be assigned from this endpoint.",
                status_code=HTTPStatus.FORBIDDEN.value,
            )

        result = await self.db_session.execute(
            select(User).options(selectinload(User.plan)).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        if user is None:
            raise ExceptionValueError(
                message="User not found.",
                status_code=HTTPStatus.NOT_FOUND.value,
            )

        if self._is_fixed_admin(user):
            raise ExceptionValueError(
                message="The fixed admin role cannot be changed.",
                status_code=HTTPStatus.FORBIDDEN.value,
            )

        user.role = role
        self.db_session.add(user)
        await self.db_session.commit()
        result = await self.db_session.execute(
            select(User).options(selectinload(User.plan)).where(User.id == user_id)
        )
        updated_user = result.scalar_one()
        used_today = (await self._practice_usage_today_by_user_id([updated_user.id])).get(updated_user.id, 0)
        return self._serialize_admin_user_with_practice_quota(updated_user, used_today)

    def _is_fixed_admin(self, user: User) -> bool:
        admin_email_hashes = {
            self.aes_gcm.sha256_hash(email.strip().lower())
            for email in FIXED_ADMIN_EMAILS
        }
        return user.email_hash in admin_email_hashes

    async def create_user(
        self, name: str | None, email: str, role: UserRole, plan_id: int | None = None, additional_practice_slots: int = 0
    ) -> AdminUserSchema:
        normalized_email = str(email or "").strip().lower()
        hashed_email = self.aes_gcm.sha256_hash(normalized_email)
        
        result = await self.db_session.execute(
            select(User).where(User.email_hash == hashed_email)
        )
        existing = result.scalar_one_or_none()
        if existing:
            raise ExceptionValueError(
                message="User with this email already exists.",
                status_code=400,
            )
            
        user = User(
            email_hash=hashed_email,
            email_encrypted=self.aes_gcm.encrypt_data(normalized_email),
            name_hash=self.aes_gcm.sha256_hash(name) if name else None,
            name_encrypted=self.aes_gcm.encrypt_data(name) if name else None,
            role=role,
            plan_id=plan_id,
            additional_practice_slots=additional_practice_slots,
        )
        self.db_session.add(user)
        await self.db_session.commit()
        
        result = await self.db_session.execute(
            select(User).options(selectinload(User.plan)).where(User.id == user.id)
        )
        created_user = result.scalar_one()
        used_today = (await self._practice_usage_today_by_user_id([created_user.id])).get(created_user.id, 0)
        return self._serialize_admin_user_with_practice_quota(created_user, used_today)

    async def update_user(
        self, user_id: int, role: UserRole, plan_id: int | None = None, name: str | None = None, email: str | None = None, additional_practice_slots: int | None = None
    ) -> AdminUserSchema:
        result = await self.db_session.execute(
            select(User).options(selectinload(User.plan)).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        if user is None:
            raise ExceptionValueError(
                message="User not found.",
                status_code=404,
            )

        if self._is_fixed_admin(user):
            raise ExceptionValueError(
                message="The fixed admin properties cannot be changed.",
                status_code=403,
            )

        user.role = role
        user.plan_id = plan_id
        if additional_practice_slots is not None:
            user.additional_practice_slots = additional_practice_slots
        if name is not None:
            user.name_hash = self.aes_gcm.sha256_hash(name)
            user.name_encrypted = self.aes_gcm.encrypt_data(name)

        if email is not None:
            normalized_email = str(email or "").strip().lower()
            hashed_email = self.aes_gcm.sha256_hash(normalized_email)
            if hashed_email != user.email_hash:
                dup_result = await self.db_session.execute(
                    select(User).where(User.email_hash == hashed_email)
                )
                if dup_result.scalar_one_or_none():
                    raise ExceptionValueError(
                        message="User with this email already exists.",
                        status_code=400,
                    )
                user.email_hash = hashed_email
                user.email_encrypted = self.aes_gcm.encrypt_data(normalized_email)

        self.db_session.add(user)
        await self.db_session.commit()

        result = await self.db_session.execute(
            select(User).options(selectinload(User.plan)).where(User.id == user_id)
        )
        updated_user = result.scalar_one()
        used_today = (await self._practice_usage_today_by_user_id([updated_user.id])).get(updated_user.id, 0)
        return self._serialize_admin_user_with_practice_quota(updated_user, used_today)

    async def delete_user(self, user_id: int) -> None:
        result = await self.db_session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        if user is None:
            raise ExceptionValueError(
                message="User not found.",
                status_code=404,
            )
        if self._is_fixed_admin(user):
            raise ExceptionValueError(
                message="Default admin cannot be deleted.",
                status_code=403,
            )

        from db.models.interview import InterviewSession, InterviewAnswer, InterviewQuestion, InterviewEvaluation
        from db.models.job_posting import JobPosting
        from db.models.cv_jd_analysis import CvJdAnalysis
        from db.models.document import Document
        from db.models.auth_identities import AuthIdentity
        from db.models.oauth_tokens import OAuthToken
        from sqlalchemy import delete

        # Delete dependent structures in reverse dependency order
        sessions_result = await self.db_session.execute(
            select(InterviewSession.id).where(InterviewSession.candidate_user_id == user_id)
        )
        session_ids = list(sessions_result.scalars().all())

        if session_ids:
            await self.db_session.execute(
                delete(InterviewAnswer).where(InterviewAnswer.session_id.in_(session_ids))
            )
            await self.db_session.execute(
                delete(InterviewQuestion).where(InterviewQuestion.session_id.in_(session_ids))
            )
            await self.db_session.execute(
                delete(InterviewEvaluation).where(InterviewEvaluation.session_id.in_(session_ids))
            )
            await self.db_session.execute(
                delete(InterviewSession).where(InterviewSession.id.in_(session_ids))
            )

        postings_result = await self.db_session.execute(
            select(JobPosting.id).where(JobPosting.hr_user_id == user_id)
        )
        posting_ids = list(postings_result.scalars().all())
        if posting_ids:
            hr_sessions_result = await self.db_session.execute(
                select(InterviewSession.id).where(InterviewSession.job_posting_id.in_(posting_ids))
            )
            hr_session_ids = list(hr_sessions_result.scalars().all())
            if hr_session_ids:
                await self.db_session.execute(
                    delete(InterviewAnswer).where(InterviewAnswer.session_id.in_(hr_session_ids))
                )
                await self.db_session.execute(
                    delete(InterviewQuestion).where(InterviewQuestion.session_id.in_(hr_session_ids))
                )
                await self.db_session.execute(
                    delete(InterviewEvaluation).where(InterviewEvaluation.session_id.in_(hr_session_ids))
                )
                await self.db_session.execute(
                    delete(InterviewSession).where(InterviewSession.id.in_(hr_session_ids))
                )
            
            await self.db_session.execute(
                delete(CvJdAnalysis).where(CvJdAnalysis.job_posting_id.in_(posting_ids))
            )
            await self.db_session.execute(
                delete(JobPosting).where(JobPosting.id.in_(posting_ids))
            )

        await self.db_session.execute(
            delete(CvJdAnalysis).where(CvJdAnalysis.analyst_user_id == user_id)
        )
        await self.db_session.execute(
            delete(Document).where(Document.owner_user_id == user_id)
        )
        await self.db_session.execute(
            delete(AuthIdentity).where(AuthIdentity.user_id == user_id)
        )
        await self.db_session.execute(
            delete(OAuthToken).where(OAuthToken.user_id == user_id)
        )
        await self.db_session.execute(
            delete(User).where(User.id == user_id)
        )
        await self.db_session.commit()

    async def get_statistics(self) -> dict[str, Any]:
        from db.models.users import User
        from db.models.document import Document
        from db.models.interview import InterviewSession
        from db.models.subscription_plan import SubscriptionPlan
        from sqlalchemy import func, cast, Date
        from datetime import datetime, timedelta

        users_count = (await self.db_session.execute(select(func.count(User.id)))).scalar() or 0
        cvs_count = (await self.db_session.execute(select(func.count(Document.id)).where(Document.document_type == "cv"))).scalar() or 0
        jds_count = (await self.db_session.execute(select(func.count(Document.id)).where(Document.document_type == "jd"))).scalar() or 0
        interviews_count = (await self.db_session.execute(select(func.count(InterviewSession.id)))).scalar() or 0

        role_result = await self.db_session.execute(
            select(User.role, func.count(User.id)).group_by(User.role)
        )
        role_distribution = {str(r[0].value if hasattr(r[0], "value") else r[0]): r[1] for r in role_result.all() if r[0]}

        plan_counts_res = await self.db_session.execute(
            select(User.plan_id, func.count(User.id)).group_by(User.plan_id)
        )
        plans_res = await self.db_session.execute(select(SubscriptionPlan.id, SubscriptionPlan.name))
        plan_id_to_name = {p[0]: str(p[1].value if hasattr(p[1], "value") else p[1]).upper() for p in plans_res.all()}

        plan_distribution = {"FREE": 0, "PRO": 0, "ULTRA": 0}
        for plan_id, count in plan_counts_res.all():
            name = plan_id_to_name.get(plan_id, "FREE")
            plan_distribution[name] = plan_distribution.get(name, 0) + count

        # Daily interviews last 7 days
        seven_days_ago = datetime.utcnow().date() - timedelta(days=6)
        daily_result = await self.db_session.execute(
            select(cast(InterviewSession.created_at, Date), func.count(InterviewSession.id))
            .where(cast(InterviewSession.created_at, Date) >= seven_days_ago)
            .group_by(cast(InterviewSession.created_at, Date))
            .order_by(cast(InterviewSession.created_at, Date).asc())
        )
        
        daily_map = {r[0]: r[1] for r in daily_result.all() if r[0]}
        daily_interviews = []
        for i in range(7):
            d = seven_days_ago + timedelta(days=i)
            daily_interviews.append({
                "date": d.strftime("%d/%m"),
                "count": daily_map.get(d, 0)
            })

        return {
            "total_users": users_count,
            "total_cvs": cvs_count,
            "total_jds": jds_count,
            "total_interviews": interviews_count,
            "role_distribution": role_distribution,
            "plan_distribution": plan_distribution,
            "daily_interviews": daily_interviews
        }

    async def list_all_documents(
        self,
        page: int = 1,
        page_size: int = 20,
    ) -> dict[str, Any]:
        from db.models.document import Document
        from db.models.users import User
        from schemas.responses.admin_schema import AdminDocumentSchema
        from sqlalchemy import func

        page = max(1, page)
        page_size = min(max(1, page_size), 100)

        count_query = select(func.count(Document.id)).where(Document.deleted_at.is_(None))
        total = int((await self.db_session.execute(count_query)).scalar_one() or 0)

        query = (
            select(
                Document.id,
                Document.owner_user_id,
                User.email_encrypted.label("owner_email_encrypted"),
                User.name_encrypted.label("owner_name_encrypted"),
                Document.document_type,
                Document.file_name,
                Document.mime_type,
                Document.size_bytes,
                Document.created_at,
                Document.metadata_json,
            )
            .join(User, Document.owner_user_id == User.id)
            .where(Document.deleted_at.is_(None))
            .order_by(Document.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        res = await self.db_session.execute(query)
        items = []
        for row in res.mappings().all():
            items.append(AdminDocumentSchema.model_validate(dict(row)).model_dump(mode="json"))

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    async def list_all_interviews(
        self,
        page: int = 1,
        page_size: int = 20,
    ) -> dict[str, Any]:
        from db.models.interview import InterviewSession, InterviewEvaluation
        from db.models.users import User
        from db.models.job_posting import JobPosting
        from db.models.document import Document
        from schemas.responses.admin_schema import AdminInterviewSchema
        from sqlalchemy import func

        page = max(1, page)
        page_size = min(max(1, page_size), 100)

        count_query = select(func.count(InterviewSession.id)).where(InterviewSession.deleted_at.is_(None))
        total = int((await self.db_session.execute(count_query)).scalar_one() or 0)

        query = (
            select(
                InterviewSession.id,
                InterviewSession.candidate_user_id,
                User.email_encrypted.label("candidate_email_encrypted"),
                User.name_encrypted.label("candidate_name_encrypted"),
                InterviewSession.session_type,
                InterviewSession.status,
                InterviewSession.created_at,
                InterviewEvaluation.overall_score,
                JobPosting.title.label("job_posting_title"),
                Document.file_name.label("cv_document_name"),
            )
            .join(User, InterviewSession.candidate_user_id == User.id)
            .outerjoin(InterviewEvaluation, InterviewSession.id == InterviewEvaluation.session_id)
            .outerjoin(JobPosting, InterviewSession.job_posting_id == JobPosting.id)
            .outerjoin(Document, InterviewSession.cv_document_id == Document.id)
            .where(InterviewSession.deleted_at.is_(None))
            .order_by(InterviewSession.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        res = await self.db_session.execute(query)
        items = []
        for row in res.mappings().all():
            items.append(AdminInterviewSchema.model_validate(dict(row)).model_dump(mode="json"))

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    async def list_all_matches(
        self,
        page: int = 1,
        page_size: int = 20,
    ) -> dict[str, Any]:
        from db.models.cv_jd_analysis import CvJdAnalysis
        from db.models.users import User
        from db.models.job_posting import JobPosting
        from schemas.responses.admin_schema import AdminMatchSchema
        from sqlalchemy import func

        page = max(1, page)
        page_size = min(max(1, page_size), 100)

        count_query = select(func.count(CvJdAnalysis.id)).where(CvJdAnalysis.deleted_at.is_(None))
        total = int((await self.db_session.execute(count_query)).scalar_one() or 0)

        query = (
            select(
                CvJdAnalysis.id,
                CvJdAnalysis.analyst_user_id,
                User.email_encrypted.label("analyst_email_encrypted"),
                User.name_encrypted.label("analyst_name_encrypted"),
                CvJdAnalysis.cv_document_id,
                CvJdAnalysis.cv_file_name_snapshot,
                CvJdAnalysis.overall_score,
                CvJdAnalysis.created_at,
                JobPosting.title.label("job_posting_title"),
            )
            .join(User, CvJdAnalysis.analyst_user_id == User.id)
            .outerjoin(JobPosting, CvJdAnalysis.job_posting_id == JobPosting.id)
            .where(CvJdAnalysis.deleted_at.is_(None))
            .order_by(CvJdAnalysis.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        res = await self.db_session.execute(query)
        items = []
        for row in res.mappings().all():
            items.append(AdminMatchSchema.model_validate(dict(row)).model_dump(mode="json"))

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    async def delete_match_report(self, analysis_id: int) -> None:
        from db.models.cv_jd_analysis import CvJdAnalysis
        from datetime import datetime, timezone

        query = select(CvJdAnalysis).where(
            CvJdAnalysis.id == analysis_id,
            CvJdAnalysis.deleted_at.is_(None),
        )
        res = await self.db_session.execute(query)
        analysis = res.scalar_one_or_none()
        if not analysis:
            raise ExceptionValueError(message="Analysis report not found.", status_code=404)

        analysis.deleted_at = datetime.now(timezone.utc)
        self.db_session.add(analysis)
        await self.db_session.commit()

    async def get_user_details(self, user_id: int) -> dict[str, Any]:
        from db.models.users import User
        from db.models.document import Document
        from db.models.interview import InterviewSession, InterviewEvaluation
        from db.models.job_posting import JobPosting
        from schemas.responses.admin_schema import (
            AdminUserDetailSchema,
            AdminUserDetailDocumentSchema,
            AdminUserDetailSessionSchema,
        )

        res = await self.db_session.execute(
            select(User).options(selectinload(User.plan)).where(User.id == user_id)
        )
        user = res.scalar_one_or_none()
        if not user:
            raise ExceptionValueError(message="User not found.", status_code=404)

        docs_res = await self.db_session.execute(
            select(Document)
            .where(Document.owner_user_id == user_id, Document.deleted_at.is_(None))
            .order_by(Document.created_at.desc())
        )
        documents = [
            AdminUserDetailDocumentSchema.model_validate(d).model_dump(mode="json")
            for d in docs_res.scalars().all()
        ]

        sessions_res = await self.db_session.execute(
            select(
                InterviewSession.id,
                InterviewSession.session_type,
                InterviewSession.status,
                InterviewSession.created_at,
                InterviewEvaluation.overall_score,
                JobPosting.title.label("job_posting_title"),
            )
            .outerjoin(InterviewEvaluation, InterviewSession.id == InterviewEvaluation.session_id)
            .outerjoin(JobPosting, InterviewSession.job_posting_id == JobPosting.id)
            .where(InterviewSession.candidate_user_id == user_id, InterviewSession.deleted_at.is_(None))
            .order_by(InterviewSession.created_at.desc())
        )
        interviews = []
        for row in sessions_res.mappings().all():
            interviews.append(
                AdminUserDetailSessionSchema.model_validate(dict(row)).model_dump(mode="json")
            )

        used_today = (await self._practice_usage_today_by_user_id([user.id])).get(user.id, 0)
        detail_data = AdminUserDetailSchema.model_validate(user).model_dump(mode="json")
        detail_data.update(self._practice_quota_for_user(user, used_today))
        detail_data["documents"] = documents
        detail_data["interviews"] = interviews
        return detail_data
