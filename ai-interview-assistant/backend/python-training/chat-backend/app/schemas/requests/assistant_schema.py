from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str
    content: str


class AssistantChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1)
