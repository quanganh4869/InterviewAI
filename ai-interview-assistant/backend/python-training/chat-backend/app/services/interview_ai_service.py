import json
import re
from typing import Any

import httpx
from configuration.logger.config import log
from configuration.settings import configuration
from core.exception_handler.custom_exception import ExceptionValueError


def _compact_text(value: str, max_chars: int = 3000) -> str:
    text = " ".join(str(value or "").split())
    return text[:max_chars]


def _normalize_transcript(value: str) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    text = re.sub(r"\s+([,.!?;:])", r"\1", text)
    filler_patterns = [
        "Transcript mock:",
        "hệ thống chưa cấu hình",
        "No meaningful response was detected",
    ]
    if any(pattern.lower() in text.lower() for pattern in filler_patterns):
        return ""
    return text


class InterviewAiProvider:
    provider_name = "mock"

    async def generate_questions(self, context: dict[str, Any]) -> list[dict[str, str]]:
        raise NotImplementedError

    async def transcribe(self, media: bytes, file_name: str, content_type: str) -> str:
        raise NotImplementedError

    async def evaluate(self, context: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    async def compare_sessions(self, job_title: str, jd_text: str, sessions_data: list[dict[str, Any]]) -> dict[str, Any]:
        raise NotImplementedError



class MockInterviewAiProvider(InterviewAiProvider):
    provider_name = "mock"

    async def generate_questions(self, context: dict[str, Any]) -> list[dict[str, str]]:
        title = context.get("job_title") or "vị trí này"
        missing = context.get("missing_skills") or []
        questions = [
            {
                "question_text": f"Hãy giới thiệu ngắn gọn kinh nghiệm phù hợp nhất của bạn cho {title}.",
                "category": "overview",
                "expected_signal": "Ứng viên liên hệ kinh nghiệm thực tế với JD.",
            },
            {
                "question_text": "Mô tả một dự án gần đây nhất thể hiện năng lực kỹ thuật chính của bạn.",
                "category": "technical",
                "expected_signal": "Có bối cảnh, hành động, kết quả và công nghệ cụ thể.",
            },
            {
                "question_text": "Khi gặp yêu cầu mơ hồ hoặc thay đổi gấp, bạn xử lý như thế nào?",
                "category": "behavioral",
                "expected_signal": "Thể hiện cách làm rõ yêu cầu và phối hợp stakeholder.",
            },
        ]
        if missing:
            questions.append(
                {
                    "question_text": f"JD có nhắc tới {', '.join(missing[:3])}. Bạn đã từng dùng hoặc học các kỹ năng này như thế nào?",
                    "category": "skill_gap",
                    "expected_signal": "Ứng viên trung thực về khoảng trống và kế hoạch bù đắp.",
                }
            )
        questions.append(
            {
                "question_text": "Nếu được nhận, kế hoạch 30 ngày đầu tiên của bạn là gì?",
                "category": "readiness",
                "expected_signal": "Có định hướng onboarding và ưu tiên rõ ràng.",
            }
        )
        return questions[: max(1, int(configuration.INTERVIEW_MAX_QUESTIONS or 6))]

    async def transcribe(self, media: bytes, file_name: str, content_type: str) -> str:
        return "Transcript mock: hệ thống chưa cấu hình OPENAI_API_KEY nên chưa gọi Whisper thật."

    async def evaluate(self, context: dict[str, Any]) -> dict[str, Any]:
        answers = context.get("answers") or []
        answered_count = sum(1 for item in answers if item.get("transcript"))
        base = 65 + min(20, answered_count * 5)
        return {
            "overall_score": float(base),
            "communication_score": float(max(55, base - 4)),
            "technical_score": float(base),
            "jd_alignment_score": float(min(92, base + 3)),
            "strengths": [
                "Câu trả lời có cấu trúc cơ bản và bám vào bối cảnh JD.",
                "Ứng viên hoàn thành các câu hỏi trong phiên phỏng vấn.",
            ],
            "weaknesses": [
                "Cần thêm ví dụ định lượng và bằng chứng kết quả cụ thể.",
            ],
            "red_flags": [],
            "hiring_recommendation": "Cần HR review thêm transcript và recording trước khi quyết định.",
            "per_question_feedback": [
                {
                    "question_id": item.get("question_id"),
                    "feedback": "Cần đối chiếu thêm với video/audio thực tế.",
                }
                for item in answers
            ],
        }

    async def compare_sessions(self, job_title: str, jd_text: str, sessions_data: list[dict[str, Any]]) -> dict[str, Any]:
        candidates = []
        for s in sessions_data:
            eval_data = s.get("evaluation") or {}
            eval_json = eval_data.get("evaluation") or {}
            candidates.append({
                "session_id": s.get("id"),
                "name": s.get("candidate_name") or f"Phiên #{s.get('id')}",
                "overall_score": float(eval_data.get("overall_score") or 75.0),
                "communication_score": float(eval_data.get("communication_score") or 75.0),
                "technical_score": float(eval_data.get("technical_score") or 75.0),
                "jd_alignment_score": float(eval_data.get("jd_alignment_score") or 75.0),
                "strengths": eval_json.get("strengths") or ["Câu trả lời mạch lạc", "Thể hiện kinh nghiệm cơ bản"],
                "weaknesses": eval_json.get("weaknesses") or ["Cần đưa thêm ví dụ thực tế"],
                "jd_fit_analysis": "Ứng viên có sự phù hợp ở mức khá đối với mô tả công việc."
            })
        
        return {
            "comparison_summary": f"Mô phỏng báo cáo so sánh các ứng viên cho vị trí {job_title}. Các ứng viên đều hoàn thành tốt các câu hỏi nhưng có sự chênh lệch nhẹ ở khả năng giao tiếp và mức độ am hiểu công nghệ cốt lõi.",
            "candidates": candidates,
            "comparison_matrix": {
                "technical_depth": "So sánh chiều sâu kỹ thuật: Các ứng viên có nền tảng tương đương, tuy nhiên cần kiểm tra kỹ hơn qua bài test coding.",
                "communication": "So sánh kỹ năng giao tiếp: Giao tiếp trôi chảy, diễn đạt ý rõ ràng, tự tin.",
                "problem_solving": "So sánh tư duy giải quyết vấn đề: Đưa ra giải pháp trực diện nhưng cần tối ưu hóa cấu trúc hơn."
            },
            "final_verdict": "Đề xuất ưu tiên phỏng vấn ứng viên có điểm số đánh giá cao nhất."
        }



class OpenAIInterviewAiProvider(InterviewAiProvider):
    provider_name = "openai"

    def __init__(self) -> None:
        self.api_key = configuration.OPENAI_API_KEY
        self.chat_model = configuration.OPENAI_CHAT_MODEL
        self.transcribe_model = configuration.OPENAI_TRANSCRIBE_MODEL

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.api_key}"}

    async def _chat_json(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={**self._headers(), "Content-Type": "application/json"},
                json={
                    "model": self.chat_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "temperature": 0.2,
                    "response_format": {"type": "json_object"},
                },
            )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        return json.loads(content)

    async def generate_questions(self, context: dict[str, Any]) -> list[dict[str, str]]:
        system_prompt = (
            "Bạn là một Trưởng nhóm Kỹ thuật (Technical Lead) kiêm chuyên gia Phỏng vấn Chuyên nghiệp. "
            "Nhiệm vụ của bạn là tạo ra một bộ câu hỏi phỏng vấn ĐƯỢC CÁ NHÂN HÓA SÂU SẮC dành riêng cho ứng viên, "
            "dựa trên hồ sơ của họ (CV) và mô tả công việc (JD). "
            "YÊU CẦU QUAN TRỌNG:\n"
            "1. KHÔNG được hỏi các câu hỏi chung chung mang tính lý thuyết sáo rỗng (ví dụ: 'Hãy giới thiệu bản thân', 'Kỹ năng giao tiếp là gì...').\n"
            "2. Bạn PHẢI đọc thật kỹ CV để trích xuất các thông tin cụ thể: tên các dự án thực tế ứng viên đã làm, vai trò cụ thể, các công nghệ/thư viện đã sử dụng, và các thành tích/thách thức họ ghi trong CV.\n"
            "3. Thiết kế câu hỏi phỏng vấn thực tế: Mỗi câu hỏi phải đề cập trực tiếp đến một dự án hoặc kinh nghiệm cụ thể trong CV của ứng viên và đối chiếu với yêu cầu công việc trong JD. Ví dụ: 'Trong CV bạn đề cập đã sử dụng công nghệ [X] vào dự án [Tên Dự án] để giải quyết [Vấn đề], hãy phân tích...', hoặc 'JD yêu cầu kỹ năng [Y], trong CV bạn có ghi đã làm việc với nó ở công ty [Z] thế nào...'\n"
            "4. Các câu hỏi viết bằng Tiếng Việt chuẩn xác, tự nhiên, chuyên nghiệp và có chiều sâu kỹ thuật.\n"
            "Bạn PHẢI trả về dữ liệu định dạng JSON có cấu trúc chính xác như sau:\n"
            "{\n"
            "  \"questions\": [\n"
            "    {\n"
            "      \"question_text\": \"Nội dung câu hỏi cá nhân hóa chi tiết...\",\n"
            "      \"category\": \"overview hoặc technical hoặc behavioral hoặc skill_gap hoặc readiness\",\n"
            "      \"expected_signal\": \"Tín hiệu hoặc từ khóa chuyên môn cốt lõi mong đợi nghe từ câu trả lời của ứng viên...\"\n"
            "    }\n"
            "  ]\n"
            "}"
        )
        payload = await self._chat_json(
            system_prompt,
            json.dumps(
                {
                    "job_title": context.get("job_title"),
                    "cv": _compact_text(context.get("cv_text", "")),
                    "jd": _compact_text(context.get("jd_text", "")),
                    "analysis_report": context.get("analysis_report", {}),
                    "max_questions": configuration.INTERVIEW_MAX_QUESTIONS,
                },
                ensure_ascii=False,
            ),
        )
        questions = payload.get("questions") or []
        return [
            {
                "question_text": str(item.get("question_text") or item.get("question") or "").strip(),
                "category": str(item.get("category") or "general").strip(),
                "expected_signal": str(item.get("expected_signal") or "").strip(),
            }
            for item in questions
            if str(item.get("question_text") or item.get("question") or "").strip()
        ][: max(1, int(configuration.INTERVIEW_MAX_QUESTIONS or 6))]

    async def transcribe(self, media: bytes, file_name: str, content_type: str) -> str:
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers=self._headers(),
                data={
                    "model": self.transcribe_model,
                    "language": "vi",
                    "temperature": "0",
                    "prompt": (
                        "Đây là câu trả lời trong một buổi phỏng vấn tuyển dụng. "
                        "Hãy chép lại chính xác lời ứng viên nói bằng tiếng Việt có dấu; "
                        "giữ nguyên các thuật ngữ tiếng Anh, tên công nghệ, framework, thư viện, "
                        "tên riêng và số liệu. Không thêm nhận xét, không tóm tắt, không bịa nội dung."
                    ),
                },
                files={"file": (file_name, media, content_type or "application/octet-stream")},
            )
        response.raise_for_status()
        return _normalize_transcript(response.json().get("text") or "")

    async def evaluate(self, context: dict[str, Any]) -> dict[str, Any]:
        system_prompt = (
            "Bạn là Hội đồng Đánh giá Nhân sự cấp cao (HR Assessment Board) kiêm Chuyên gia Huấn luyện Phỏng vấn (Interview Coach).\n"
            "Nhiệm vụ của bạn là đánh giá toàn diện câu trả lời của ứng viên cho từng câu hỏi dựa trên mô tả công việc (JD), CV của ứng viên (nếu có), và đưa ra nhận xét chi tiết.\n"
            "Hãy viết các nhận định chi tiết bằng Tiếng Việt có dấu chuẩn xác, chuyên nghiệp, khách quan, giàu thông tin và lập luận chặt chẽ.\n"
            "Bạn PHẢI trả về kết quả dưới định dạng JSON có cấu trúc chính xác như sau:\n"
            "{\n"
            "  \"overall_score\": 75.0,\n"
            "  \"communication_score\": 80.0,\n"
            "  \"technical_score\": 70.0,\n"
            "  \"jd_alignment_score\": 75.0,\n"
            "  \"strengths\": [\"Điểm mạnh 1\", \"Điểm mạnh 2\"],\n"
            "  \"weaknesses\": [\"Điểm yếu/Hạn chế 1\", \"Điểm yếu/Hạn chế 2\"],\n"
            "  \"red_flags\": [],\n"
            "  \"hiring_recommendation\": \"Đề xuất tuyển dụng chi tiết bằng tiếng Việt...\",\n"
            "  \"per_question_feedback\": [\n"
            "    {\n"
            "      \"question_id\": 1,\n"
            "      \"score\": 75.0,\n"
            "      \"summary\": \"Tóm tắt câu trả lời của ứng viên hoặc ghi nhận xét chung (ví dụ: 'Ứng viên trình bày rõ ràng về dự án X nhưng còn thiếu ý Y...'). Nếu không nghe được gì hoặc câu trả lời không có nghĩa, ghi: 'No meaningful response was detected in the recording.'.\",\n"
            "      \"details_score\": {\n"
            "        \"content_score\": 70.0,\n"
            "        \"clarity_score\": 80.0,\n"
            "        \"relevance_score\": 75.0,\n"
            "        \"confidence_score\": 75.0\n"
            "      },\n"
            "      \"strengths\": [\"Điểm mạnh 1 trong câu trả lời này...\"],\n"
            "      \"weaknesses\": [\"Cần cải thiện 1...\"],\n"
            "      \"suggested_answer\": {\n"
            "        \"answer_structure\": [\n"
            "          \"START: [Câu mở đầu ấn tượng ví dụ cho câu hỏi này]\",\n"
            "          \"1. [Bước phát triển ý 1]\",\n"
            "          \"2. [Bước phát triển ý 2]\",\n"
            "          \"3. [Bước phát triển ý 3]\",\n"
            "          \"4. [Bước phát triển ý 4 (nếu có)]\",\n"
            "          \"END: [Câu kết luận đúc rút ấn tượng]\"\n"
            "        ],\n"
            "        \"key_tips\": [\n"
            "          \"[Mẹo 1: Hướng dẫn ứng viên liên hệ kinh nghiệm cụ thể từ CV của họ (nêu rõ tên dự án, công nghệ ứng viên ghi trong CV) với yêu cầu JD]\",\n"
            "          \"[Mẹo 2: Cách nhấn mạnh kỹ năng mềm/kỹ thuật phù hợp...]\",\n"
            "          \"[Mẹo 3: Tránh lỗi thường gặp...]\"\n"
            "        ]\n"
            "      }\n"
            "    }\n"
            "  ]\n"
            "}"
        )
        payload = await self._chat_json(
            system_prompt,
            json.dumps(
                {
                    "job_title": context.get("job_title"),
                    "jd": _compact_text(context.get("jd_text", "")),
                    "cv": _compact_text(context.get("cv_text", "")),
                    "answers": context.get("answers", []),
                },
                ensure_ascii=False,
            ),
        )
        for key in ["overall_score", "communication_score", "technical_score", "jd_alignment_score"]:
            payload[key] = float(payload.get(key) or 0)
        return payload

    async def compare_sessions(self, job_title: str, jd_text: str, sessions_data: list[dict[str, Any]]) -> dict[str, Any]:
        system_prompt = (
            "Bạn là một chuyên gia Tuyển dụng Cấp cao (Senior Recruiter) kiêm Chuyên gia Phân tích Nhân sự AI.\n"
            "Nhiệm vụ của bạn là so sánh và đối chiếu kết quả phỏng vấn của các ứng viên (hoặc các phiên phỏng vấn khác nhau) cho vị trí công việc (Job Title và JD).\n"
            "Hãy viết các nhận định chi tiết bằng Tiếng Việt có dấu chuẩn xác, chuyên nghiệp, khách quan, giàu thông tin và lập luận chặt chẽ.\n"
            "Bạn PHẢI trả về kết quả dưới định dạng JSON có cấu trúc chính xác như sau:\n"
            "{\n"
            "  \"comparison_summary\": \"Tóm tắt so sánh tổng quan giữa các phiên phỏng vấn (1-2 đoạn văn dài, chỉ ra sự tương đồng và khác biệt cốt lõi).\",\n"
            "  \"candidates\": [\n"
            "    {\n"
            "      \"session_id\": 1,\n"
            "      \"name\": \"Tên ứng viên hoặc Mã phiên\",\n"
            "      \"overall_score\": 85.0,\n"
            "      \"communication_score\": 80.0,\n"
            "      \"technical_score\": 90.0,\n"
            "      \"jd_alignment_score\": 85.0,\n"
            "      \"strengths\": [\"Điểm mạnh 1\", \"Điểm mạnh 2\"],\n"
            "      \"weaknesses\": [\"Điểm cần cải thiện 1\", \"Điểm cần cải thiện 2\"],\n"
            "      \"jd_fit_analysis\": \"Phân tích mức độ tương thích công việc cụ thể cho ứng viên này (nêu rõ sự phù hợp thâm niên/kỹ năng trong JD).\"\n"
            "    }\n"
            "  ],\n"
            "  \"comparison_matrix\": {\n"
            "    \"technical_depth\": \"So sánh chi tiết về chiều sâu kỹ thuật, mức độ hiểu biết chuyên môn, công cụ và công nghệ giữa các ứng viên.\",\n"
            "    \"communication\": \"So sánh về kỹ năng diễn đạt, sự rõ ràng, mạch lạc, khả năng lập luận và sự tự tin.\",\n"
            "    \"problem_solving\": \"So sánh về tư duy giải quyết vấn đề, cách tiếp cận các tình huống thực tế được nêu trong câu hỏi.\"\n"
            "  },\n"
            "  \"final_verdict\": \"Khuyến nghị tuyển dụng cuối cùng: So sánh thứ tự ưu tiên các ứng viên, lý do tại sao và đề xuất hành động tiếp theo cho HR.\"\n"
            "}"
        )

        cleaned_sessions = []
        for s in sessions_data:
            eval_data = s.get("evaluation") or {}
            eval_json = eval_data.get("evaluation") or {}
            
            answers = []
            for ans in s.get("answers") or []:
                answers.append({
                    "question": ans.get("question_text") or "",
                    "transcript": ans.get("transcript") or "",
                })
            
            cleaned_sessions.append({
                "session_id": s.get("id"),
                "candidate_name": s.get("candidate_name") or f"Session #{s.get('id')}",
                "overall_score": eval_data.get("overall_score"),
                "communication_score": eval_data.get("communication_score"),
                "technical_score": eval_data.get("technical_score"),
                "jd_alignment_score": eval_data.get("jd_alignment_score"),
                "strengths": eval_json.get("strengths") or [],
                "weaknesses": eval_json.get("weaknesses") or [],
                "answers": answers
            })

        user_prompt = json.dumps({
            "job_title": job_title,
            "jd": jd_text[:2000],
            "sessions": cleaned_sessions
        }, ensure_ascii=False)

        return await self._chat_json(system_prompt, user_prompt)



