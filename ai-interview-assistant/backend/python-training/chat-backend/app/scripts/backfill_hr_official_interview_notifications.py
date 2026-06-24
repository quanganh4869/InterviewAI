"""Backfill HR notifications for finished official interview videos.

Run inside the backend container:
    python scripts/backfill_hr_official_interview_notifications.py --apply
"""

import argparse
import asyncio
from pathlib import Path
import sys

APP_ROOT = Path(__file__).resolve().parents[1]
if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))

from db.db_connection import Database
from db.models.interview import InterviewAnswer, InterviewSession
from db.models.job_posting import JobPosting
from db.models.notification import Notification
from services.notification_service import NotificationService
from sqlalchemy import func, select


NOTIFICATION_TYPE = "official_interview_video_ready"


async def backfill(apply: bool) -> int:
    created = 0
    skipped_existing = 0
    skipped_without_video = 0

    async with Database.get_instance_db() as session:
        rows = (
            await session.execute(
                select(InterviewSession, JobPosting)
                .join(JobPosting, InterviewSession.job_posting_id == JobPosting.id)
                .where(
                    InterviewSession.session_type == "official",
                    InterviewSession.job_posting_id.is_not(None),
                    InterviewSession.deleted_at.is_(None),
                    JobPosting.deleted_at.is_(None),
                )
                .order_by(InterviewSession.id.asc())
            )
        ).all()

        notification_service = NotificationService(session)

        for interview_session, posting in rows:
            video_count = int(
                (
                    await session.execute(
                        select(func.count(InterviewAnswer.id)).where(
                            InterviewAnswer.session_id == interview_session.id,
                            InterviewAnswer.video_storage_key.is_not(None),
                            InterviewAnswer.deleted_at.is_(None),
                        )
                    )
                ).scalar_one()
                or 0
            )
            if video_count <= 0:
                skipped_without_video += 1
                continue

            existing = (
                await session.execute(
                    select(Notification.id).where(
                        Notification.recipient_user_id == posting.hr_user_id,
                        Notification.type == NOTIFICATION_TYPE,
                        Notification.deleted_at.is_(None),
                        Notification.metadata_json.contains({"session_id": interview_session.id}),
                    )
                )
            ).scalar_one_or_none()
            if existing is not None:
                skipped_existing += 1
                continue

            created += 1
            if apply:
                await notification_service.create_notification(
                    recipient_user_id=posting.hr_user_id,
                    actor_user_id=interview_session.candidate_user_id,
                    type_=NOTIFICATION_TYPE,
                    title="Có video phỏng vấn chính thức mới",
                    body=f"Ứng viên đã hoàn tất phỏng vấn chính thức cho JD {posting.title}.",
                    link_url=f"/phong-van/{interview_session.id}/chi-tiet",
                    metadata={
                        "session_id": interview_session.id,
                        "job_posting_id": posting.id,
                        "job_title": posting.title,
                        "video_count": video_count,
                    },
                    dedupe_session_id=interview_session.id,
                )

        if apply:
            await session.commit()

    mode = "applied" if apply else "dry-run"
    print(
        f"Backfill {mode}: created={created}, "
        f"skipped_existing={skipped_existing}, skipped_without_video={skipped_without_video}"
    )
    return created


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Create notifications. Without this flag, only reports.")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    asyncio.run(backfill(apply=args.apply))
