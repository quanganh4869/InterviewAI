import httpx
from configuration.settings import configuration
from configuration.logger.config import log


class AssistantService:
    def __init__(self):
        self.gemini_key = configuration.GEMINI_API_KEY
        self.gemini_model = configuration.GEMINI_CHAT_MODEL or "gemini-3.1-flash-lite"
        self.openai_key = configuration.OPENAI_API_KEY
        self.openai_model = configuration.OPENAI_CHAT_MODEL or "gpt-4o-mini"

    async def get_response(self, user_name: str, messages: list[dict[str, str]]) -> str:
        system_prompt = self._build_system_prompt(user_name)

        if self.gemini_key:
            try:
                return await self._call_gemini(system_prompt, messages)
            except Exception as e:
                log.error("Chatbot assistant Gemini call failed: %s. Trying OpenAI fallback...", str(e))

        if self.openai_key:
            try:
                return await self._call_openai(system_prompt, messages)
            except Exception as e:
                log.error("Chatbot assistant OpenAI call failed: %s. Falling back to mock...", str(e))

        return self._get_mock_response(messages)

    def _build_system_prompt(self, user_name: str) -> str:
        return f"""Bạn là Trợ lý AI (AIIA Assistant) chuyên nghiệp và thân thiện của hệ thống AI Interview Assistant (AIIA).
Nhiệm vụ của bạn là hỗ trợ người dùng giải đáp các thắc mắc về hệ thống AIIA, hướng dẫn sử dụng các tính năng (luyện tập phỏng vấn, phân tích CV/JD, so sánh ứng viên, đánh giá kết quả), chia sẻ các mẹo phỏng vấn, tư vấn viết CV/JD, và định hướng phát triển sự nghiệp liên quan đến tuyển dụng.

RÀNG BUỘC PHẠM VI TRẢ LỜI CỰC KỲ NGHIÊM NGẶT:
- Bạn CHỈ ĐƯỢC PHÉP trả lời các câu hỏi liên quan đến dự án AI Interview Assistant (AIIA), cách sử dụng hệ thống, tuyển dụng, kỹ năng phỏng vấn, tư vấn viết hồ sơ (CV/JD), chuẩn bị chuyên môn cho phỏng vấn và phát triển nghề nghiệp liên quan.
- TUYỆT ĐỐI KHÔNG trả lời các câu hỏi ngoài luồng không liên quan đến dự án hoặc tuyển dụng (ví dụ: làm thơ, viết truyện, làm toán, giải bài tập lập trình không liên quan đến phỏng vấn, công thức nấu ăn, thời tiết, tin tức xã hội, v.v.).
- Nếu người dùng đặt câu hỏi ngoài phạm vi được phép, bạn hãy lịch sự từ chối bằng Tiếng Việt và nhắc nhở họ rằng bạn chỉ có thể hỗ trợ các chủ đề liên quan đến hệ thống AIIA, kỹ năng viết CV/JD và phỏng vấn xin việc.

CÁ NHÂN HÓA:
- Chào đón người dùng bằng tên của họ: {user_name} (hãy xưng hô lịch sự, thân thiện).
- Trả lời bằng Tiếng Việt, sử dụng định dạng Markdown rõ ràng, ngắn gọn, có cấu trúc (sử dụng bullet points khi cần thiết).
"""

    async def _call_gemini(self, system_prompt: str, messages: list[dict[str, str]]) -> str:
        contents = []
        for msg in messages:
            role = msg.get("role")
            if role == "assistant":
                role = "model"
            contents.append({
                "role": role,
                "parts": [{"text": msg.get("content") or ""}]
            })

        models_to_try = [self.gemini_model]
        for fallback in ["gemini-2.5-flash", "gemini-3.1-flash-lite", "gemini-2.0-flash-lite"]:
            if fallback != self.gemini_model:
                models_to_try.append(fallback)

        last_exception = None
        for model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.gemini_key}"
            try:
                async with httpx.AsyncClient(timeout=45) as client:
                    response = await client.post(
                        url,
                        headers={"Content-Type": "application/json"},
                        json={
                            "systemInstruction": {
                                "parts": [{"text": system_prompt}]
                            },
                            "contents": contents,
                            "generationConfig": {
                                "temperature": 0.5
                            }
                        }
                    )
                response.raise_for_status()
                res_data = response.json()
                return res_data["candidates"][0]["content"]["parts"][0]["text"]
            except Exception as e:
                log.warning("Gemini model %s failed: %s. Trying next...", model, str(e))
                last_exception = e
                continue
        if last_exception:
            raise last_exception
        raise Exception("All Gemini models failed to respond.")

    async def _call_openai(self, system_prompt: str, messages: list[dict[str, str]]) -> str:
        openai_messages = [{"role": "system", "content": system_prompt}]
        for msg in messages:
            openai_messages.append({
                "role": msg.get("role"),
                "content": msg.get("content")
            })

        url = "https://api.openai.com/v1/chat/completions"
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {self.openai_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.openai_model,
                    "messages": openai_messages,
                    "temperature": 0.5
                }
            )
        response.raise_for_status()
        res_data = response.json()
        return res_data["choices"][0]["message"]["content"]

    def _get_mock_response(self, messages: list[dict[str, str]]) -> str:
        last_user_msg = ""
        for m in reversed(messages):
            if m.get("role") == "user":
                last_user_msg = (m.get("content") or "").lower()
                break

        if "chào" in last_user_msg or "hello" in last_user_msg:
            return "Xin chào! Tôi là Trợ lý AI AIIA (chạy ở chế độ Demo). Hệ thống hiện chưa được kết nối với API Key thật. Tôi có thể giúp gì cho bạn về các chủ đề phỏng vấn thử?"
        if "cv" in last_user_msg or "jd" in last_user_msg:
            return "Trong hệ thống AIIA, bạn có thể tải CV lên và nhập JD để AI phân tích độ tương thích, chỉ ra điểm mạnh/yếu và gợi ý câu hỏi phỏng vấn phù hợp."
        if "luyện tập" in last_user_msg or "phỏng vấn" in last_user_msg:
            return "Để luyện tập phỏng vấn, vui lòng truy cập mục **Luyện tập mới** hoặc **Phỏng vấn mới**, thiết lập vị trí ứng tuyển và bắt đầu ghi âm trả lời các câu hỏi của AI."

        return "Cảm ơn bạn đã đặt câu hỏi. Hiện tại trợ lý AI đang chạy ở chế độ Offline/Demo do thiếu API Key Gemini/OpenAI. Vui lòng cấu hình các biến môi trường để trò chuyện đầy đủ với AI!"
