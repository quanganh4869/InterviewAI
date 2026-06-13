import json
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from api.cv_jd_analysis_api import analyze_cv_jd, get_cv_jd_analysis_detail
from configuration.settings import configuration
from core.enums.document_enum import DocumentType
from core.enums.user_enum import UserRole
from core.exception_handler.custom_exception import ExceptionValueError
from schemas.requests.cv_jd_analysis_schema import CvJdAnalyzeRequest
from services.cv_jd_analysis_service import CvJdAnalysisService
from services.document_match_service import (
    DocumentMatchService,
    extract_skills,
    extract_years_from_text,
)
from services.document_service import DocumentService
from services.file_storage_service import R2FileStorageService


class FakeCvDocumentService:
    def __init__(self, document):
        self.document = document

    async def _get_accessible_document(self, user, document_id):
        return self.document


async def return_pdf_document(user, document_id):
    return SimpleNamespace(
        id=document_id,
        mime_type="application/pdf",
        storage_key="uploads/cvs/candidate.pdf",
    )


class FakeParserService:
    async def parse_cv_document(self, user, document_id):
        return {
            "extracted_text": "Python FastAPI AWS with 4 years experience",
            "character_count": 52,
            "extraction_mode": "native",
            "ocr_used": False,
        }


class FakeMatchService:
    def calculate_match_from_text(self, cv_text, jd_text):
        return {
            "match_score": 81.5,
            "semantic_score": 72.0,
            "skill_score": 100.0,
            "experience_score": 100.0,
            "experience": {"cv": 4, "jd": 3},
            "matched_skills": ["python", "fastapi"],
            "missing_skills": ["postgresql"],
            "semantic_method": "internal_embedding",
            "semantic_fallback_reason": "",
        }


class FakePersistSession:
    def __init__(self):
        self.added = None
        self.commits = 0

    def add(self, item):
        self.added = item

    async def commit(self):
        self.commits += 1

    async def refresh(self, item):
        item.id = 17
        item.created_at = datetime(2026, 5, 22, tzinfo=timezone.utc)


class BrokenEmbeddingProvider:
    def encode(self, texts):
        raise RuntimeError("provider unavailable")


@pytest.mark.unit
def test_score_extracts_hard_skills_and_vietnamese_experience():
    assert extract_skills("Python React teamwork agile C# next.js") == [
        "python",
        "c#",
        "react",
        "next.js",
    ]
    assert extract_years_from_text("Yeu cau 5 năm kinh nghiệm Python") == 5
    assert extract_years_from_text("At least 3+ years experience") == 3


@pytest.mark.unit
def test_semantic_similarity_falls_back_to_lexical_when_embedding_errors():
    service = DocumentMatchService.__new__(DocumentMatchService)
    service.embedding_service = BrokenEmbeddingProvider()

    result = service.calculate_match_from_text(
        cv_text="Python FastAPI AWS",
        jd_text="Need Python FastAPI",
    )

    assert result["semantic_method"] == "lexical"
    assert "provider unavailable" in result["semantic_fallback_reason"]
    assert 0 <= result["match_score"] <= 100


@pytest.mark.unit
def test_semantic_similarity_uses_lexical_when_embedding_disabled(monkeypatch):
    monkeypatch.setattr(configuration, "CV_JD_EMBEDDING_ENABLED", False)
    service = DocumentMatchService.__new__(DocumentMatchService)
    service.embedding_service = BrokenEmbeddingProvider()

    result = service.calculate_match_from_text(
        cv_text="Python PostgreSQL",
        jd_text="Python backend",
    )

    assert result["semantic_method"] == "lexical"
    assert result["semantic_fallback_reason"] == "disabled"


@pytest.mark.anyio
@pytest.mark.unit
async def test_analyze_persists_report_detail():
    db_session = FakePersistSession()
    service = CvJdAnalysisService.__new__(CvJdAnalysisService)
    service.db_session = db_session
    service.document_service = FakeCvDocumentService(
        SimpleNamespace(
            id=8,
            owner_user_id=3,
            document_type=DocumentType.CV,
            file_name="candidate.pdf",
        )
    )
    service.cv_parser_service = FakeParserService()
    service.match_service = FakeMatchService()

    result = await service.analyze(
        user=SimpleNamespace(id=3, role=UserRole.HR),
        cv_document_id=8,
        jd_text="Need Python FastAPI PostgreSQL with 3 years experience",
    )

    assert db_session.commits == 1
    assert db_session.added.cv_file_name_snapshot == "candidate.pdf"
    assert result["id"] == 17
    assert result["overall_score"] == 81.5
    assert result["skill_gap"]["missing_hard_skills"] == ["postgresql"]
    assert result["score_breakdown"]["experience"]["jd_years"] == 3


