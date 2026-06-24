from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from .base.central_declarative_base import Base
from .base.datetime_mixin import DateTimeMixin


class Notification(Base, DateTimeMixin):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    recipient_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    actor_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    type = Column(String(80), nullable=False)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=True)
    link_url = Column(String(512), nullable=True)
    is_read = Column(Boolean, nullable=False, default=False)
    metadata_json = Column(JSONB, nullable=False, default=dict)

    recipient = relationship("User", foreign_keys=[recipient_user_id])
    actor = relationship("User", foreign_keys=[actor_user_id])
