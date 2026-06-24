from typing import Any

from db.models.notification import Notification
from db.models.users import User
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession


class NotificationService:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def create_notification(
        self,
        *,
        recipient_user_id: int,
        type_: str,
        title: str,
        body: str | None = None,
        link_url: str | None = None,
        actor_user_id: int | None = None,
        metadata: dict[str, Any] | None = None,
        dedupe_session_id: int | None = None,
    ) -> Notification:
        if dedupe_session_id is not None:
            existing = await self._find_existing_for_session(
                recipient_user_id=recipient_user_id,
                type_=type_,
                session_id=dedupe_session_id,
            )
            if existing:
                return existing

        notification = Notification(
            recipient_user_id=recipient_user_id,
            actor_user_id=actor_user_id,
            type=type_,
            title=title,
            body=body,
            link_url=link_url,
            metadata_json=metadata or {},
        )
        self.db_session.add(notification)
        await self.db_session.flush()
        return notification

    async def list_for_user(
        self,
        *,
        user: User,
        unread_only: bool = False,
        limit: int = 20,
    ) -> dict[str, Any]:
        limit = min(max(int(limit or 20), 1), 100)
        query = (
            select(Notification)
            .where(Notification.recipient_user_id == user.id, Notification.deleted_at.is_(None))
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
        if unread_only:
            query = query.where(Notification.is_read.is_(False))

        items = list((await self.db_session.execute(query)).scalars().all())
        total_query = select(func.count(Notification.id)).where(
            Notification.recipient_user_id == user.id,
            Notification.deleted_at.is_(None),
        )
        unread_query = total_query.where(Notification.is_read.is_(False))

        total = int((await self.db_session.execute(total_query)).scalar_one() or 0)
        unread_count = int((await self.db_session.execute(unread_query)).scalar_one() or 0)
        return {
            "items": [self.serialize(item) for item in items],
            "total": total,
            "unread_count": unread_count,
        }

    async def mark_read(self, *, user: User, notification_id: int) -> dict[str, Any] | None:
        query = select(Notification).where(
            Notification.id == notification_id,
            Notification.recipient_user_id == user.id,
            Notification.deleted_at.is_(None),
        )
        notification = (await self.db_session.execute(query)).scalar_one_or_none()
        if notification is None:
            return None

        notification.is_read = True
        self.db_session.add(notification)
        await self.db_session.commit()
        await self.db_session.refresh(notification)
        return self.serialize(notification)

    async def mark_all_read(self, *, user: User) -> None:
        query = select(Notification).where(
            Notification.recipient_user_id == user.id,
            Notification.is_read.is_(False),
            Notification.deleted_at.is_(None),
        )
        notifications = list((await self.db_session.execute(query)).scalars().all())
        for notification in notifications:
            notification.is_read = True
            self.db_session.add(notification)
        await self.db_session.commit()

    async def _find_existing_for_session(
        self,
        *,
        recipient_user_id: int,
        type_: str,
        session_id: int,
    ) -> Notification | None:
        query = select(Notification).where(
            Notification.recipient_user_id == recipient_user_id,
            Notification.type == type_,
            Notification.deleted_at.is_(None),
            Notification.metadata_json.contains({"session_id": session_id}),
        )
        return (await self.db_session.execute(query)).scalar_one_or_none()

    @staticmethod
    def serialize(notification: Notification) -> dict[str, Any]:
        return {
            "id": notification.id,
            "recipient_user_id": notification.recipient_user_id,
            "actor_user_id": notification.actor_user_id,
            "type": notification.type,
            "title": notification.title,
            "body": notification.body,
            "link_url": notification.link_url,
            "is_read": notification.is_read,
            "metadata": notification.metadata_json or {},
            "created_at": notification.created_at,
            "updated_at": notification.updated_at,
        }
