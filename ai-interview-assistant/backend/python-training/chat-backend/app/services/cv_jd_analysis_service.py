from typing import Any

from configuration.settings import configuration
from core.enums.document_enum import DocumentType
from core.enums.user_enum import UserRole
from core.exception_handler.custom_exception import ExceptionValueError
from db.models.cv_jd_analysis import CvJdAnalysis
from db.models.document import Document
from db.models.job_posting import JobPosting
from db.models.users import User
from services.cv_parser_service import CvParserService
from services.document_match_service import DocumentMatchService, clean_text
from services.document_service import DocumentService
from services.job_posting_service import STATUS_PUBLISHED
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession


class CvJdAnalysisService:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session
        self.document_service = DocumentService(db_session)
        self.cv_parser_service = CvParserService(db_session)
        self.match_service = DocumentMatchService(db_session)

    async def analyze(
        self,
        user: User,
        cv_document_id: int,
        jd_text: str | None = None,
        job_posting_id: int | None = None,
    ) -> dict[str, Any]:
        posting = await self._get_analysis_job_posting(user=user, posting_id=job_posting_id)
        normalized_jd = self._posting_text(posting) if posting else str(jd_text or "").strip()
        if not clean_text(normalized_jd):
            raise ExceptionValueError(message="JD text is required.", status_code=422)

        cv_document = await self._get_analysis_cv_document(
            user=user,
            document_id=cv_document_id,
        )
        parsed_cv = await self.cv_parser_service.parse_cv_document(
            user=user,
            document_id=cv_document.id,
        )
        cv_text = str(parsed_cv.get("extracted_text", "")).strip()
        if not clean_text(cv_text):
            raise ExceptionValueError(
                message="Cannot extract text from CV.",
                status_code=422,
            )

        score = self.match_service.calculate_match_from_text(
            cv_text=cv_text,
            jd_text=normalized_jd,
        )
        
        if configuration.OPENAI_API_KEY:
            try:
                ai_report = await self._generate_ai_report_from_openai(
                    cv_text=cv_text,
                    jd_text=normalized_jd,
                    score=score,
                )
                report = {
                    "overall_score": score.get("match_score", 0.0),
                    "executive_summary": ai_report.get("executive_summary", ""),
                    "skill_gap": {
                        "matched_hard_skills": score.get("matched_skills", []),
                        "missing_hard_skills": score.get("missing_skills", []),
                    },
                    "deep_experience_alignment": ai_report.get("deep_experience_alignment", ""),
                    "actionable_recommendations": ai_report.get("actionable_recommendations", []),
                }
            except Exception as exc:
                import logging
                logging.getLogger("uvicorn").error(f"OpenAI CV/JD analysis failed, falling back to local: {exc}")
                report = self._generate_rich_mock_report(score, parsed_cv)
        elif configuration.GEMINI_API_KEY:
            try:
                ai_report = await self._generate_ai_report_from_gemini(
                    cv_text=cv_text,
                    jd_text=normalized_jd,
                    score=score,
                )
                report = {
                    "overall_score": score.get("match_score", 0.0),
                    "executive_summary": ai_report.get("executive_summary", ""),
                    "skill_gap": {
                        "matched_hard_skills": score.get("matched_skills", []),
                        "missing_hard_skills": score.get("missing_skills", []),
                    },
                    "deep_experience_alignment": ai_report.get("deep_experience_alignment", ""),
                    "actionable_recommendations": ai_report.get("actionable_recommendations", []),
                }
            except Exception as exc:
                import logging
                logging.getLogger("uvicorn").error(f"Gemini CV/JD analysis failed, falling back to local: {exc}")
                report = self._generate_rich_mock_report(score, parsed_cv)
        else:
            report = self._generate_rich_mock_report(score, parsed_cv)

        breakdown = self._build_score_breakdown(score=score, parsed_cv=parsed_cv)

        analysis = CvJdAnalysis(
            analyst_user_id=user.id,
            cv_document_id=cv_document.id,
            job_posting_id=posting.id if posting else None,
            cv_file_name_snapshot=cv_document.file_name,
            jd_text=normalized_jd,
            overall_score=report["overall_score"],
            report_json=report,
            score_breakdown_json=breakdown,
        )
        self.db_session.add(analysis)
        await self.db_session.commit()
        await self.db_session.refresh(analysis)
        return self.serialize_detail(analysis)

    async def _generate_ai_report_from_openai(
        self,
        cv_text: str,
        jd_text: str,
        score: dict[str, Any],
    ) -> dict[str, Any]:
        import httpx
        import json
        import logging

        log = logging.getLogger("uvicorn")

        system_prompt = (
            "Bạn là một chuyên gia Tuyển dụng Cấp cao (Senior Technical Recruiter) và Chuyên gia Đánh giá Nhân sự AI. "
            "Nhiệm vụ của bạn là phân tích sâu sắc, chi tiết mức độ phù hợp giữa hồ sơ ứng viên (CV) và Bản mô tả công việc (JD). "
            "Hãy viết các nhận định chi tiết bằng Tiếng Việt có dấu chuẩn xác, chuyên nghiệp, khách quan, giàu thông tin và lập luận chặt chẽ. "
            "Hãy phân tích thật kỹ càng dựa trên thông tin thực tế được cung cấp, tránh các nhận định chung chung sáo rỗng. "
            "Bạn PHẢI trả về kết quả dưới định dạng JSON có cấu trúc chính xác như sau:\n"
            "{\n"
            "  \"executive_summary\": \"Nhận định chung chi tiết (ít nhất 2-3 đoạn văn dài, khoảng 150-250 từ), chỉ ra các điểm mạnh nổi bật nhất của ứng viên đáp ứng yêu cầu công việc, các khoảng trống kỹ năng quan trọng hoặc điểm cần lưu ý đặc biệt, và kết luận tổng quan về mức độ phù hợp văn hóa/kỹ thuật của ứng viên.\",\n"
            "  \"deep_experience_alignment\": \"Đánh giá chi tiết về sự tương thích kinh nghiệm (ít nhất 1-2 đoạn văn dài, khoảng 100-150 từ), đối chiếu cụ thể số năm làm việc thực tế, thâm niên và sự phù hợp của các dự án/vị trí ứng viên từng đảm nhiệm trong CV với các nhiệm vụ/trách nhiệm trọng tâm nêu trong JD.\",\n"
            "  \"actionable_recommendations\": [\n"
            "    \"Khuyến nghị cụ thể 1 cho HR (ví dụ: cần hỏi thêm câu hỏi phỏng vấn nào để làm rõ kinh nghiệm X, hoặc xác minh kỹ năng Y...)\",\n"
            "    \"Khuyến nghị cụ thể 2 cho HR...\",\n"
            "    \"Khuyến nghị cụ thể 3 cho HR...\"\n"
            "  ]\n"
            "}"
        )

        def compact_text(text: str, max_chars: int = 4000) -> str:
            val = str(text or "").strip()
            if len(val) <= max_chars:
                return val
            return val[:max_chars // 2] + "\n... [TRUNCATED] ...\n" + val[-max_chars // 2:]

        cv_compacted = compact_text(cv_text)
        jd_compacted = compact_text(jd_text)

        user_prompt = json.dumps(
            {
                "overall_score": score.get("match_score", 0.0),
                "semantic_score": score.get("semantic_score", 0.0),
                "skill_score": score.get("skill_score", 0.0),
                "experience_score": score.get("experience_score", 0.0),
                "matched_skills": score.get("matched_skills", []),
                "missing_skills": score.get("missing_skills", []),
                "extra_skills": score.get("extra_cv_skills", []),
                "experience_years": score.get("experience", {}),
                "cv_content_extracted": cv_compacted,
                "jd_content_extracted": jd_compacted,
            },
            ensure_ascii=False,
        )

        headers = {
            "Authorization": f"Bearer {configuration.OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }
        
        log.info("Sending CV/JD matching request to OpenAI Chat Completion...")
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json={
                    "model": configuration.OPENAI_CHAT_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "temperature": 0.3,
                    "response_format": {"type": "json_object"},
                },
            )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        return json.loads(content)

    async def _generate_ai_report_from_gemini(
        self,
        cv_text: str,
        jd_text: str,
        score: dict[str, Any],
    ) -> dict[str, Any]:
        import httpx
        import json
        import logging

        log = logging.getLogger("uvicorn")

        system_prompt = (
            "Bạn là một chuyên gia Tuyển dụng Cấp cao (Senior Technical Recruiter) và Chuyên gia Đánh giá Nhân sự AI. "
            "Nhiệm vụ của bạn là phân tích sâu sắc, chi tiết mức độ phù hợp giữa hồ sơ ứng viên (CV) và Bản mô tả công việc (JD). "
            "Hãy viết các nhận định chi tiết bằng Tiếng Việt có dấu chuẩn xác, chuyên nghiệp, khách quan, giàu thông tin và lập luận chặt chẽ. "
            "Hãy phân tích thật kỹ càng dựa trên thông tin thực tế được cung cấp, tránh các nhận định chung chung sáo rỗng. "
            "Bạn PHẢI trả về kết quả dưới định dạng JSON có cấu trúc chính xác như sau:\n"
            "{\n"
            "  \"executive_summary\": \"Nhận định chung chi tiết (ít nhất 2-3 đoạn văn dài, khoảng 150-250 từ), chỉ ra các điểm mạnh nổi bật nhất của ứng viên đáp ứng yêu cầu công việc, các khoảng trống kỹ năng quan trọng hoặc điểm cần lưu ý đặc biệt, và kết luận tổng quan về mức độ phù hợp văn hóa/kỹ thuật của ứng viên.\",\n"
            "  \"deep_experience_alignment\": \"Đánh giá chi tiết về sự tương thích kinh nghiệm (ít nhất 1-2 đoạn văn dài, khoảng 100-150 từ), đối chiếu cụ thể số năm làm việc thực tế, thâm niên và sự phù hợp của các dự án/vị trí ứng viên từng đảm nhiệm trong CV với các nhiệm vụ/trách nhiệm trọng tâm nêu trong JD.\",\n"
            "  \"actionable_recommendations\": [\n"
            "    \"Khuyến nghị cụ thể 1 cho HR (ví dụ: cần hỏi thêm câu hỏi phỏng vấn nào để làm rõ kinh nghiệm X, hoặc xác minh kỹ năng Y...)\",\n"
            "    \"Khuyến nghị cụ thể 2 cho HR...\",\n"
            "    \"Khuyến nghị cụ thể 3 cho HR...\"\n"
            "  ]\n"
            "}"
        )

        def compact_text(text: str, max_chars: int = 4000) -> str:
            val = str(text or "").strip()
            if len(val) <= max_chars:
                return val
            return val[:max_chars // 2] + "\n... [TRUNCATED] ...\n" + val[-max_chars // 2:]

        cv_compacted = compact_text(cv_text)
        jd_compacted = compact_text(jd_text)

        user_prompt = json.dumps(
            {
                "overall_score": score.get("match_score", 0.0),
                "semantic_score": score.get("semantic_score", 0.0),
                "skill_score": score.get("skill_score", 0.0),
                "experience_score": score.get("experience_score", 0.0),
                "matched_skills": score.get("matched_skills", []),
                "missing_skills": score.get("missing_skills", []),
                "extra_skills": score.get("extra_cv_skills", []),
                "experience_years": score.get("experience", {}),
                "cv_content_extracted": cv_compacted,
                "jd_content_extracted": jd_compacted,
            },
            ensure_ascii=False,
        )

        models_to_try = [configuration.GEMINI_CHAT_MODEL]
        for fallback in ["gemini-2.5-flash", "gemini-3.1-flash-lite", "gemini-2.0-flash-lite"]:
            if fallback != configuration.GEMINI_CHAT_MODEL:
                models_to_try.append(fallback)
                
        last_exception = None
        import asyncio
        
        for model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={configuration.GEMINI_API_KEY}"
            max_retries = 3
            backoff = 1.5
            
            for attempt in range(max_retries):
                try:
                    log.info("Sending CV/JD matching request to Google Gemini API... model=%s (Attempt %s/%s)", model, attempt + 1, max_retries)
                    async with httpx.AsyncClient(timeout=60) as client:
                        response = await client.post(
                            url,
                            headers={"Content-Type": "application/json"},
                            json={
                                "systemInstruction": {
                                    "parts": [{"text": system_prompt}]
                                },
                                "contents": [{
                                    "parts": [{"text": user_prompt}]
                                }],
                                "generationConfig": {
                                    "responseMimeType": "application/json",
                                    "temperature": 0.3
                                }
                            }
                        )
                    
                    if response.status_code in (429, 500, 502, 503, 504):
                        if attempt < max_retries - 1:
                            sleep_time = backoff ** attempt
                            log.warning("Gemini API matching model=%s returned status %s. Retrying in %ss...", model, response.status_code, sleep_time)
                            await asyncio.sleep(sleep_time)
                            continue
                    
                    response.raise_for_status()
                    res_data = response.json()
                    content = res_data["candidates"][0]["content"]["parts"][0]["text"]
                    return json.loads(content)
                except (httpx.HTTPStatusError, httpx.RequestError) as exc:
                    last_exception = exc
                    if attempt < max_retries - 1:
                        sleep_time = backoff ** attempt
                        log.warning("Gemini API matching model=%s request failed: %s. Retrying in %ss...", model, str(exc), sleep_time)
                        await asyncio.sleep(sleep_time)
                        continue
                    log.error("Gemini API matching model=%s failed all %s attempts: %s. Trying fallback model if available.", model, max_retries, str(exc))
                    break
                    
        if last_exception:
            raise last_exception
        raise ExceptionValueError(message="All Gemini models failed to respond.", status_code=503)



    def _generate_rich_mock_report(self, score: dict[str, Any], parsed_cv: dict[str, Any]) -> dict[str, Any]:
        matched = list(score.get("matched_skills", []))
        missing = list(score.get("missing_skills", []))
        extra = list(score.get("extra_cv_skills", []))
        overall_score = float(score.get("match_score", 0.0) or 0.0)
        
        experience = score.get("experience", {})
        cv_years = int(experience.get("cv", 0) or 0)
        jd_years = int(experience.get("jd", 0) or 0)
        
        summary_paragraphs = []
        
        if overall_score >= 80:
            p1 = (
                f"Dựa trên kết quả phân tích thuật toán chuyên sâu, hồ sơ ứng viên thể hiện sự tương thích xuất sắc "
                f"với vị trí tuyển dụng (độ phù hợp đạt {overall_score}%). Ứng viên sở hữu nền tảng chuyên môn vững chắc "
                f"và các kỹ năng kỹ thuật cốt lõi đáp ứng hầu hết các tiêu chí trọng tâm được mô tả trong bản mô tả công việc."
            )
        elif overall_score >= 65:
            p1 = (
                f"Hồ sơ ứng viên có mức độ tương thích tốt và tiềm năng phát triển rõ rệt đối với vị trí tuyển dụng "
                f"(độ phù hợp đạt {overall_score}%). Các kỹ năng kỹ thuật cơ bản được đáp ứng đầy đủ, đảm bảo khả năng tiếp quản "
                f"công việc nhanh chóng sau thời gian onboarding ngắn."
            )
        elif overall_score >= 50:
            p1 = (
                f"Kết quả đối chiếu cho thấy ứng viên đáp ứng một phần các yêu cầu của vị trí tuyển dụng "
                f"(độ phù hợp đạt {overall_score}%). Ứng viên có tiềm năng nhưng vẫn tồn tại một số khoảng trống kỹ năng quan trọng "
                f"hoặc thiếu hụt kinh nghiệm thực tế trong các công nghệ then chốt nêu trong JD."
            )
        else:
            p1 = (
                f"Hồ sơ ứng viên hiện tại chưa đạt mức độ phù hợp mong đợi cho vị trí này (độ phù hợp chỉ đạt {overall_score}%). "
                f"Có sự chênh lệch lớn về mặt kỹ năng chuyên môn hoặc kinh nghiệm thực chiến so với các yêu cầu bắt buộc trong JD."
            )
        summary_paragraphs.append(p1)
        
        if matched:
            matched_str = ", ".join(matched)
            p2 = (
                f"Về mặt kỹ năng chuyên môn, ứng viên chứng minh được năng lực thực tế qua việc sở hữu các hard skills then chốt: {matched_str}. "
                f"Việc làm chủ các công nghệ này giúp ứng viên có lợi thế lớn trong việc triển khai trực tiếp các nhiệm vụ kỹ thuật của dự án."
            )
            if extra:
                extra_str = ", ".join(extra[:3])
                p2 += f" Ngoài ra, ứng viên còn có thêm các kỹ năng bổ trợ giá trị như: {extra_str}, góp phần làm đa dạng hóa năng lực giải quyết vấn đề."
        else:
            p2 = (
                "Hồ sơ chưa thể hiện rõ các kỹ năng chuyên môn trùng khớp trực tiếp với yêu cầu bắt buộc của JD. "
                "Điều này đòi hỏi HR cần phỏng vấn sâu hoặc yêu cầu làm bài test kỹ thuật để xác minh năng lực thực tế của ứng viên."
            )
        summary_paragraphs.append(p2)
        
        if missing:
            missing_str = ", ".join(missing)
            p3 = (
                f"Tuy nhiên, hệ thống nhận diện một số khoảng trống công nghệ cần lưu ý bao gồm: {missing_str}. "
                f"Đây là các kỹ năng quan trọng được đề cập trong JD nhưng chưa tìm thấy minh chứng rõ ràng trong CV của ứng viên. "
                f"HR cần đánh giá mức độ ảnh hưởng của sự thiếu hụt này đối với tiến độ công việc."
            )
        else:
            p3 = "Hệ thống không phát hiện thiếu hụt kỹ năng kỹ thuật quan trọng nào. Ứng viên đáp ứng toàn diện bộ khung năng lực yêu cầu."
        summary_paragraphs.append(p3)
        
        executive_summary = "\n\n".join(summary_paragraphs)
        
        exp_paragraphs = []
        if jd_years > 0:
            if cv_years >= jd_years:
                ep1 = (
                    f"Về thâm niên, ứng viên sở hữu {cv_years} năm kinh nghiệm làm việc tích lũy, vượt qua yêu cầu tối thiểu "
                    f"của vị trí là {jd_years} năm. Sự tương thích về thời gian công tác này cho thấy ứng viên đã trải qua "
                    f"nhiều chu kỳ phát triển dự án và tích lũy đủ độ chín chắn trong công việc."
                )
            elif cv_years > 0:
                ep1 = (
                    f"Số năm kinh nghiệm bóc tách được của ứng viên là {cv_years} năm, hiện tại chưa đạt mức yêu cầu "
                    f"{jd_years} năm của JD. Tuy nhiên, nếu ứng viên đã trực tiếp tham gia vào các dự án có tính chất tương tự, "
                    f"HR có thể cân nhắc đánh giá dựa trên chất lượng sản phẩm thay vì chỉ dựa vào số năm cơ học."
                )
            else:
                ep1 = (
                    f"JD yêu cầu mốc kinh nghiệm tối thiểu là {jd_years} năm. Do cấu trúc CV hoặc định dạng tệp tin, "
                    f"hệ thống chưa bóc tách được số năm kinh nghiệm chính xác từ CV của ứng viên. HR cần xác nhận lại mốc thời gian này."
                )
        else:
            ep1 = (
                f"JD tuyển dụng không quy định rõ số năm kinh nghiệm tối thiểu. Ứng viên hiện có {cv_years} năm kinh nghiệm "
                f"ghi nhận trong hồ sơ, đây là một điểm cộng giúp đảm bảo tính tự lập trong công việc."
            )
        exp_paragraphs.append(ep1)
        
        if matched:
            ep2 = (
                f"Các dự án trong quá khứ của ứng viên sử dụng các công nghệ {', '.join(matched[:3])} "
                f"có tính chất tương đồng cao với môi trường công nghệ của dự án hiện tại, tạo điều kiện thuận lợi cho việc hòa nhập."
            )
            exp_paragraphs.append(ep2)
            
        deep_experience_alignment = "\n\n".join(exp_paragraphs)
        
        recommendations = []
        if missing:
            recommendations.append(
                f"HR nên đặt câu hỏi chất vấn sâu trong buổi phỏng vấn để làm rõ mức độ hiểu biết hoặc kinh nghiệm thực tế đối với các công nghệ thiếu hụt: {', '.join(missing)}."
            )
        if jd_years > 0 and cv_years < jd_years:
            recommendations.append(
                f"Yêu cầu ứng viên làm rõ vai trò và đóng góp cụ thể trong các dự án gần nhất để đánh giá xem năng lực thực tế có bù đắp được việc thiếu số năm kinh nghiệm ({cv_years}/{jd_years} năm) hay không."
            )
        if overall_score < 65:
            recommendations.append(
                "Đề xuất cho ứng viên thực hiện một bài kiểm tra kỹ thuật (Coding Test/System Design) ngắn để có đánh giá khách quan nhất."
            )
        if not recommendations:
            recommendations.append(
                "Ứng viên đạt điểm số phù hợp rất cao. Khuyến nghị HR nhanh chóng liên hệ xếp lịch phỏng vấn trực tiếp với Technical Lead."
            )
            
        return {
            "overall_score": overall_score,
            "executive_summary": executive_summary,
            "skill_gap": {
                "matched_hard_skills": matched,
                "missing_hard_skills": missing,
            },
            "deep_experience_alignment": deep_experience_alignment,
            "actionable_recommendations": recommendations,
        }

    async def list_history(
        self,
        user: User,
        page: int = 1,
        page_size: int = 20,
    ) -> dict[str, Any]:
        page = max(1, page)
        page_size = min(max(1, page_size), 100)
        filters = (
            CvJdAnalysis.analyst_user_id == user.id,
            CvJdAnalysis.deleted_at.is_(None),
        )

        count_query = select(func.count()).select_from(CvJdAnalysis).where(*filters)
        total = int((await self.db_session.execute(count_query)).scalar_one() or 0)
        query = (
            select(CvJdAnalysis)
            .where(*filters)
            .order_by(CvJdAnalysis.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await self.db_session.execute(query)
        items = [self.serialize_history_item(item) for item in result.scalars().all()]
        return {"items": items, "total": total, "page": page, "page_size": page_size}

    async def get_detail(self, user: User, analysis_id: int) -> dict[str, Any]:
        analysis = await self._get_actor_analysis(user=user, analysis_id=analysis_id)
        return self.serialize_detail(analysis)

    async def _get_analysis_cv_document(
        self,
        user: User,
        document_id: int,
    ) -> Document:
        document = await self.document_service._get_accessible_document(
            user=user,
            document_id=document_id,
        )
        if document.document_type != DocumentType.CV:
            raise ExceptionValueError(
                message="Only CV documents can be analyzed.",
                status_code=422,
            )
        if user.role == UserRole.HR and document.owner_user_id != user.id:
            raise ExceptionValueError(
                message="HR can only analyze CV documents uploaded by the same account.",
                status_code=403,
            )
        return document

    async def _get_analysis_job_posting(
        self,
        user: User,
        posting_id: int | None,
    ) -> JobPosting | None:
        if not posting_id:
            return None
        query = select(JobPosting).where(
            JobPosting.id == posting_id,
            JobPosting.deleted_at.is_(None),
        )
        posting = (await self.db_session.execute(query)).scalar_one_or_none()
        if posting is None:
            raise ExceptionValueError(message="Job posting not found.", status_code=404)
        if user.role == UserRole.ADMIN:
            return posting
        if user.role == UserRole.HR and posting.hr_user_id == user.id:
            return posting
        if posting.status == STATUS_PUBLISHED:
            return posting
        raise ExceptionValueError(message="Job posting is not published.", status_code=422)

    async def _get_actor_analysis(
        self,
        user: User,
        analysis_id: int,
    ) -> CvJdAnalysis:
        query = select(CvJdAnalysis).where(
            CvJdAnalysis.id == analysis_id,
            CvJdAnalysis.deleted_at.is_(None),
        )
        analysis = (await self.db_session.execute(query)).scalar_one_or_none()
        if analysis is None:
            raise ExceptionValueError(message="Analysis report not found.", status_code=404)
        if user.role != UserRole.ADMIN and analysis.analyst_user_id != user.id:
            raise ExceptionValueError(
                message="You do not have permission to access this analysis report.",
                status_code=403,
            )
        return analysis

    @staticmethod
    def build_report(score: dict[str, Any]) -> dict[str, Any]:
        matched = list(score.get("matched_skills", []))
        missing = list(score.get("missing_skills", []))
        experience = score.get("experience", {})
        cv_years = int(experience.get("cv", 0) or 0)
        jd_years = int(experience.get("jd", 0) or 0)
        overall_score = float(score.get("match_score", 0.0) or 0.0)

        return {
            "overall_score": overall_score,
            "executive_summary": CvJdAnalysisService._summary_text(
                overall_score=overall_score,
                matched=matched,
                missing=missing,
                recommendation=str(score.get("recommendation", "")),
                confidence=float(score.get("confidence", 0.0) or 0.0),
            ),
            "skill_gap": {
                "matched_hard_skills": matched,
                "missing_hard_skills": missing,
            },
            "deep_experience_alignment": CvJdAnalysisService._experience_text(
                cv_years=cv_years,
                jd_years=jd_years,
            ),
            "actionable_recommendations": CvJdAnalysisService._recommendations(
                score=score,
                missing=missing,
                cv_years=cv_years,
                jd_years=jd_years,
            ),
        }

    @staticmethod
    def serialize_detail(analysis: CvJdAnalysis) -> dict[str, Any]:
        report = analysis.report_json or {}
        return {
            "id": analysis.id,
            "analyst_user_id": analysis.analyst_user_id,
            "cv_document_id": analysis.cv_document_id,
            "job_posting_id": analysis.job_posting_id,
            "cv_file_name_snapshot": analysis.cv_file_name_snapshot,
            "jd_text": analysis.jd_text,
            "overall_score": float(
                report.get("overall_score", analysis.overall_score) or 0.0
            ),
            "executive_summary": str(report.get("executive_summary", "")),
            "skill_gap": report.get("skill_gap", {}),
            "deep_experience_alignment": str(
                report.get("deep_experience_alignment", "")
            ),
            "actionable_recommendations": list(
                report.get("actionable_recommendations", [])
            ),
            "score_breakdown": analysis.score_breakdown_json or {},
            "created_at": analysis.created_at,
        }

    @staticmethod
    def serialize_history_item(analysis: CvJdAnalysis) -> dict[str, Any]:
        report = analysis.report_json or {}
        return {
            "id": analysis.id,
            "cv_document_id": analysis.cv_document_id,
            "job_posting_id": analysis.job_posting_id,
            "cv_file_name_snapshot": analysis.cv_file_name_snapshot,
            "overall_score": float(
                report.get("overall_score", analysis.overall_score) or 0.0
            ),
            "executive_summary": str(report.get("executive_summary", "")),
            "created_at": analysis.created_at,
        }

    @staticmethod
    def _build_score_breakdown(
        score: dict[str, Any],
        parsed_cv: dict[str, Any],
    ) -> dict[str, Any]:
        experience = score.get("experience", {})
        return {
            "semantic_score": float(score.get("semantic_score", 0.0) or 0.0),
            "skill_score": float(score.get("skill_score", 0.0) or 0.0),
            "experience_score": float(score.get("experience_score", 0.0) or 0.0),
            "weights": {
                "semantic": configuration.WEIGHT_SEMANTIC,
                "skill": configuration.WEIGHT_SKILL,
                "experience": configuration.WEIGHT_EXPERIENCE,
            },
            "experience": {
                "cv_years": int(experience.get("cv", 0) or 0),
                "jd_years": int(experience.get("jd", 0) or 0),
            },
            "semantic_method": str(score.get("semantic_method", "unknown")),
            "semantic_fallback_reason": str(
                score.get("semantic_fallback_reason", "")
            ),
            "recommendation": str(score.get("recommendation", "")),
            "confidence": float(score.get("confidence", 0.0) or 0.0),
            "score_interpretation": str(score.get("score_interpretation", "")),
            "skills": {
                "jd_hard_skills": list(score.get("jd_skills", [])),
                "cv_hard_skills": list(score.get("cv_skills", [])),
                "extra_cv_hard_skills": list(score.get("extra_cv_skills", [])),
            },
            "cv_extraction": {
                "mode": str(parsed_cv.get("extraction_mode", "unknown")),
                "ocr_used": bool(parsed_cv.get("ocr_used", False)),
                "character_count": int(parsed_cv.get("character_count", 0) or 0),
            },
        }

    @staticmethod
    def _posting_text(posting: JobPosting) -> str:
        if not posting:
            return ""
        return "\n".join(
            item
            for item in [
                posting.title,
                posting.company or "",
                posting.location or "",
                posting.salary or "",
                posting.work_type or "",
                posting.experience or "",
                posting.level or "",
                posting.deadline or "",
                posting.description or "",
                posting.requirements or "",
                posting.benefits or "",
            ]
            if item
        )

    @staticmethod
    def _summary_text(
        overall_score: float,
        matched: list[str],
        missing: list[str],
        recommendation: str = "",
        confidence: float = 0.0,
    ) -> str:
        if overall_score >= 80:
            verdict = "Hồ sơ ứng viên (CV) thể hiện mức độ phù hợp rất cao đối với các yêu cầu cốt lõi đề ra trong Bản mô tả công việc (JD)."
        elif overall_score >= 65:
            verdict = "Hồ sơ ứng viên (CV) đáp ứng tốt phần lớn các yêu cầu quan trọng và nên được đưa vào vòng phỏng vấn/đánh giá tiếp theo."
        elif overall_score >= 50:
            verdict = "Hồ sơ ứng viên (CV) có một số điểm tương đồng và tín hiệu phù hợp nhất định, tuy nhiên bộ phận tuyển dụng (HR) cần thẩm định và phỏng vấn kỹ lưỡng hơn."
        else:
            verdict = "Hồ sơ ứng viên (CV) chưa cho thấy sự phù hợp rõ nét đối với vị trí tuyển dụng này, các kỹ năng chuyên môn còn khoảng cách khá lớn so với yêu cầu."

        matched_text = (
            " Các kỹ năng trùng khớp nổi bật bao gồm: " + ", ".join(matched[:5]) + "."
            if matched
            else " Chưa tìm thấy kỹ năng chuyên môn trùng khớp rõ ràng trong CV."
        )
        missing_text = (
            " Các mảng kiến thức/kỹ năng cần làm rõ thêm: " + ", ".join(missing[:5]) + "."
            if missing
            else " Ứng viên đáp ứng đầy đủ danh sách kỹ năng ưu tiên."
        )
        confidence_text = (
            f" Mức độ tin cậy của thuật toán phân tích đạt {confidence:.0f}%."
            if confidence
            else ""
        )
        recommendation_text = f" Đề xuất hành động từ hệ thống: {recommendation}." if recommendation else ""
        return f"{verdict}{matched_text}{missing_text}{confidence_text}{recommendation_text}"

    @staticmethod
    def _experience_text(cv_years: int, jd_years: int) -> str:
        if jd_years <= 0:
            return (
                "Bản mô tả công việc (JD) không quy định rõ số năm kinh nghiệm tối thiểu; thành phần kinh nghiệm được đánh giá ở mức trung tính."
            )
        if cv_years >= jd_years:
            return (
                f"Kinh nghiệm làm việc của ứng viên được bóc tách từ hồ sơ là {cv_years} năm, hoàn toàn đáp ứng và vượt mốc yêu cầu tối thiểu {jd_years} năm từ phía nhà tuyển dụng."
            )
        if cv_years > 0:
            return (
                f"Kinh nghiệm làm việc được bóc tách từ hồ sơ ứng viên là {cv_years} năm, hiện tại đang thấp hơn mốc yêu cầu {jd_years} năm trong JD."
            )
        return (
            f"Hệ thống không tự động bóc tách được số năm kinh nghiệm cụ thể từ CV của ứng viên, trong khi JD đề xuất mốc tối thiểu là {jd_years} năm. Cần kiểm chứng thêm."
        )

    @staticmethod
    def _recommendations(
        score: dict[str, Any],
        missing: list[str],
        cv_years: int,
        jd_years: int,
    ) -> list[str]:
        recommendations: list[str] = []
        if missing:
            recommendations.append(
                "Bổ sung hoặc xác minh minh chứng dự án cho các kỹ năng chưa thấy rõ: "
                + ", ".join(missing[:5])
                + "."
            )
        if jd_years > 0 and cv_years < jd_years:
            recommendations.append(
                "Làm rõ thời lượng, vai trò và phạm vi kinh nghiệm liên quan đến yêu cầu số năm trong JD."
            )
        if float(score.get("semantic_score", 0.0) or 0.0) < 55:
            recommendations.append(
                "Đối chiếu lại phần tóm tắt và kinh nghiệm chính của CV với trách nhiệm trọng tâm trong JD."
            )
        if float(score.get("confidence", 0.0) or 0.0) < 45:
            recommendations.append(
                "Tín hiệu dữ liệu còn thấp; HR nên đọc thủ công CV/JD trước khi ra quyết định."
            )
        if not recommendations:
            recommendations.append(
                "Giữ các minh chứng kỹ năng, vai trò dự án và kết quả công việc nổi bật ở đầu CV."
            )
        return recommendations
