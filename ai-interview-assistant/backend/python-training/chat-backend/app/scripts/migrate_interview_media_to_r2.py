"""Copy local interview recordings to Cloudflare R2 without deleting the originals.

Run inside the backend container:
    python scripts/migrate_interview_media_to_r2.py --apply
"""

import argparse
import asyncio
from pathlib import Path
import sys

APP_ROOT = Path(__file__).resolve().parents[1]
if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))

from fastapi import UploadFile
from starlette.datastructures import Headers

from configuration.settings import configuration
from db.db_connection import Database
from db.models.interview import InterviewAnswer, InterviewSession
from services.file_storage_service import R2FileStorageService
from sqlalchemy import select


def get_local_path(storage_key: str | None, upload_root: Path, session_id: int) -> Path | None:
    if not storage_key:
        return None

    path = Path(storage_key)
    candidate = path.resolve() if path.is_absolute() else (Path.cwd() / path).resolve()
    if candidate.is_relative_to(upload_root) and candidate.is_file():
        return candidate

    file_name = Path(str(storage_key).replace("\\", "/")).name
    original_name = file_name.split("_", 1)[1] if "_" in file_name else file_name
    backup_candidate = upload_root / "interviews" / str(session_id) / original_name
    if backup_candidate.is_file():
        return backup_candidate
    return None


async def upload_local_file(
    storage: R2FileStorageService,
    local_path: Path,
    session_id: int,
    session_type: str,
    mime_type: str | None,
) -> str:
    with local_path.open("rb") as source:
        upload = UploadFile(
            filename=local_path.name,
            file=source,
            headers=Headers({"content-type": mime_type or "application/octet-stream"}),
        )
        normalized_type = "practice" if session_type == "practice" else "official"
        return await storage.save_file(upload, sub_dir=f"interviews/{normalized_type}/{session_id}")


async def migrate(apply: bool) -> int:
    if configuration.STORAGE_STRATEGY != "r2":
        raise RuntimeError("Set STORAGE_STRATEGY=r2 before running this migration.")

    upload_root = Path(configuration.UPLOAD_DIR).resolve()
    storage = R2FileStorageService()
    migrated_answers = 0
    migrated_files = 0
    eligible_files = 0
    skipped_files = 0
    failed_answers = 0

    async with Database.get_instance_db() as db_session:
        result = await db_session.execute(
            select(InterviewAnswer, InterviewSession.session_type)
            .join(InterviewSession, InterviewAnswer.session_id == InterviewSession.id)
            .order_by(InterviewAnswer.id.asc()),
        )
        rows = list(result.all())

        for answer, session_type in rows:
            updates: dict[str, str] = {}
            for field_name in ("audio_storage_key", "video_storage_key"):
                local_path = get_local_path(getattr(answer, field_name), upload_root, answer.session_id)
                if local_path is None:
                    skipped_files += 1
                    continue

                eligible_files += 1

                if not apply:
                    print(f"would migrate answer={answer.id} field={field_name} path={local_path}")
                    continue

                try:
                    updates[field_name] = await upload_local_file(
                        storage=storage,
                        local_path=local_path,
                        session_id=answer.session_id,
                        session_type=session_type,
                        mime_type=answer.mime_type,
                    )
                except Exception as exc:
                    failed_answers += 1
                    print(f"failed answer={answer.id} field={field_name}: {exc}")
                    updates = {}
                    break

            if not updates:
                continue

            for field_name, storage_key in updates.items():
                setattr(answer, field_name, storage_key)
            await db_session.commit()
            migrated_answers += 1
            migrated_files += len(updates)
            print(f"migrated answer={answer.id} files={len(updates)}")

    mode = "applied" if apply else "dry-run"
    print(
        f"Migration {mode}: eligible_files={eligible_files}, answers={migrated_answers}, files={migrated_files}, "
        f"skipped={skipped_files}, failed_answers={failed_answers}",
    )
    return failed_answers


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Upload files and update database storage keys.")
    args = parser.parse_args()
    failures = asyncio.run(migrate(apply=args.apply))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
