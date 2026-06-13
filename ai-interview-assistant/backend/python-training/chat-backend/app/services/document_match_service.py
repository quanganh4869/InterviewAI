import re
import unicodedata
from collections import Counter
from math import sqrt
from typing import Any

from configuration.settings import configuration
from core.exception_handler.custom_exception import ExceptionValueError
from db.models.users import User
from services.cv_parser_service import CvParserService
from services.document_service import DocumentService
from services.providers.embedding_provider import embedding_provider
from sqlalchemy.ext.asyncio import AsyncSession

SKILL_ALIASES: dict[str, list[str]] = {
    "python": ["python", "py"],
    "java": ["java"],
    "javascript": ["javascript", "js", "ecmascript"],
    "typescript": ["typescript", "ts"],
    "golang": ["golang", "go"],
    "ruby": ["ruby"],
    "php": ["php"],
    "c++": ["c++", "cpp"],
    "c#": ["c#", "csharp"],
    "rust": ["rust"],
    "swift": ["swift"],
    "kotlin": ["kotlin"],
    "node.js": ["node.js", "nodejs", "node js"],
    "fastapi": ["fastapi"],
    "django": ["django"],
    "flask": ["flask"],
    "spring boot": ["spring boot", "springboot"],
    "react": ["react", "react.js", "reactjs"],
    "angular": ["angular"],
    "vue": ["vue", "vue.js", "vuejs"],
    "next.js": ["next.js", "nextjs", "next js"],
    "nest.js": ["nest.js", "nestjs", "nest js"],
    "laravel": ["laravel"],
    "rest api": ["rest api", "restful api", "restful", "api restful"],
    "graphql": ["graphql"],
    "microservices": ["microservices", "microservice", "micro-services"],
    "sql": ["sql"],
    "mysql": ["mysql"],
    "postgresql": ["postgresql", "postgres", "postgre sql"],
    "mongodb": ["mongodb", "mongo db"],
    "redis": ["redis"],
    "elasticsearch": ["elasticsearch", "elastic search"],
    "oracle": ["oracle"],
    "sql server": ["sql server", "mssql", "ms sql"],
    "aws": ["aws", "amazon web services"],
    "gcp": ["gcp", "google cloud"],
    "azure": ["azure", "microsoft azure"],
    "docker": ["docker"],
    "kubernetes": ["kubernetes", "k8s"],
    "jenkins": ["jenkins"],
    "terraform": ["terraform"],
    "ansible": ["ansible"],
    "linux": ["linux", "unix"],
    "git": ["git", "github", "gitlab"],
    "ci/cd": ["ci/cd", "cicd", "ci cd"],
    "pytorch": ["pytorch", "py torch"],
    "tensorflow": ["tensorflow", "tensor flow"],
    "scikit-learn": ["scikit-learn", "sklearn", "scikit learn"],
    "pandas": ["pandas"],
    "numpy": ["numpy"],
    "opencv": ["opencv", "open cv"],
    "llm": ["llm", "large language model", "large language models"],
    "nlp": ["nlp", "natural language processing"],
    "computer vision": ["computer vision", "cv model", "image processing"],
}

HARD_SKILL_LIBRARY = list(SKILL_ALIASES)

YEARS_PATTERNS = [
    r"(\d{1,2})\s*(?:-|to|đến|den|~)\s*(\d{1,2})\s*(?:n(?:am|\u0103m|Äƒm)|year|years|yrs?)\b",
    r"(?:at\s+least|minimum|min|tối\s+thiểu|toi\s+thieu|trên|tren|hơn|hon)\D{0,20}(\d{1,2})\s*\+?\s*(?:n(?:am|\u0103m|Äƒm)|year|years|yrs?)?",
    r"(\d{1,2})\s*\+?\s*(?:n(?:am|\u0103m|Äƒm)|year|years|yrs?)\b",
    r"(?:exp|experience|kinh\s+nghi(?:e|\u1ec7|á»‡)m)\D{0,32}(\d{1,2})",
]
TOKEN_RE = re.compile(r"\w+")


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
            if isinstance(match, tuple):
                values = [int(item) for item in match if str(item).isdigit()]
                if values:
                    years.append(max(values))
            elif str(match).isdigit():
                years.append(int(match))
    return max(years)


