import re
from typing import Any

from core.enums.document_enum import DocumentType
from core.enums.user_enum import UserRole
from core.exception_handler.custom_exception import ExceptionValueError
from db.models.document import Document
from db.models.job_posting import JobPosting
from db.models.users import User
from services.document_service import DocumentService
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

STATUS_DRAFT = "draft"
STATUS_PUBLISHED = "published"
STATUS_CLOSED = "closed"


FIELD_LABELS = {
    "companyWebsiteUrl": "Company website",
    "location": "Location",
    "salary": "Salary",
    "work_type": "Work type",
    "experience": "Experience",
    "level": "Candidate level",
    "deadline": "Deadline",
}

CONTENT_LABELS = {
    "description": "Job description",
    "requirements": "Requirements",
    "benefits": "Benefits",
}


def _read_label_value(summary: str, label: str) -> str:
    escaped = re.escape(label)
    match = re.search(rf"(?:^|\n)\s*{escaped}:\s*([^\n]+)", summary or "", re.I)
    return match.group(1).strip() if match else ""


def _read_section(summary: str, label: str, following_labels: list[str]) -> str:
    escaped = re.escape(label)
    next_labels = "|".join(re.escape(item) for item in following_labels)
    end = rf"(?=\n\s*(?:{next_labels}):|$)" if next_labels else "$"
    match = re.search(rf"(?:^|\n)\s*{escaped}:\s*\n?([\s\S]*?){end}", summary or "", re.I)
    return match.group(1).strip() if match else ""


def parse_jd_metadata(metadata: dict[str, Any]) -> dict[str, str]:
    summary = str(metadata.get("summary") or "")
    parsed = {
        "title": str(metadata.get("title") or "").strip(),
        "company": str(metadata.get("company") or "").strip(),
    }
    for key, label in FIELD_LABELS.items():
        parsed[key] = _read_label_value(summary, label)
    content_items = list(CONTENT_LABELS.items())
    for index, (key, label) in enumerate(content_items):
        parsed[key] = _read_section(
            summary,
            label,
            [next_label for _, next_label in content_items[index + 1 :]],
        )
    if not parsed["description"] and summary:
        parsed["description"] = summary
    return parsed


class JobPostingService:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session
        self.document_service = DocumentService(db_session)

    async def create_from_document(
        self,
        user: User,
        jd_document_id: int,
        publish: bool = False,
    ) -> dict[str, Any]:
        document = await self.document_service._get_accessible_document(
            user=user,
            document_id=jd_document_id,
        )
        self._ensure_jd_document(document)
        if user.role == UserRole.HR and document.owner_user_id != user.id:
            raise ExceptionValueError(
                message="HR can only publish JD documents uploaded by the same account.",
                status_code=403,
            )

        metadata = parse_jd_metadata(document.metadata_json or {})
        posting = JobPosting(
            hr_user_id=document.owner_user_id,
            jd_document_id=document.id,
            title=metadata.get("title") or document.file_name,
            company=metadata.get("company") or None,
            location=metadata.get("location") or None,
            salary=metadata.get("salary") or None,
            work_type=metadata.get("work_type") or None,
            experience=metadata.get("experience") or None,
            level=metadata.get("level") or None,
            deadline=metadata.get("deadline") or None,
            description=metadata.get("description") or None,
            requirements=metadata.get("requirements") or None,
            benefits=metadata.get("benefits") or None,
            status=STATUS_PUBLISHED if publish else STATUS_DRAFT,
        )
        self.db_session.add(posting)
        await self.db_session.commit()
        await self.db_session.refresh(posting)
        return self.serialize(posting)

    async def update(
        self,
        user: User,
        posting_id: int,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        posting = await self._get_manageable_posting(user=user, posting_id=posting_id)
        for key, value in payload.items():
            if value is not None and hasattr(posting, key):
                setattr(posting, key, str(value).strip())
        self.db_session.add(posting)
        await self.db_session.commit()
        await self.db_session.refresh(posting)
        return self.serialize(posting)

    async def publish(self, user: User, posting_id: int) -> dict[str, Any]:
        return await self._set_status(user=user, posting_id=posting_id, status=STATUS_PUBLISHED)

    async def close(self, user: User, posting_id: int) -> dict[str, Any]:
        return await self._set_status(user=user, posting_id=posting_id, status=STATUS_CLOSED)

    async def list_public(self) -> dict[str, Any]:
        query = (
            select(JobPosting)
            .where(JobPosting.deleted_at.is_(None), JobPosting.status == STATUS_PUBLISHED)
            .order_by(JobPosting.created_at.desc())
        )
        result = await self.db_session.execute(query)
        items = [self.serialize(item) for item in result.scalars().all()]
        return {"items": items, "total": len(items)}

    async def list_hr(self, user: User) -> dict[str, Any]:
        query = select(JobPosting).where(JobPosting.deleted_at.is_(None))
        if user.role != UserRole.ADMIN:
            query = query.where(JobPosting.hr_user_id == user.id)
        query = query.order_by(JobPosting.created_at.desc())
        result = await self.db_session.execute(query)
        items = [self.serialize(item) for item in result.scalars().all()]
        return {"items": items, "total": len(items)}

    async def get_detail(self, user: User, posting_id: int) -> dict[str, Any]:
        posting = await self._get_visible_posting(user=user, posting_id=posting_id)
        return self.serialize(posting)

    async def _set_status(self, user: User, posting_id: int, status: str) -> dict[str, Any]:
        posting = await self._get_manageable_posting(user=user, posting_id=posting_id)
        posting.status = status
        self.db_session.add(posting)
        await self.db_session.commit()
        await self.db_session.refresh(posting)
        return self.serialize(posting)

    async def _get_manageable_posting(self, user: User, posting_id: int) -> JobPosting:
        posting = await self._get_posting(posting_id)
        if user.role != UserRole.ADMIN and posting.hr_user_id != user.id:
            raise ExceptionValueError(
                message="You do not have permission to manage this job posting.",
                status_code=403,
            )
        return posting

    async def _get_visible_posting(self, user: User, posting_id: int) -> JobPosting:
        posting = await self._get_posting(posting_id)
        if user.role == UserRole.ADMIN or posting.hr_user_id == user.id:
            return posting
        if posting.status == STATUS_PUBLISHED:
            return posting
        raise ExceptionValueError(
            message="Job posting not found.",
            status_code=404,
        )

    async def _get_posting(self, posting_id: int) -> JobPosting:
        query = select(JobPosting).where(
            JobPosting.id == posting_id,
            JobPosting.deleted_at.is_(None),
        )
        posting = (await self.db_session.execute(query)).scalar_one_or_none()
        if posting is None:
            raise ExceptionValueError(message="Job posting not found.", status_code=404)
        return posting

    @staticmethod
    def _ensure_jd_document(document: Document) -> None:
        if document.document_type != DocumentType.JD:
            raise ExceptionValueError(
                message="Only JD documents can be published as job postings.",
                status_code=422,
            )

    @staticmethod
    def serialize(posting: JobPosting) -> dict[str, Any]:
        return {
            "id": posting.id,
            "hr_user_id": posting.hr_user_id,
            "jd_document_id": posting.jd_document_id,
            "title": posting.title,
            "company": posting.company,
            "location": posting.location,
            "salary": posting.salary,
            "work_type": posting.work_type,
            "experience": posting.experience,
            "level": posting.level,
            "deadline": posting.deadline,
            "description": posting.description,
            "requirements": posting.requirements,
            "benefits": posting.benefits,
            "status": posting.status,
            "created_at": posting.created_at,
            "updated_at": posting.updated_at,
        }