class GeminiInterviewAiProvider(InterviewAiProvider):
    provider_name = "gemini"

    def __init__(self) -> None:
        self.api_key = configuration.GEMINI_API_KEY
        self.chat_model = configuration.GEMINI_CHAT_MODEL

    async def _chat_json(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        import httpx
        import json
        import asyncio
        
        models_to_try = [self.chat_model]
        for fallback in ["gemini-2.5-flash", "gemini-3.1-flash-lite", "gemini-2.0-flash-lite"]:
            if fallback != self.chat_model:
                models_to_try.append(fallback)
                
        last_exception = None
        for model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}"
            max_retries = 3
            backoff = 1.5
            
            for attempt in range(max_retries):
                try:
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
                                    "temperature": 0.2
                                }
                            }
                        )
                    
                    if response.status_code in (429, 500, 502, 503, 504):
                        if attempt < max_retries - 1:
                            sleep_time = backoff ** attempt
                            log.warning("Gemini API _chat_json model=%s returned status %s. Retrying in %ss... (Attempt %s/%s)", model, response.status_code, sleep_time, attempt + 1, max_retries)
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
                        log.warning("Gemini API _chat_json model=%s request failed: %s. Retrying in %ss... (Attempt %s/%s)", model, str(exc), sleep_time, attempt + 1, max_retries)
                        await asyncio.sleep(sleep_time)
                        continue
                    log.error("Gemini API model=%s failed all %s attempts: %s. Trying fallback model if available.", model, max_retries, str(exc))
                    break
                    
        if last_exception:
            raise last_exception
        raise ExceptionValueError(message="All Gemini models failed to respond.", status_code=503)



    async def generate_questions(self, context: dict[str, Any]) -> list[dict[str, str]]:
        system_prompt = (
            "Bạn là một Trưởng nhóm Kỹ thuật (Technical Lead) kiêm chuyên gia Phỏng vấn Chuyên nghiệp. "
            "Nhiệm vụ của bạn là tạo ra một bộ câu hỏi phỏng vấn ĐƯỢC CÁ NHÂN HÓA SÂU SẮC dành riêng cho ứng viên, "
            "dựa trên hồ sơ của họ (CV) và mô tả công việc (JD). "
            "YÊU CẦU QUAN TRỌNG:\n"
            "1. KHÔNG được hỏi các câu hỏi chung chung mang tính lý thuyết sáo rỗng (ví dụ: 'Hãy giới thiệu bản thân', 'Kỹ năng giao tiếp là gì...').\n"
            "2. Bạn PHẢI đọc thật kỹ CV để trích xuất các thông tin cụ thể: tên các dự án thực tế ứng viên đã làm, vai trò cụ thể, các công nghệ/thư viện đã sử dụng, và các thành tích/thách thức họ ghi trong CV.\n"
            "3. Thiết kế câu hỏi phỏng vấn thực tế: Mỗi câu hỏi phải đề cập trực tiếp đến một dự án hoặc kinh nghiệm cụ thể trong CV của ứng viên và đối chiếu với yêu cầu công việc trong JD. Ví dụ: 'Trong CV bạn đề cập đã sử dụng công nghệ [X] vào dự án [Tên Dự án] để giải quyết [Vấn đề], hãy phân tích...', hoặc 'JD yêu cầu kỹ năng [Y], trong CV bạn có ghi đã làm việc với nó ở công ty [Z] thế nào...'\n"
            "4. Các câu hỏi viết bằng Tiếng Việt chuẩn xác, tự nhiên, chuyên nghiệp và có chiều sâu kỹ thuật.\n"
            "Bạn PHẢI trả về dữ liệu định dạng JSON có cấu trúc chính xác như sau:\n"
            "{\n"
            "  \"questions\": [\n"
            "    {\n"
            "      \"question_text\": \"Nội dung câu hỏi cá nhân hóa chi tiết...\",\n"
            "      \"category\": \"overview hoặc technical hoặc behavioral hoặc skill_gap hoặc readiness\",\n"
            "      \"expected_signal\": \"Tín hiệu hoặc từ khóa chuyên môn cốt lõi mong đợi nghe từ câu trả lời của ứng viên...\"\n"
            "    }\n"
            "  ]\n"
            "}"
        )
        payload = await self._chat_json(
            system_prompt,
            json.dumps(
                {
                    "job_title": context.get("job_title"),
                    "cv": _compact_text(context.get("cv_text", "")),
                    "jd": _compact_text(context.get("jd_text", "")),
                    "analysis_report": context.get("analysis_report", {}),
                    "max_questions": configuration.INTERVIEW_MAX_QUESTIONS,
                },
                ensure_ascii=False,
            ),
        )
        questions = payload.get("questions") or []
        return [
            {
                "question_text": str(item.get("question_text") or item.get("question") or "").strip(),
                "category": str(item.get("category") or "general").strip(),
                "expected_signal": str(item.get("expected_signal") or "").strip(),
            }
            for item in questions
            if str(item.get("question_text") or item.get("question") or "").strip()
        ][: max(1, int(configuration.INTERVIEW_MAX_QUESTIONS or 6))]

    async def transcribe(self, media: bytes, file_name: str, content_type: str) -> str:
        import base64
        import httpx
        import asyncio
        audio_b64 = base64.b64encode(media).decode("utf-8")
        
        mime = content_type or "audio/webm"
        if "audio/" not in mime and "video/" not in mime:
            mime = "audio/webm"
            
        user_prompt = (
            "Hãy chuyển giọng nói trong đoạn ghi âm này thành transcript tiếng Việt chính xác. "
            "Bối cảnh là câu trả lời phỏng vấn tuyển dụng. Giữ nguyên thuật ngữ tiếng Anh, tên công nghệ, "
            "framework, thư viện, tên riêng và số liệu. Không tóm tắt, không nhận xét, không thêm nội dung. "
            "Nếu đoạn ghi âm không có lời nói rõ ràng, chỉ trả về chuỗi rỗng."
        )
        
        models_to_try = [self.chat_model]
        for fallback in ["gemini-2.5-flash", "gemini-3.1-flash-lite", "gemini-2.0-flash-lite"]:
            if fallback != self.chat_model:
                models_to_try.append(fallback)
                
        last_exception = None
        for model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}"
            max_retries = 3
            backoff = 1.5
            
            for attempt in range(max_retries):
                try:
                    async with httpx.AsyncClient(timeout=120) as client:
                        response = await client.post(
                            url,
                            headers={"Content-Type": "application/json"},
                            json={
                                "contents": [{
                                    "parts": [
                                        {
                                            "inlineData": {
                                                "mimeType": mime,
                                                "data": audio_b64
                                            }
                                        },
                                        {
                                            "text": user_prompt
                                        }
                                    ]
                                }],
                                "generationConfig": {
                                    "temperature": 0.0
                                }
                            }
                        )
                    
                    if response.status_code in (429, 500, 502, 503, 504):
                        if attempt < max_retries - 1:
                            sleep_time = backoff ** attempt
                            log.warning("Gemini API transcribe model=%s returned status %s. Retrying in %ss... (Attempt %s/%s)", model, response.status_code, sleep_time, attempt + 1, max_retries)
                            await asyncio.sleep(sleep_time)
                            continue
                    
                    response.raise_for_status()
                    res_data = response.json()
                    transcript = res_data["candidates"][0]["content"]["parts"][0]["text"]
                    return _normalize_transcript(transcript)
                except (httpx.HTTPStatusError, httpx.RequestError) as exc:
                    last_exception = exc
                    if attempt < max_retries - 1:
                        sleep_time = backoff ** attempt
                        log.warning("Gemini API transcribe model=%s request failed: %s. Retrying in %ss... (Attempt %s/%s)", model, str(exc), sleep_time, attempt + 1, max_retries)
                        await asyncio.sleep(sleep_time)
                        continue
                    log.error("Gemini API transcribe model=%s failed all %s attempts: %s. Trying fallback model if available.", model, max_retries, str(exc))
                    break
                    
        if last_exception:
            raise last_exception
        raise ExceptionValueError(message="All Gemini models failed to respond.", status_code=503)



    async def evaluate(self, context: dict[str, Any]) -> dict[str, Any]:
        system_prompt = (
            "Bạn là Hội đồng Đánh giá Nhân sự cấp cao (HR Assessment Board) kiêm Chuyên gia Huấn luyện Phỏng vấn (Interview Coach).\n"
            "Nhiệm vụ của bạn là đánh giá toàn diện câu trả lời của ứng viên cho từng câu hỏi dựa trên mô tả công việc (JD), CV của ứng viên (nếu có), và đưa ra nhận xét chi tiết.\n"
            "Hãy viết các nhận định chi tiết bằng Tiếng Việt có dấu chuẩn xác, chuyên nghiệp, khách quan, giàu thông tin và lập luận chặt chẽ.\n"
            "Bạn PHẢI trả về kết quả dưới định dạng JSON có cấu trúc chính xác như sau:\n"
            "{\n"
            "  \"overall_score\": 75.0,\n"
            "  \"communication_score\": 80.0,\n"
            "  \"technical_score\": 70.0,\n"
            "  \"jd_alignment_score\": 75.0,\n"
            "  \"strengths\": [\"Điểm mạnh 1\", \"Điểm mạnh 2\"],\n"
            "  \"weaknesses\": [\"Điểm yếu/Hạn chế 1\", \"Điểm yếu/Hạn chế 2\"],\n"
            "  \"red_flags\": [],\n"
            "  \"hiring_recommendation\": \"Đề xuất tuyển dụng chi tiết bằng tiếng Việt...\",\n"
            "  \"per_question_feedback\": [\n"
            "    {\n"
            "      \"question_id\": 1,\n"
            "      \"score\": 75.0,\n"
            "      \"summary\": \"Tóm tắt câu trả lời của ứng viên hoặc ghi nhận xét chung (ví dụ: 'Ứng viên trình bày rõ ràng về dự án X nhưng còn thiếu ý Y...'). Nếu không nghe được gì hoặc câu trả lời không có nghĩa, ghi: 'No meaningful response was detected in the recording.'.\",\n"
            "      \"details_score\": {\n"
            "        \"content_score\": 70.0,\n"
            "        \"clarity_score\": 80.0,\n"
            "        \"relevance_score\": 75.0,\n"
            "        \"confidence_score\": 75.0\n"
            "      },\n"
            "      \"strengths\": [\"Điểm mạnh 1 trong câu trả lời này...\"],\n"
            "      \"weaknesses\": [\"Cần cải thiện 1...\"],\n"
            "      \"suggested_answer\": {\n"
            "        \"answer_structure\": [\n"
            "          \"START: [Câu mở đầu ấn tượng ví dụ cho câu hỏi này]\",\n"
            "          \"1. [Bước phát triển ý 1]\",\n"
            "          \"2. [Bước phát triển ý 2]\",\n"
            "          \"3. [Bước phát triển ý 3]\",\n"
            "          \"4. [Bước phát triển ý 4 (nếu có)]\",\n"
            "          \"END: [Câu kết luận đúc rút ấn tượng]\"\n"
            "        ],\n"
            "        \"key_tips\": [\n"
            "          \"[Mẹo 1: Hướng dẫn ứng viên liên hệ kinh nghiệm cụ thể từ CV của họ (nêu rõ tên dự án, công nghệ ứng viên ghi trong CV) với yêu cầu JD]\",\n"
            "          \"[Mẹo 2: Cách nhấn mạnh kỹ năng mềm/kỹ thuật phù hợp...]\",\n"
            "          \"[Mẹo 3: Tránh lỗi thường gặp...]\"\n"
            "        ]\n"
            "      }\n"
            "    }\n"
            "  ]\n"
            "}"
        )
        payload = await self._chat_json(
            system_prompt,
            json.dumps(
                {
                    "job_title": context.get("job_title"),
                    "jd": _compact_text(context.get("jd_text", "")),
                    "cv": _compact_text(context.get("cv_text", "")),
                    "answers": context.get("answers", []),
                },
                ensure_ascii=False,
            ),
        )
        for key in ["overall_score", "communication_score", "technical_score", "jd_alignment_score"]:
            payload[key] = float(payload.get(key) or 0)
        return payload

    async def compare_sessions(self, job_title: str, jd_text: str, sessions_data: list[dict[str, Any]]) -> dict[str, Any]:
        system_prompt = (
            "Bạn là một chuyên gia Tuyển dụng Cấp cao (Senior Recruiter) kiêm Chuyên gia Phân tích Nhân sự AI.\n"
            "Nhiệm vụ của bạn là so sánh và đối chiếu kết quả phỏng vấn của các ứng viên (hoặc các phiên phỏng vấn khác nhau) cho vị trí công việc (Job Title và JD).\n"
            "Hãy viết các nhận định chi tiết bằng Tiếng Việt có dấu chuẩn xác, chuyên nghiệp, khách quan, giàu thông tin và lập luận chặt chẽ.\n"
            "Bạn PHẢI trả về kết quả dưới định dạng JSON có cấu trúc chính xác như sau:\n"
            "{\n"
            "  \"comparison_summary\": \"Tóm tắt so sánh tổng quan giữa các phiên phỏng vấn (1-2 đoạn văn dài, chỉ ra sự tương đồng và khác biệt cốt lõi).\",\n"
            "  \"candidates\": [\n"
            "    {\n"
            "      \"session_id\": 1,\n"
            "      \"name\": \"Tên ứng viên hoặc Mã phiên\",\n"
            "      \"overall_score\": 85.0,\n"
            "      \"communication_score\": 80.0,\n"
            "      \"technical_score\": 90.0,\n"
            "      \"jd_alignment_score\": 85.0,\n"
            "      \"strengths\": [\"Điểm mạnh 1\", \"Điểm mạnh 2\"],\n"
            "      \"weaknesses\": [\"Điểm cần cải thiện 1\", \"Điểm cần cải thiện 2\"],\n"
            "      \"jd_fit_analysis\": \"Phân tích mức độ tương thích công việc cụ thể cho ứng viên này (nêu rõ sự phù hợp thâm niên/kỹ năng trong JD).\"\n"
            "    }\n"
            "  ],\n"
            "  \"comparison_matrix\": {\n"
            "    \"technical_depth\": \"So sánh chi tiết về chiều sâu kỹ thuật, mức độ hiểu biết chuyên môn, công cụ và công nghệ giữa các ứng viên.\",\n"
            "    \"communication\": \"So sánh về kỹ năng diễn đạt, sự rõ ràng, mạch lạc, khả năng lập luận và sự tự tin.\",\n"
            "    \"problem_solving\": \"So sánh về tư duy giải quyết vấn đề, cách tiếp cận các tình huống thực tế được nêu trong câu hỏi.\"\n"
            "  },\n"
            "  \"final_verdict\": \"Khuyến nghị tuyển dụng cuối cùng: So sánh thứ tự ưu tiên các ứng viên, lý do tại sao và đề xuất hành động tiếp theo cho HR.\"\n"
            "}"
        )

        cleaned_sessions = []
        for s in sessions_data:
            eval_data = s.get("evaluation") or {}
            eval_json = eval_data.get("evaluation") or {}
            
            answers = []
            for ans in s.get("answers") or []:
                answers.append({
                    "question": ans.get("question_text") or "",
                    "transcript": ans.get("transcript") or "",
                })
            
            cleaned_sessions.append({
                "session_id": s.get("id"),
                "candidate_name": s.get("candidate_name") or f"Session #{s.get('id')}",
                "overall_score": eval_data.get("overall_score"),
                "communication_score": eval_data.get("communication_score"),
                "technical_score": eval_data.get("technical_score"),
                "jd_alignment_score": eval_data.get("jd_alignment_score"),
                "strengths": eval_json.get("strengths") or [],
                "weaknesses": eval_json.get("weaknesses") or [],
                "answers": answers
            })

        user_prompt = json.dumps({
            "job_title": job_title,
            "jd": jd_text[:2000],
            "sessions": cleaned_sessions
        }, ensure_ascii=False)

        return await self._chat_json(system_prompt, user_prompt)



