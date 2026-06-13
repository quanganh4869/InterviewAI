import logging
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from app.services.providers.embedding_provider import embedding_provider
from app.services.extractors.skill_extractor import extract_skills
from app.utils.text_helper import clean_text, extract_years_from_text
from app.core.config import settings

log = logging.getLogger(__name__)

class MatcherService:
    def __init__(self):
        self.provider = embedding_provider

    async def calculate_match(self, cv_text: str, jd_text: str) -> dict:
        log.info("Starting matching calculation...")
        
        c_cv = clean_text(cv_text)
        c_jd = clean_text(jd_text)
        
        # 1. Semantic Similarity
        embeddings = self.provider.encode([c_cv, c_jd])
        semantic_score = float(cosine_similarity([embeddings[0]], [embeddings[1]])[0][0])
        
        # 2. Skill Matching
        jd_skills = extract_skills(jd_text)
        cv_skills = extract_skills(cv_text)
        matched_skills = [s for s in jd_skills if s in cv_skills]
        missing_skills = [s for s in jd_skills if s not in cv_skills]
        
        skill_score = len(matched_skills) / len(jd_skills) if jd_skills else 1.0
        
        # 3. Experience Analysis
        cv_exp = extract_years_from_text(cv_text)
        jd_exp = extract_years_from_text(jd_text)
        exp_score = 1.0
        if jd_exp > 0:
            exp_score = min(cv_exp / jd_exp, 1.2)
        
        # 4. Final Weighted Score
        final_score = (
            (settings.WEIGHT_SEMANTIC * semantic_score) + 
            (settings.WEIGHT_SKILL * skill_score) + 
            (settings.WEIGHT_EXPERIENCE * (exp_score / 1.2))
        )
        
        final_score_pct = round(final_score * 100, 2)

        # 5. Recommendation Logic
        recommendation = "Reject"
        if final_score_pct >= 75: 
            recommendation = "Shortlist"
        elif final_score_pct >= 50: 
            recommendation = "Consider"

        return {
            "match_score": final_score_pct,
            "semantic_score": round(semantic_score * 100, 2),
            "skill_score": round(skill_score * 100, 2),
            "experience_score": round((exp_score/1.2) * 100, 2),
            "experience": {"cv": cv_exp, "jd": jd_exp},
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "recommendation": recommendation,
            "evaluation": self._generate_summary(cv_exp, jd_exp, matched_skills, missing_skills)
        }

    def _generate_summary(self, cv_exp, jd_exp, matched, missing) -> str:
        parts = []
        if matched:
            parts.append(f"Ứng viên có kỹ năng về {', '.join(matched[:3])}.")
        if cv_exp >= jd_exp and jd_exp > 0:
            parts.append(f"Kinh nghiệm ({cv_exp} năm) đáp ứng tốt yêu cầu.")
        elif jd_exp > 0:
            parts.append(f"Kinh nghiệm ({cv_exp} năm) hơi thấp so với yêu cầu ({jd_exp} năm).")
        if missing:
            parts.append(f"Cần cải thiện thêm về: {', '.join(missing[:2])}.")
        
        return " ".join(parts)

matcher_service = MatcherService()
