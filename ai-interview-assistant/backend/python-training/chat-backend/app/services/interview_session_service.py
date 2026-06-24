from pathlib import Path
from typing import Any

from configuration.settings import configuration
from core.enums.document_enum import DocumentType
from core.enums.user_enum import UserRole
from core.exception_handler.custom_exception import ExceptionValueError
from db.db_connection import Database
from db.models.cv_jd_analysis import CvJdAnalysis
from db.models.document import Document
from db.models.interview import (
    InterviewAnswer,
    InterviewEvaluation,
    InterviewQuestion,
    InterviewSession,
)
from db.models.job_posting import JobPosting
from db.models.users import User
from fastapi import UploadFile
from services.document_service import DocumentService
from services.file_storage_service import get_storage_service
from services.interview_ai_service import ResilientInterviewAiProvider
from services.job_posting_service import STATUS_PUBLISHED, JobPostingService
from services.notification_service import NotificationService
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

STATUS_CREATED = "created"
STATUS_QUESTIONS_GENERATED = "questions_generated"
STATUS_IN_PROGRESS = "in_progress"
STATUS_SUBMITTED = "submitted"
STATUS_TRANSCRIBING = "transcribing"
STATUS_EVALUATING = "evaluating"
STATUS_COMPLETED = "completed"
STATUS_FAILED = "failed"
SESSION_TYPE_OFFICIAL = "official"
SESSION_TYPE_PRACTICE = "practice"
ACTIVE_SESSION_STATUSES = {
    STATUS_CREATED,
    STATUS_QUESTIONS_GENERATED,
    STATUS_IN_PROGRESS,
    STATUS_TRANSCRIBING,
}