def extract_skills(text: str) -> list[str]:
    normalized = clean_text(text)
    found: list[str] = []
    for skill, aliases in SKILL_ALIASES.items():
        if any(_contains_skill_alias(normalized, alias) for alias in aliases):
            found.append(skill)
    return found


def _contains_skill_alias(normalized_text: str, alias: str) -> bool:
    escaped = re.escape(alias.lower())
    return bool(re.search(r"(?<![\w+#.])" + escaped + r"(?![\w+#.])", normalized_text))


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


def _lexical_similarity(text_a: str, text_b: str) -> float:
    counts_a = Counter(TOKEN_RE.findall(clean_text(text_a)))
    counts_b = Counter(TOKEN_RE.findall(clean_text(text_b)))
    if not counts_a or not counts_b:
        return 0.0

    vocabulary = sorted(set(counts_a) | set(counts_b))
    vector_a = [float(counts_a[token]) for token in vocabulary]
    vector_b = [float(counts_b[token]) for token in vocabulary]
    return _clamp(_cosine_similarity(vector_a, vector_b), 0.0, 1.0)


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

        result = self.calculate_match_from_text(cv_text=cv_text, jd_text=jd_text)
        result["diagnostics"] = {
            "cv_extraction_mode": cv_parsed.get("extraction_mode", "unknown"),
            "cv_ocr_used": bool(cv_parsed.get("ocr_used", False)),
            "cv_character_count": int(cv_parsed.get("character_count", 0)),
            "fallback_used": fallback_used,
            "fallback_reason": fallback_reason,
        }
        return result

    def calculate_match_from_text(self, cv_text: str, jd_text: str) -> dict[str, Any]:
        if not clean_text(cv_text):
            raise ExceptionValueError(
                message="CV text is required.",
                status_code=422,
            )
        if not clean_text(jd_text):
            raise ExceptionValueError(
                message="JD text is required.",
                status_code=422,
            )
        return self._calculate_match(cv_text=cv_text, jd_text=jd_text)

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
        semantic_score, semantic_method, semantic_fallback_reason = (
            self._calculate_semantic_similarity(cv_clean, jd_clean)
        )

        jd_skills = extract_skills(jd_text)
        cv_skills = extract_skills(cv_text)
        matched_skills = [skill for skill in jd_skills if skill in cv_skills]
        missing_skills = [skill for skill in jd_skills if skill not in cv_skills]
        extra_cv_skills = [skill for skill in cv_skills if skill not in jd_skills]
        skill_score = self._score_skills(
            matched_skills=matched_skills,
            jd_skills=jd_skills,
            cv_skills=cv_skills,
        )

        cv_exp = extract_years_from_text(cv_text)
        jd_exp = extract_years_from_text(jd_text)
        experience_score = self._score_experience(cv_years=cv_exp, jd_years=jd_exp)

        weighted = (
            (configuration.WEIGHT_SEMANTIC * semantic_score)
            + (configuration.WEIGHT_SKILL * skill_score)
            + (configuration.WEIGHT_EXPERIENCE * experience_score)
        )
        match_score = round(_clamp(weighted, 0.0, 1.0) * 100, 2)
        confidence = self._score_confidence(
            cv_clean=cv_clean,
            jd_clean=jd_clean,
            jd_skills=jd_skills,
            jd_years=jd_exp,
            semantic_method=semantic_method,
        )
        recommendation = self._recommendation_label(match_score, confidence)

        return {
            "match_score": match_score,
            "semantic_score": round(semantic_score * 100, 2),
            "skill_score": round(skill_score * 100, 2),
            "experience_score": round(experience_score * 100, 2),
            "experience": {"cv": cv_exp, "jd": jd_exp},
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "jd_skills": jd_skills,
            "cv_skills": cv_skills,
            "extra_cv_skills": extra_cv_skills,
            "semantic_method": semantic_method,
            "semantic_fallback_reason": semantic_fallback_reason,
            "confidence": confidence,
            "score_interpretation": self._score_interpretation(match_score),
            "recommendation": recommendation,
            "evaluation": self._generate_summary(
                cv_exp=cv_exp,
                jd_exp=jd_exp,
                matched_skills=matched_skills,
                missing_skills=missing_skills,
            ),
        }

    @staticmethod
    def _score_skills(
        matched_skills: list[str],
        jd_skills: list[str],
        cv_skills: list[str],
    ) -> float:
        if not jd_skills:
            return 1.0
        recall = len(matched_skills) / len(jd_skills)
        evidence_bonus = min(len(cv_skills) / max(len(jd_skills), 1), 1.0)
        return _clamp((0.85 * recall) + (0.15 * evidence_bonus), 0.0, 1.0)

    @staticmethod
    def _score_experience(cv_years: int, jd_years: int) -> float:
        if jd_years <= 0:
            return 1.0
        if cv_years <= 0:
            return 0.35
        if cv_years >= jd_years:
            return 1.0
        ratio = cv_years / jd_years
        return _clamp(0.25 + (0.75 * ratio), 0.0, 1.0)

    @staticmethod
    def _score_confidence(
        cv_clean: str,
        jd_clean: str,
        jd_skills: list[str],
        jd_years: int,
        semantic_method: str,
    ) -> float:
        signals = 0.0
        signals += 0.35 if len(cv_clean) >= 1200 else 0.2 if len(cv_clean) >= 400 else 0.08
        signals += 0.25 if len(jd_clean) >= 500 else 0.14 if len(jd_clean) >= 180 else 0.06
        signals += 0.2 if jd_skills else 0.08
        signals += 0.1 if jd_years > 0 else 0.04
        signals += 0.1 if semantic_method == "internal_embedding" else 0.06
        return round(_clamp(signals, 0.0, 1.0) * 100, 2)

    @staticmethod
    def _recommendation_label(match_score: float, confidence: float) -> str:
        if confidence < 45:
            if match_score >= 70:
                return "Needs Review"
            return "Insufficient Signal"
        if match_score >= 80:
            return "Strong Match"
        if match_score >= 65:
            return "Shortlist"
        if match_score >= 50:
            return "Consider"
        return "Reject"

    @staticmethod
    def _score_interpretation(match_score: float) -> str:
        if match_score >= 80:
            return "high_fit"
        if match_score >= 65:
            return "good_fit"
        if match_score >= 50:
            return "partial_fit"
        return "low_fit"

    def _calculate_semantic_similarity(
        self,
        cv_clean: str,
        jd_clean: str,
    ) -> tuple[float, str, str]:
        if not configuration.CV_JD_EMBEDDING_ENABLED:
            return _lexical_similarity(cv_clean, jd_clean), "lexical", "disabled"

        try:
            embeddings = self.embedding_service.encode([cv_clean, jd_clean])
            if len(embeddings) != 2:
                raise ValueError("embedding provider must return two vectors")
            return (
                _clamp(_cosine_similarity(embeddings[0], embeddings[1]), 0.0, 1.0),
                "internal_embedding",
                "",
            )
        except Exception as exc:
            return _lexical_similarity(cv_clean, jd_clean), "lexical", str(exc)

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
                "CV có bằng chứng phù hợp ở "
                + ", ".join(matched_skills[:3])
                + "."
            )
        if jd_exp > 0 and cv_exp >= jd_exp:
            parts.append(
                f"Kinh nghiệm ({cv_exp} năm) đáp ứng mức JD yêu cầu ({jd_exp} năm)."
            )
        elif jd_exp > 0:
            parts.append(
                f"Kinh nghiệm bóc tách được ({cv_exp} năm) thấp hơn mức JD yêu cầu ({jd_exp} năm)."
            )
        if missing_skills:
            parts.append("Thiếu/không thấy rõ kỹ năng ưu tiên: " + ", ".join(missing_skills[:3]) + ".")

        return " ".join(parts).strip() or "Chưa đủ tín hiệu để đưa ra đánh giá chi tiết."
