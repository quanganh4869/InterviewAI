import re
import unicodedata
from typing import Any
from math import sqrt

from configuration.settings import configuration
from core.exception_handler.custom_exception import ExceptionValueError
from db.models.users import User
from services.cv_parser_service import CvParserService
from services.document_service import DocumentService
from services.providers.embedding_provider import embedding_provider
from sqlalchemy.ext.asyncio import AsyncSession

TECH_STACK_LIBRARY = [
    "python",
    "java",
    "javascript",
    "typescript",
    "golang",
    "ruby",
    "php",
    "c++",
    "c#",
    "rust",
    "swift",
    "kotlin",
    "fastapi",
    "django",
    "flask",
    "spring boot",
    "react",
    "angular",
    "vue",
    "next.js",
    "nest.js",
    "laravel",
    "sql",
    "mysql",
    "postgresql",
    "mongodb",
    "redis",
    "elasticsearch",
    "oracle",
    "sql server",
    "aws",
    "gcp",
    "azure",
    "docker",
    "kubernetes",
    "jenkins",
    "terraform",
    "ansible",
    "linux",
    "git",
    "pytorch",
    "tensorflow",
    "scikit-learn",
    "pandas",
    "numpy",
    "opencv",
    "llm",
    "nlp",
    "computer vision",
    "agile",
    "scrum",
    "english",
    "japanese",
    "teamwork",
    "leadership",
]

YEARS_PATTERNS = [
    r"(\d+)\s*\+?\s*(?:năm|year|years)\b",
    r"(?:exp|experience)\D*(\d+)",
]


def clean_text(text: str) -> str:
    if not text:
        return ""
    normalized = unicodedata.normalize("NFC", text).lower()
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized.strip()


def extract_years_from_text(text: str) -> int:
    years = [0]
    source = clean_text(text)
    for pattern in YEARS_PATTERNS:
        matches = re.findall(pattern, source)
        for match in matches:
            years.append(int(match[0] if isinstance(match, tuple) else match))
    return max(years)


def extract_skills(text: str) -> list[str]:
    normalized = clean_text(text)
    found: list[str] = []
    for skill in TECH_STACK_LIBRARY:
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, normalized):
            found.append(skill)
    return found


def _clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(value, max_value))


def _cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    if len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = sqrt(sum(a * a for a in vec_a))
    norm_b = sqrt(sum(b * b for b in vec_b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


class DocumentMatchService:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session
        self.document_service = DocumentService(db_session)
        self.cv_parser_service = CvParserService(db_session)
        self.embedding_service = embedding_provider

    async def match_cv_with_jd_text(
        self,
        user: User,
        cv_document_id: int,
        jd_text: str,
    ) -> dict[str, Any]:
        if not clean_text(jd_text):
            raise ExceptionValueError(
                message="JD text is required.",
                status_code=422,
            )

        fallback_used = False
        fallback_reason = ""
        try:
            cv_parsed = await self.cv_parser_service.parse_cv_document(
                user=user,
                document_id=cv_document_id,
            )
            cv_text = str(cv_parsed.get("extracted_text", "")).strip()
        except ExceptionValueError as exc:
            if not self._is_ocr_unavailable_error(exc.message):
                raise

            cv_text = await self._build_fallback_cv_text(
                user=user,
                cv_document_id=cv_document_id,
            )
            cv_parsed = {
                "extraction_mode": "fallback_metadata",
                "ocr_used": False,
                "character_count": len(cv_text),
            }
            fallback_used = True
            fallback_reason = exc.message

        if not cv_text:
            raise ExceptionValueError(
                message="Cannot extract text from CV.",
                status_code=422,
            )

        result = self._calculate_match(cv_text=cv_text, jd_text=jd_text)
        result["diagnostics"] = {
            "cv_extraction_mode": cv_parsed.get("extraction_mode", "unknown"),
            "cv_ocr_used": bool(cv_parsed.get("ocr_used", False)),
            "cv_character_count": int(cv_parsed.get("character_count", 0)),
            "fallback_used": fallback_used,
            "fallback_reason": fallback_reason,
        }
        return result

    @staticmethod
    def _is_ocr_unavailable_error(message: str) -> bool:
        source = str(message or "").lower()
        return (
            "no tessdata specified" in source
            or "tesseract is not installed" in source
            or "ocr_error=" in source
        )

    async def _build_fallback_cv_text(self, user: User, cv_document_id: int) -> str:
        document = await self.document_service._get_accessible_document(
            user=user,
            document_id=cv_document_id,
        )
        metadata = document.metadata_json or {}
        chunks = [
            str(metadata.get("target_role", "")).strip(),
            str(document.file_name or "").strip(),
        ]
        return " ".join(item for item in chunks if item).strip()

    def _calculate_match(self, cv_text: str, jd_text: str) -> dict[str, Any]:
        cv_clean = clean_text(cv_text)
        jd_clean = clean_text(jd_text)

        embeddings = self.embedding_service.encode([cv_clean, jd_clean])
        semantic_raw = _cosine_similarity(embeddings[0], embeddings[1])
        semantic_score = _clamp(semantic_raw, 0.0, 1.0)

        jd_skills = extract_skills(jd_text)
        cv_skills = extract_skills(cv_text)
        matched_skills = [skill for skill in jd_skills if skill in cv_skills]
        missing_skills = [skill for skill in jd_skills if skill not in cv_skills]
        skill_score = len(matched_skills) / len(jd_skills) if jd_skills else 1.0

        cv_exp = extract_years_from_text(cv_text)
        jd_exp = extract_years_from_text(jd_text)
        exp_score = 1.0
        if jd_exp > 0:
            exp_score = min(cv_exp / jd_exp, 1.2)

        weighted = (
            (configuration.WEIGHT_SEMANTIC * semantic_score)
            + (configuration.WEIGHT_SKILL * skill_score)
            + (configuration.WEIGHT_EXPERIENCE * (exp_score / 1.2))
        )
        match_score = round(_clamp(weighted, 0.0, 1.0) * 100, 2)

        recommendation = "Reject"
        if match_score >= 75:
            recommendation = "Shortlist"
        elif match_score >= 50:
            recommendation = "Consider"

        return {
            "match_score": match_score,
            "semantic_score": round(semantic_score * 100, 2),
            "skill_score": round(skill_score * 100, 2),
            "experience_score": round((exp_score / 1.2) * 100, 2),
            "experience": {"cv": cv_exp, "jd": jd_exp},
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "recommendation": recommendation,
            "evaluation": self._generate_summary(
                cv_exp=cv_exp,
                jd_exp=jd_exp,
                matched_skills=matched_skills,
                missing_skills=missing_skills,
            ),
        }

    @staticmethod
    def _generate_summary(
        cv_exp: int,
        jd_exp: int,
        matched_skills: list[str],
        missing_skills: list[str],
    ) -> str:
        parts: list[str] = []
        if matched_skills:
            parts.append(
                "Candidate has relevant skills in "
                + ", ".join(matched_skills[:3])
                + "."
            )
        if jd_exp > 0 and cv_exp >= jd_exp:
            parts.append(
                f"Experience ({cv_exp} years) meets JD expectation ({jd_exp} years)."
            )
        elif jd_exp > 0:
            parts.append(
                f"Experience ({cv_exp} years) is below JD expectation ({jd_exp} years)."
            )
        if missing_skills:
            parts.append("Missing priority skills: " + ", ".join(missing_skills[:3]) + ".")

        return " ".join(parts).strip() or "Insufficient signal for detailed summary."
