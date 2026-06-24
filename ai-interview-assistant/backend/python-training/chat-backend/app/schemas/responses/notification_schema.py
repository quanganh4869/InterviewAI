from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class NotificationResponse(BaseModel):
    id: int
    recipient_user_id: int
    actor_user_id: int | None = None
    type: str
    title: str
    body: str | None = None
    link_url: str | None = None
    is_read: bool
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime | None = None


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    total: int
    unread_count: int