class ResilientInterviewAiProvider(InterviewAiProvider):
    def __init__(self) -> None:
        self.mock = MockInterviewAiProvider()
        self.openai = OpenAIInterviewAiProvider() if configuration.OPENAI_API_KEY else None
        self.gemini = GeminiInterviewAiProvider() if configuration.GEMINI_API_KEY else None
        
        if self.openai:
            self.provider_name = "openai"
        elif self.gemini:
            self.provider_name = "gemini"
        else:
            self.provider_name = "mock"

    async def generate_questions(self, context: dict[str, Any]) -> list[dict[str, str]]:
        if self.openai:
            try:
                questions = await self.openai.generate_questions(context)
                if questions:
                    return questions
            except Exception as exc:
                log.error("openai_question_generation_failed error=%s", str(exc))
        if self.gemini:
            try:
                questions = await self.gemini.generate_questions(context)
                if questions:
                    return questions
            except Exception as exc:
                log.error("gemini_question_generation_failed error=%s", str(exc))
        return await self.mock.generate_questions(context)

    async def transcribe(self, media: bytes, file_name: str, content_type: str) -> str:
        if self.openai:
            try:
                transcript = await self.openai.transcribe(media, file_name, content_type)
                if transcript:
                    return _normalize_transcript(transcript)
            except Exception as exc:
                log.error("openai_transcription_failed error=%s", str(exc))

        # Try Local Faster-Whisper Service
        if getattr(configuration, "LOCAL_WHISPER_URL", None):
            try:
                log.info(f"Attempting local Whisper transcription via {configuration.LOCAL_WHISPER_URL}...")
                async with httpx.AsyncClient(timeout=120) as client:
                    response = await client.post(
                        configuration.LOCAL_WHISPER_URL,
                        data={"language": "vi"},
                        files={"file": (file_name, media, content_type or "application/octet-stream")},
                    )
                    if response.status_code == 200:
                        res_data = response.json()
                        if isinstance(res_data, dict) and "text" in res_data:
                            transcript = _normalize_transcript(res_data["text"])
                            if transcript:
                                log.info("Local Whisper transcription successful.")
                                return transcript
                            log.warning("Local Whisper returned empty transcript.")
                        elif isinstance(res_data, dict) and "error" in res_data:
                            log.error("Local Whisper service returned error: %s", res_data["error"])
                    else:
                        log.error("Local Whisper service HTTP error: %s", response.status_code)
            except Exception as exc:
                log.error("local_whisper_transcription_failed error=%s", str(exc))

        if self.gemini:
            try:
                transcript = await self.gemini.transcribe(media, file_name, content_type)
                if transcript:
                    return _normalize_transcript(transcript)
            except Exception as exc:
                log.error("gemini_transcription_failed error=%s", str(exc))
        
        # If any provider was configured but failed, or if no provider is configured,
        # fallback to mock so the application is resilient during testing and demo.
        return await self.mock.transcribe(media, file_name, content_type)

    async def evaluate(self, context: dict[str, Any]) -> dict[str, Any]:
        if self.openai:
            try:
                return await self.openai.evaluate(context)
            except Exception as exc:
                log.error("openai_interview_evaluation_failed error=%s", str(exc))
        if self.gemini:
            try:
                return await self.gemini.evaluate(context)
            except Exception as exc:
                log.error("gemini_interview_evaluation_failed error=%s", str(exc))
        return await self.mock.evaluate(context)

    async def compare_sessions(self, job_title: str, jd_text: str, sessions_data: list[dict[str, Any]]) -> dict[str, Any]:
        if self.openai:
            try:
                return await self.openai.compare_sessions(job_title, jd_text, sessions_data)
            except Exception as exc:
                log.error("openai_interview_comparison_failed error=%s", str(exc))
        if self.gemini:
            try:
                return await self.gemini.compare_sessions(job_title, jd_text, sessions_data)
            except Exception as exc:
                log.error("gemini_interview_comparison_failed error=%s", str(exc))
        return await self.mock.compare_sessions(job_title, jd_text, sessions_data)