@pytest.mark.anyio
@pytest.mark.unit
async def test_hr_cannot_analyze_cv_owned_by_another_account():
    service = CvJdAnalysisService.__new__(CvJdAnalysisService)
    service.document_service = FakeCvDocumentService(
        SimpleNamespace(
            id=9,
            owner_user_id=99,
            document_type=DocumentType.CV,
            file_name="external.pdf",
        )
    )

    with pytest.raises(ExceptionValueError) as exc_info:
        await service._get_analysis_cv_document(
            user=SimpleNamespace(id=3, role=UserRole.HR),
            document_id=9,
        )

    assert exc_info.value.status_code == 403


@pytest.mark.unit
def test_report_template_contains_required_fields():
    report = CvJdAnalysisService.build_report(
        {
            "match_score": 64.0,
            "semantic_score": 49.0,
            "experience": {"cv": 1, "jd": 3},
            "matched_skills": ["python"],
            "missing_skills": ["aws"],
        }
    )

    assert set(report) == {
        "overall_score",
        "executive_summary",
        "skill_gap",
        "deep_experience_alignment",
        "actionable_recommendations",
    }
    assert report["skill_gap"]["matched_hard_skills"] == ["python"]
    assert report["actionable_recommendations"]


@pytest.mark.unit
def test_r2_storage_rejects_missing_credentials_before_upload():
    storage = R2FileStorageService.__new__(R2FileStorageService)
    storage.access_key = ""
    storage.secret_key = ""
    storage.endpoint_url = ""
    storage.bucket_name = "interviewai"

    with pytest.raises(ExceptionValueError) as exc_info:
        storage._ensure_configured()

    assert exc_info.value.status_code == 503
    assert "STORAGE_STRATEGY=local" in exc_info.value.message


@pytest.mark.anyio
@pytest.mark.unit
async def test_access_url_returns_local_mode_without_presigned_storage():
    service = DocumentService.__new__(DocumentService)
    service.storage_service = SimpleNamespace(supports_presigned_download=False)
    service._get_accessible_document = return_pdf_document

    result = await service.create_access_url(
        user=SimpleNamespace(id=2),
        document_id=11,
    )

    assert result == {
        "document_id": 11,
        "download_url": "",
        "expires_in": 0,
        "download_mode": "local",
    }


class FakeApiService:
    async def analyze(self, user, cv_document_id, jd_text=None, job_posting_id=None):
        return {
            "id": 4,
            "analyst_user_id": user.id,
            "cv_document_id": cv_document_id,
            "job_posting_id": job_posting_id,
            "cv_file_name_snapshot": "cv.pdf",
            "jd_text": jd_text or "Need Python",
            "overall_score": 78.2,
            "executive_summary": "CV phù hợp.",
            "skill_gap": {
                "matched_hard_skills": ["python"],
                "missing_hard_skills": [],
            },
            "deep_experience_alignment": "Đủ kinh nghiệm.",
            "actionable_recommendations": ["Giữ minh chứng dự án."],
            "score_breakdown": {},
            "created_at": datetime(2026, 5, 22, tzinfo=timezone.utc),
        }


class ForbiddenApiService:
    async def get_detail(self, user, analysis_id):
        raise ExceptionValueError(message="Forbidden report.", status_code=403)


@pytest.mark.anyio
@pytest.mark.unit
async def test_analyze_endpoint_wraps_report_response():
    response = await analyze_cv_jd(
        payload=CvJdAnalyzeRequest(cv_document_id=5, jd_text="Need Python"),
        user=SimpleNamespace(id=10),
        service=FakeApiService(),
    )
    payload = json.loads(response.body)

    assert response.status_code == 200
    assert payload["success"] is True
    assert payload["data"]["overall_score"] == 78.2


@pytest.mark.anyio
@pytest.mark.unit
async def test_analyze_endpoint_accepts_job_posting_id():
    response = await analyze_cv_jd(
        payload=CvJdAnalyzeRequest(cv_document_id=5, job_posting_id=9),
        user=SimpleNamespace(id=10),
        service=FakeApiService(),
    )
    payload = json.loads(response.body)

    assert response.status_code == 200
    assert payload["data"]["job_posting_id"] == 9


@pytest.mark.anyio
@pytest.mark.unit
async def test_detail_endpoint_returns_service_permission_error():
    response = await get_cv_jd_analysis_detail(
        analysis_id=99,
        user=SimpleNamespace(id=10),
        service=ForbiddenApiService(),
    )
    payload = json.loads(response.body)

    assert response.status_code == 403
    assert payload["success"] is False
    assert payload["message"] == "Forbidden report."