class InterviewSessionService:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session
        self.document_service = DocumentService(db_session)
        self.ai_provider = ResilientInterviewAiProvider()
        self.storage_service = get_storage_service()

    async def create_session(
        self,
        user: User,
        session_type: str = SESSION_TYPE_OFFICIAL,
        job_posting_id: int | None = None,
        cv_document_id: int | None = None,
        analysis_id: int | None = None,
        practice_config: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if user.role == UserRole.HR:
            raise ExceptionValueError(
                message="HR cannot create candidate interview sessions.",
                status_code=403,
            )
        normalized_type = str(session_type or SESSION_TYPE_OFFICIAL).strip().lower()
        if normalized_type == SESSION_TYPE_PRACTICE:
            if analysis_id:
                try:
                    analysis = await self._get_analysis(analysis_id)
                    if analysis:
                        job_posting_id = analysis.job_posting_id or job_posting_id
                        cv_document_id = analysis.cv_document_id or cv_document_id
                except Exception:
                    pass
            return await self._create_practice_session(
                user=user,
                job_posting_id=job_posting_id,
                cv_document_id=cv_document_id,
                practice_config=practice_config,
            )
        if normalized_type != SESSION_TYPE_OFFICIAL:
            raise ExceptionValueError(message="Invalid interview session type.", status_code=422)

        posting, cv_document, analysis = await self._resolve_official_context(
            user=user,
            job_posting_id=job_posting_id,
            cv_document_id=cv_document_id,
            analysis_id=analysis_id,
        )

        # Enforce official interview limit: only 1 official session per CV per Job Posting
        query_completed = (
            select(InterviewSession)
            .where(
                InterviewSession.deleted_at.is_(None),
                InterviewSession.candidate_user_id == user.id,
                InterviewSession.session_type == SESSION_TYPE_OFFICIAL,
                InterviewSession.cv_document_id == cv_document.id,
                InterviewSession.job_posting_id == posting.id,
                InterviewSession.status.notin_(ACTIVE_SESSION_STATUSES)
            )
            .limit(1)
        )
        completed_sess = (await self.db_session.execute(query_completed)).scalar_one_or_none()
        if completed_sess:
            raise ExceptionValueError(
                message="Bạn đã thực hiện phỏng vấn chính thức với CV này cho công việc này rồi. Mỗi CV chỉ được phỏng vấn chính thức một lần duy nhất.",
                status_code=400
            )

        existing = await self._find_active_official_session(
            user_id=user.id,
            analysis_id=analysis.id if analysis else None,
        )
        if existing:
            return await self.serialize_session(existing)

        session = InterviewSession(
            candidate_user_id=user.id,
            session_type=SESSION_TYPE_OFFICIAL,
            job_posting_id=posting.id,
            cv_document_id=cv_document.id,
            analysis_id=analysis.id if analysis else None,
            status=STATUS_CREATED,
            practice_config_json={},
        )
        self.db_session.add(session)
        await self.db_session.commit()
        await self.db_session.refresh(session)
        return await self.serialize_session(session)

    async def _create_practice_session(
        self,
        user: User,
        job_posting_id: int | None = None,
        cv_document_id: int | None = None,
        practice_config: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        # Count practice sessions for the current day
        from datetime import datetime, time
        from db.models.subscription_plan import SubscriptionPlan
        from core.enums.subscription_enum import SubscriptionPlanName

        start_of_day = datetime.combine(datetime.utcnow().date(), time.min)
        if not cv_document_id:
            raise ExceptionValueError(
                message="Vui lòng chọn CV phù hợp trước khi bắt đầu luyện tập.",
                status_code=422,
            )

        cv_document = await self.document_service._get_accessible_document(
            user=user,
            document_id=cv_document_id,
        )
        if cv_document.document_type != DocumentType.CV:
            raise ExceptionValueError(
                message="Phiên luyện tập chỉ có thể dùng tài liệu CV.",
                status_code=422,
            )
        if user.role == UserRole.USER and cv_document.owner_user_id != user.id:
            raise ExceptionValueError(
                message="Bạn chỉ có thể luyện tập với CV của chính mình.",
                status_code=403,
            )
        
        plan_name = SubscriptionPlanName.FREE
        user_plan = None
        if user.plan_id:
            plan_result = await self.db_session.execute(
                select(SubscriptionPlan).where(SubscriptionPlan.id == user.plan_id)
            )
            user_plan = plan_result.scalar_one_or_none()
            if user_plan:
                plan_name = user_plan.name

        query_count = (
            select(func.count(InterviewSession.id))
            .where(
                InterviewSession.candidate_user_id == user.id,
                InterviewSession.session_type == SESSION_TYPE_PRACTICE,
                InterviewSession.created_at >= start_of_day,
                InterviewSession.deleted_at.is_(None)
            )
        )
        count_val = (await self.db_session.execute(query_count)).scalar() or 0
        additional_slots = getattr(user, "additional_practice_slots", 0) or 0
        base_limit = user_plan.practice_sessions_per_day if user_plan else 2
        limit = base_limit + additional_slots if base_limit is not None else None
        if limit is not None and count_val >= limit:
            plan_display = getattr(getattr(user_plan, "name", None), "value", None) or "free"
            raise ExceptionValueError(
                message=f"Gói {str(plan_display).upper()} chỉ cho phép tối đa {limit} phiên luyện tập mỗi ngày. Vui lòng nâng cấp gói hoặc liên hệ quản trị viên.",
                status_code=400,
            )
        plan_name = SubscriptionPlanName.ULTRA

        plan_str = str(plan_name).upper()
        additional_slots = getattr(user, "additional_practice_slots", 0) or 0
        
        if plan_str == "FREE":
            limit = 2 + additional_slots
            if count_val >= limit:
                raise ExceptionValueError(
                    message=f"Tài khoản gói Miễn phí (FREE) chỉ được thực hiện tối đa {limit} buổi phỏng vấn luyện tập mỗi ngày. Vui lòng nâng cấp gói dịch vụ để tiếp tục hoặc liên hệ quản trị viên.",
                    status_code=400
                )
        elif plan_str == "PRO":
            limit = 10 + additional_slots
            if count_val >= limit:
                raise ExceptionValueError(
                    message=f"Tài khoản gói Chuyên nghiệp (PRO) chỉ được thực hiện tối đa {limit} buổi phỏng vấn luyện tập mỗi ngày. Vui lòng nâng cấp lên gói ULTRA để phỏng vấn không giới hạn hoặc liên hệ quản trị viên.",
                    status_code=400
                )

        config = self._normalize_practice_config(
            practice_config or {},
            has_job_posting=bool(job_posting_id),
        )
        session = InterviewSession(
            candidate_user_id=user.id,
            session_type=SESSION_TYPE_PRACTICE,
            job_posting_id=job_posting_id,
            cv_document_id=cv_document.id,
            analysis_id=None,
            status=STATUS_CREATED,
            practice_config_json=config,
        )
        self.db_session.add(session)
        await self.db_session.commit()
        await self.db_session.refresh(session)
        return await self.serialize_session(session)

    async def _resolve_official_context(
        self,
        user: User,
        job_posting_id: int | None,
        cv_document_id: int | None,
        analysis_id: int | None,
    ) -> tuple[JobPosting, Document, CvJdAnalysis | None]:
        analysis = await self._get_analysis(analysis_id) if analysis_id else None
        if analysis:
            if user.role != UserRole.ADMIN and analysis.analyst_user_id != user.id:
                raise ExceptionValueError(message="Cannot attach another user's analysis report.", status_code=403)
            job_posting_id = analysis.job_posting_id or job_posting_id
            cv_document_id = analysis.cv_document_id or cv_document_id
        if not job_posting_id or not cv_document_id:
            raise ExceptionValueError(
                message="Official interview requires analysis_id or job_posting_id and cv_document_id.",
                status_code=422,
            )
        posting = await self._get_published_posting(job_posting_id)
        cv_document = await self.document_service._get_accessible_document(
            user=user,
            document_id=cv_document_id,
        )
        if cv_document.document_type != DocumentType.CV:
            raise ExceptionValueError(message="Interview requires a CV document.", status_code=422)
        if user.role == UserRole.USER and cv_document.owner_user_id != user.id:
            raise ExceptionValueError(message="You can only interview with your own CV.", status_code=403)
        return posting, cv_document, analysis

    async def _find_active_official_session(
        self,
        user_id: int,
        analysis_id: int | None,
    ) -> InterviewSession | None:
        if not analysis_id:
            return None
        query = (
            select(InterviewSession)
            .where(
                InterviewSession.deleted_at.is_(None),
                InterviewSession.candidate_user_id == user_id,
                InterviewSession.session_type == SESSION_TYPE_OFFICIAL,
                InterviewSession.analysis_id == analysis_id,
                InterviewSession.status.in_(ACTIVE_SESSION_STATUSES),
            )
            .order_by(InterviewSession.created_at.desc())
            .limit(1)
        )
        return (await self.db_session.execute(query)).scalar_one_or_none()

    async def _question_context(self, session: InterviewSession) -> dict[str, Any]:
        if session.session_type == SESSION_TYPE_PRACTICE:
            config = session.practice_config_json or {}
            focus = str(config.get("focus") or "General interview practice")
            role = str(config.get("target_role") or "Target role")
            
            job_title = role
            context_lines = [
                f"Practice focus: {focus}",
                f"Language: {config.get('language') or 'Vietnamese'}",
            ]
            if not session.job_posting_id:
                context_lines.insert(1, f"Level: {config.get('level') or 'General'}")
            jd_text = "\n".join(context_lines)
            cv_text = ""
            
            if session.job_posting_id:
                try:
                    posting = await self._get_posting(session.job_posting_id)
                    job_title = posting.title
                    jd_text += f"\n\nTarget Job Posting:\n{self._posting_text(posting)}"
                except Exception:
                    pass
            
            if session.cv_document_id:
                try:
                    from services.cv_parser_service import CvParserService
                    cv_parser = CvParserService(self.db_session)
                    user_obj = User(id=session.candidate_user_id, role=UserRole.USER)
                    parsed_cv = await cv_parser.parse_cv_document(user=user_obj, document_id=session.cv_document_id)
                    cv_text = parsed_cv.get("extracted_text", "")
                except Exception:
                    pass

            return {
                "job_title": job_title,
                "jd_text": jd_text,
                "cv_text": cv_text,
                "analysis_report": {},
                "missing_skills": [],
                "session_type": SESSION_TYPE_PRACTICE,
            }

    @staticmethod
    def _normalize_practice_config(config: dict[str, Any], has_job_posting: bool = False) -> dict[str, Any]:
        normalized = {
            "target_role": str(config.get("target_role") or "Target role").strip(),
            "focus": str(config.get("focus") or "General interview").strip(),
            "language": str(config.get("language") or "vi").strip(),
        }
        if not has_job_posting:
            normalized["level"] = str(config.get("level") or "General").strip()
        return normalized

    async def generate_questions(self, user: User, session_id: int) -> dict[str, Any]:
        session = await self._get_accessible_session(user=user, session_id=session_id)
        existing = await self._get_questions(session.id)
        if existing:
            return await self.serialize_session(session)

        context = await self._question_context(session)
        questions = await self.ai_provider.generate_questions(context)
        for index, item in enumerate(questions, start=1):
            self.db_session.add(
                InterviewQuestion(
                    session_id=session.id,
                    question_order=index,
                    question_text=item["question_text"],
                    category=item.get("category"),
                    expected_signal=item.get("expected_signal"),
                )
            )
        session.status = STATUS_QUESTIONS_GENERATED
        self.db_session.add(session)
        await self.db_session.commit()
        await self.db_session.refresh(session)
        return await self.serialize_session(session)

    async def upload_answer(
        self,
        user: User,
        session_id: int,
        question_id: int,
        duration_seconds: float | None,
        client_transcript: str | None = None,
        audio: UploadFile | None = None,
        video: UploadFile | None = None,
    ) -> tuple[dict[str, Any], bytes | None, str, str]:
        session = await self._get_accessible_session(user=user, session_id=session_id)
        question = await self._get_question(session.id, question_id)
        if audio is None and video is None:
            raise ExceptionValueError(message="Upload audio or video for the answer.", status_code=422)

        audio_bytes: bytes | None = None
        audio_key = None
        video_key = None
        size_bytes = 0
        mime_type = None

        if audio is not None:
            audio_bytes = await audio.read()
            size_bytes += len(audio_bytes)
            mime_type = audio.content_type or mime_type
            await audio.seek(0)
            audio_key = await self.storage_service.save_file(
                file=audio,
                sub_dir=self._recording_prefix(session),
            )
        if video is not None:
            video_bytes = await video.read()
            size_bytes += len(video_bytes)
            mime_type = video.content_type or mime_type
            await video.seek(0)
            video_key = await self.storage_service.save_file(
                file=video,
                sub_dir=self._recording_prefix(session),
            )

        order = await self._next_answer_order(session.id)
        initial_transcript = str(client_transcript or "").strip() or None
        answer = InterviewAnswer(
            session_id=session.id,
            question_id=question.id,
            answer_order=order,
            audio_storage_key=audio_key,
            video_storage_key=video_key,
            mime_type=mime_type,
            duration_seconds=duration_seconds,
            size_bytes=size_bytes,
            transcript=initial_transcript,
            transcription_status="processing" if audio_bytes else ("completed" if initial_transcript else "skipped"),
        )
        session.status = STATUS_TRANSCRIBING if audio_bytes else STATUS_IN_PROGRESS
        self.db_session.add(answer)
        self.db_session.add(session)
        await self.db_session.commit()
        await self.db_session.refresh(answer)
        await self.db_session.refresh(session)
        return (
            self.serialize_answer(answer),
            audio_bytes,
            audio.filename if audio is not None else "answer.webm",
            audio.content_type if audio is not None else "audio/webm",
        )

    async def finish_session(self, user: User, session_id: int) -> dict[str, Any]:
        session = await self._get_accessible_session(user=user, session_id=session_id)
        session.status = STATUS_EVALUATING
        self.db_session.add(session)
        await self._notify_hr_official_video_ready(session=session, actor_user_id=user.id)
        await self.db_session.commit()
        await self.db_session.refresh(session)
        return await self.serialize_session(session)

    async def list_my(self, user: User, session_type: str | None = None) -> dict[str, Any]:
        query = (
            select(InterviewSession)
            .where(
                InterviewSession.deleted_at.is_(None),
                InterviewSession.candidate_user_id == user.id,
                InterviewSession.session_type == SESSION_TYPE_OFFICIAL,
            )
            .order_by(InterviewSession.created_at.desc())
        )
        result = await self.db_session.execute(query)
        items = [await self.serialize_session(item) for item in result.scalars().all()]
        return {"items": items, "total": len(items)}

    async def list_hr(self, user: User, job_posting_id: int | None = None) -> dict[str, Any]:
        query = select(InterviewSession).where(
            InterviewSession.deleted_at.is_(None),
            InterviewSession.session_type == SESSION_TYPE_OFFICIAL,
        )
        if job_posting_id:
            query = query.where(InterviewSession.job_posting_id == job_posting_id)
        if user.role != UserRole.ADMIN:
            query = query.join(JobPosting, InterviewSession.job_posting_id == JobPosting.id).where(
                JobPosting.hr_user_id == user.id
            )
        query = query.order_by(InterviewSession.created_at.desc())
        result = await self.db_session.execute(query)
        items = [await self.serialize_session(item) for item in result.scalars().all()]
        return {"items": items, "total": len(items)}

    async def get_detail(self, user: User, session_id: int) -> dict[str, Any]:
        session = await self._get_accessible_session(user=user, session_id=session_id)
        return await self.serialize_session(session)

    async def get_report(self, user: User, session_id: int) -> dict[str, Any]:
        return await self.get_detail(user=user, session_id=session_id)

    async def compare_sessions(self, user: User, session_ids: list[int]) -> dict[str, Any]:
        if len(session_ids) < 2:
            raise ExceptionValueError(
                message="Vui lòng chọn ít nhất 2 phiên phỏng vấn để so sánh.",
                status_code=400,
            )

        query = select(InterviewSession).where(
            InterviewSession.id.in_(session_ids),
            InterviewSession.deleted_at.is_(None),
        )
        result = await self.db_session.execute(query)
        sessions = list(result.scalars().all())

        if len(sessions) != len(session_ids):
            raise ExceptionValueError(
                message="Một hoặc nhiều phiên phỏng vấn không tìm thấy.",
                status_code=404,
            )

        job_title = "Vị trí tuyển dụng"
        jd_text = ""
        
        sessions_data = []
        for s in sessions:
            is_owner = s.candidate_user_id == user.id
            is_hr_for_posting = False
            
            if s.job_posting_id:
                try:
                    posting = await self._get_posting(s.job_posting_id)
                    if posting:
                        job_title = posting.title
                        jd_text = self._posting_text(posting)
                        if user.role == UserRole.HR and posting.hr_user_id == user.id:
                            is_hr_for_posting = True
                except Exception:
                    pass
            
            if user.role != UserRole.ADMIN and not is_owner and not is_hr_for_posting:
                raise ExceptionValueError(
                    message=f"Bạn không có quyền truy cập phiên phỏng vấn #{s.id}.",
                    status_code=403,
                )

            if s.status != STATUS_COMPLETED:
                raise ExceptionValueError(
                    message=f"Phiên phỏng vấn #{s.id} chưa hoàn thành đánh giá. Chỉ có thể so sánh các phiên đã hoàn tất.",
                    status_code=400,
                )

            query_cand = select(User).where(User.id == s.candidate_user_id)
            cand = (await self.db_session.execute(query_cand)).scalar_one_or_none()
            cand_name = cand.name if cand else f"Ứng viên #{s.candidate_user_id}"

            questions = await self._get_questions(s.id)
            answers = await self._get_answers(s.id)
            evaluation = await self._get_evaluation(s.id)

            sessions_data.append({
                "id": s.id,
                "candidate_name": cand_name,
                "evaluation": self.serialize_evaluation(evaluation) if evaluation else None,
                "questions": [self.serialize_question(q) for q in questions],
                "answers": [self.serialize_answer(a) for a in answers]
            })

        try:
            comparison_report = await self.ai_provider.compare_sessions(
                job_title=job_title,
                jd_text=jd_text,
                sessions_data=sessions_data
            )
            return comparison_report
        except Exception as exc:
            raise ExceptionValueError(
                message=f"Lỗi khi gọi AI so sánh: {str(exc)}",
                status_code=500
            )

    async def delete_session(self, user: User, session_id: int) -> None:
        query = select(InterviewSession).where(
            InterviewSession.deleted_at.is_(None),
            InterviewSession.id == session_id
        )
        if user.role != UserRole.ADMIN:
            query = query.where(InterviewSession.candidate_user_id == user.id)
        session = (await self.db_session.execute(query)).scalar_one_or_none()
        if not session:
            raise ExceptionValueError(message="Interview session not found.", status_code=404)

        query_answers = select(InterviewAnswer).where(InterviewAnswer.session_id == session.id)
        answers = (await self.db_session.execute(query_answers)).scalars().all()
        for answer in answers:
            if answer.audio_storage_key:
                try:
                    await self.storage_service.delete_file(answer.audio_storage_key)
                except Exception as exc:
                    log.error("Failed to delete audio file: %s", exc)
            if answer.video_storage_key:
                try:
                    await self.storage_service.delete_file(answer.video_storage_key)
                except Exception as exc:
                    log.error("Failed to delete video file: %s", exc)

        await self.db_session.execute(delete(InterviewEvaluation).where(InterviewEvaluation.session_id == session.id))
        await self.db_session.execute(delete(InterviewAnswer).where(InterviewAnswer.session_id == session.id))
        await self.db_session.execute(delete(InterviewQuestion).where(InterviewQuestion.session_id == session.id))
        await self.db_session.execute(delete(InterviewSession).where(InterviewSession.id == session.id))
        await self.db_session.commit()

    async def get_media_path_or_url(self, user: User, answer_id: int, kind: str) -> tuple[str, str, str]:
        answer = await self._get_answer(answer_id)
        await self._get_accessible_session(user=user, session_id=answer.session_id)
        storage_key = answer.audio_storage_key if kind == "audio" else answer.video_storage_key
        if not storage_key:
            raise ExceptionValueError(message="Interview media not found.", status_code=404)
        if self.storage_service.supports_presigned_download:
            response = await self.storage_service.create_presigned_download(storage_key)
            return "redirect", response["download_url"], answer.mime_type or "application/octet-stream"
        upload_root = Path(configuration.UPLOAD_DIR).resolve()
        file_path = Path(storage_key).resolve()
        if not file_path.is_relative_to(upload_root) or not file_path.is_file():
            raise ExceptionValueError(message="Interview media file not found.", status_code=404)
        return "file", str(file_path), answer.mime_type or "application/octet-stream"

    async def serialize_session(self, session: InterviewSession) -> dict[str, Any]:
        posting = await self._get_posting(session.job_posting_id) if session.job_posting_id else None
        evaluation = await self._get_evaluation(session.id)
        return {
            "id": session.id,
            "candidate_user_id": session.candidate_user_id,
            "session_type": session.session_type or SESSION_TYPE_OFFICIAL,
            "job_posting_id": session.job_posting_id,
            "cv_document_id": session.cv_document_id,
            "analysis_id": session.analysis_id,
            "status": session.status,
            "failure_reason": session.failure_reason,
            "practice_config": session.practice_config_json or {},
            "created_at": session.created_at,
            "updated_at": session.updated_at,
            "job_posting": JobPostingService.serialize(posting) if posting else None,
            "questions": [self.serialize_question(item) for item in await self._get_questions(session.id)],
            "answers": [self.serialize_answer(item) for item in await self._get_answers(session.id)],
            "evaluation": self.serialize_evaluation(evaluation) if evaluation else None,
        }

    async def _get_accessible_session(self, user: User, session_id: int) -> InterviewSession:
        query = select(InterviewSession).where(
            InterviewSession.id == session_id,
            InterviewSession.deleted_at.is_(None),
        )
        session = (await self.db_session.execute(query)).scalar_one_or_none()
        if session is None:
            raise ExceptionValueError(message="Interview session not found.", status_code=404)
        if user.role == UserRole.ADMIN or session.candidate_user_id == user.id:
            return session
        if session.session_type == SESSION_TYPE_PRACTICE:
            raise ExceptionValueError(
                message="You do not have permission to access this interview session.",
                status_code=403,
            )
        if not session.job_posting_id:
            raise ExceptionValueError(
                message="You do not have permission to access this interview session.",
                status_code=403,
            )
        posting = await self._get_posting(session.job_posting_id)
        if user.role == UserRole.HR and posting.hr_user_id == user.id:
            return session
        raise ExceptionValueError(
            message="You do not have permission to access this interview session.",
            status_code=403,
        )

    async def _get_published_posting(self, posting_id: int) -> JobPosting:
        posting = await self._get_posting(posting_id)
        if posting.status != STATUS_PUBLISHED:
            raise ExceptionValueError(message="Job posting is not published.", status_code=422)
        return posting

    async def _get_posting(self, posting_id: int | None) -> JobPosting:
        if not posting_id:
            raise ExceptionValueError(message="Job posting not found.", status_code=404)
        query = select(JobPosting).where(JobPosting.id == posting_id, JobPosting.deleted_at.is_(None))
        posting = (await self.db_session.execute(query)).scalar_one_or_none()
        if posting is None:
            raise ExceptionValueError(message="Job posting not found.", status_code=404)
        return posting

    async def _get_analysis(self, analysis_id: int | None) -> CvJdAnalysis | None:
        if not analysis_id:
            return None
        query = select(CvJdAnalysis).where(CvJdAnalysis.id == analysis_id, CvJdAnalysis.deleted_at.is_(None))
        return (await self.db_session.execute(query)).scalar_one_or_none()

    async def _ensure_analysis_access(self, user: User, analysis_id: int) -> None:
        analysis = await self._get_analysis(analysis_id)
        if analysis is None:
            raise ExceptionValueError(message="Analysis report not found.", status_code=404)
        if user.role != UserRole.ADMIN and analysis.analyst_user_id != user.id:
            raise ExceptionValueError(message="Cannot attach another user's analysis report.", status_code=403)

    async def _get_question(self, session_id: int, question_id: int) -> InterviewQuestion:
        query = select(InterviewQuestion).where(
            InterviewQuestion.id == question_id,
            InterviewQuestion.session_id == session_id,
            InterviewQuestion.deleted_at.is_(None),
        )
        question = (await self.db_session.execute(query)).scalar_one_or_none()
        if question is None:
            raise ExceptionValueError(message="Interview question not found.", status_code=404)
        return question

    async def _get_questions(self, session_id: int) -> list[InterviewQuestion]:
        query = (
            select(InterviewQuestion)
            .where(InterviewQuestion.session_id == session_id, InterviewQuestion.deleted_at.is_(None))
            .order_by(InterviewQuestion.question_order.asc())
        )
        result = await self.db_session.execute(query)
        return list(result.scalars().all())

    async def _get_answers(self, session_id: int) -> list[InterviewAnswer]:
        query = (
            select(InterviewAnswer)
            .where(InterviewAnswer.session_id == session_id, InterviewAnswer.deleted_at.is_(None))
            .order_by(InterviewAnswer.answer_order.asc())
        )
        result = await self.db_session.execute(query)
        return list(result.scalars().all())

    async def _get_answer(self, answer_id: int) -> InterviewAnswer:
        query = select(InterviewAnswer).where(InterviewAnswer.id == answer_id, InterviewAnswer.deleted_at.is_(None))
        answer = (await self.db_session.execute(query)).scalar_one_or_none()
        if answer is None:
            raise ExceptionValueError(message="Interview answer not found.", status_code=404)
        return answer

    async def _get_evaluation(self, session_id: int) -> InterviewEvaluation | None:
        query = (
            select(InterviewEvaluation)
            .where(InterviewEvaluation.session_id == session_id, InterviewEvaluation.deleted_at.is_(None))
            .order_by(InterviewEvaluation.created_at.desc())
        )
        return (await self.db_session.execute(query)).scalars().first()

    async def _next_answer_order(self, session_id: int) -> int:
        query = select(func.max(InterviewAnswer.answer_order)).where(InterviewAnswer.session_id == session_id)
        value = (await self.db_session.execute(query)).scalar_one_or_none()
        return int(value or 0) + 1

    @staticmethod
    def _recording_prefix(session: InterviewSession) -> str:
        base_prefix = configuration.INTERVIEW_RECORDING_PREFIX.strip("/") or "interviews"
        session_type = session.session_type or SESSION_TYPE_OFFICIAL
        type_prefix = SESSION_TYPE_PRACTICE if session_type == SESSION_TYPE_PRACTICE else SESSION_TYPE_OFFICIAL
        return f"{base_prefix}/{type_prefix}/{session.id}"

    async def _notify_hr_official_video_ready(
        self,
        *,
        session: InterviewSession,
        actor_user_id: int,
    ) -> None:
        if session.session_type != SESSION_TYPE_OFFICIAL or not session.job_posting_id:
            return

        posting = await self._get_posting(session.job_posting_id)
        answers = await self._get_answers(session.id)
        video_count = sum(1 for answer in answers if answer.video_storage_key)
        if video_count <= 0:
            return

        service = NotificationService(self.db_session)
        await service.create_notification(
            recipient_user_id=posting.hr_user_id,
            actor_user_id=actor_user_id,
            type_="official_interview_video_ready",
            title="Có video phỏng vấn chính thức mới",
            body=f"Ứng viên đã hoàn tất phỏng vấn chính thức cho JD {posting.title}.",
            link_url=f"/phong-van/{session.id}/chi-tiet",
            metadata={
                "session_id": session.id,
                "job_posting_id": posting.id,
                "job_title": posting.title,
                "video_count": video_count,
            },
            dedupe_session_id=session.id,
        )

    @staticmethod
    def _posting_text(posting: JobPosting) -> str:
        return "\n".join(
            item
            for item in [
                posting.title,
                posting.company or "",
                posting.location or "",
                posting.salary or "",
                posting.level or "",
                posting.experience or "",
                posting.description or "",
                posting.requirements or "",
                posting.benefits or "",
            ]
            if item
        )

    @staticmethod
    def serialize_question(question: InterviewQuestion) -> dict[str, Any]:
        return {
            "id": question.id,
            "session_id": question.session_id,
            "question_order": question.question_order,
            "question_text": question.question_text,
            "category": question.category,
            "expected_signal": question.expected_signal,
        }

    @staticmethod
    def serialize_answer(answer: InterviewAnswer) -> dict[str, Any]:
        return {
            "id": answer.id,
            "session_id": answer.session_id,
            "question_id": answer.question_id,
            "answer_order": answer.answer_order,
            "audio_storage_key": answer.audio_storage_key,
            "video_storage_key": answer.video_storage_key,
            "audio_url": f"/v1_0/interview-sessions/answers/{answer.id}/media/audio" if answer.audio_storage_key else None,
            "video_url": f"/v1_0/interview-sessions/answers/{answer.id}/media/video" if answer.video_storage_key else None,
            "mime_type": answer.mime_type,
            "duration_seconds": answer.duration_seconds,
            "size_bytes": answer.size_bytes,
            "transcript": answer.transcript,
            "transcription_status": answer.transcription_status,
            "transcription_error": answer.transcription_error,
        }

    @staticmethod
    def serialize_evaluation(evaluation: InterviewEvaluation) -> dict[str, Any]:
        return {
            "id": evaluation.id,
            "session_id": evaluation.session_id,
            "overall_score": evaluation.overall_score,
            "communication_score": evaluation.communication_score,
            "technical_score": evaluation.technical_score,
            "jd_alignment_score": evaluation.jd_alignment_score,
            "evaluation": evaluation.evaluation_json or {},
            "provider": evaluation.provider,
            "created_at": evaluation.created_at,
        }


async def transcribe_interview_answer_task(
    answer_id: int,
    media_bytes: bytes | None,
    file_name: str,
    content_type: str,
    client_transcript: str | None = None,
) -> None:
    if not media_bytes:
        return
    async with Database.get_instance_db() as session:
        service = InterviewSessionService(session)
        answer = await service._get_answer(answer_id)
        try:
            answer.transcription_status = "processing"
            session.add(answer)
            await session.commit()
            transcript = await service.ai_provider.transcribe(media_bytes, file_name, content_type)
            if not str(transcript or "").strip() and client_transcript:
                transcript = client_transcript
            answer.transcript = transcript
            answer.transcription_status = "completed"
            answer.transcription_error = None
        except Exception as exc:
            if client_transcript:
                answer.transcript = client_transcript
                answer.transcription_status = "completed"
                answer.transcription_error = None
            else:
                answer.transcription_status = "failed"
                answer.transcription_error = str(getattr(exc, "message", str(exc)))
        session.add(answer)
        await session.commit()


async def evaluate_interview_session_task(session_id: int) -> None:
    async with Database.get_instance_db() as db_session:
        service = InterviewSessionService(db_session)
        query = select(InterviewSession).where(InterviewSession.id == session_id)
        session = (await db_session.execute(query)).scalar_one_or_none()
        if session is None:
            return
        try:
            answers = service._evaluation_answers(
                await service._get_questions(session.id),
                await service._get_answers(session.id),
            )
            context = await service._question_context(session)
            evaluation_json = await service.ai_provider.evaluate(
                {
                    "job_title": context.get("job_title", "Interview session"),
                    "jd_text": context.get("jd_text", ""),
                    "cv_text": context.get("cv_text", ""),
                    "answers": answers,
                    "session_type": session.session_type or SESSION_TYPE_OFFICIAL,
                }
            )
            evaluation = InterviewEvaluation(
                session_id=session.id,
                overall_score=float(evaluation_json.get("overall_score", 0) or 0),
                communication_score=float(evaluation_json.get("communication_score", 0) or 0),
                technical_score=float(evaluation_json.get("technical_score", 0) or 0),
                jd_alignment_score=float(evaluation_json.get("jd_alignment_score", 0) or 0),
                evaluation_json=evaluation_json,
                provider=service.ai_provider.provider_name,
            )
            session.status = STATUS_COMPLETED
            session.failure_reason = None
            db_session.add(evaluation)
        except Exception as exc:
            session.status = STATUS_FAILED
            session.failure_reason = str(getattr(exc, "message", str(exc)))
        db_session.add(session)
        await db_session.commit()


def _question_by_id(questions: list[InterviewQuestion]) -> dict[int, InterviewQuestion]:
    return {item.id: item for item in questions}


def _evaluation_answers(
    questions: list[InterviewQuestion],
    answers: list[InterviewAnswer],
) -> list[dict[str, Any]]:
    question_map = _question_by_id(questions)
    return [
        {
            "question_id": answer.question_id,
            "question": question_map.get(answer.question_id).question_text
            if question_map.get(answer.question_id)
            else "",
            "transcript": answer.transcript or "",
            "duration_seconds": answer.duration_seconds,
        }
        for answer in answers
    ]


InterviewSessionService._evaluation_answers = staticmethod(_evaluation_answers)
