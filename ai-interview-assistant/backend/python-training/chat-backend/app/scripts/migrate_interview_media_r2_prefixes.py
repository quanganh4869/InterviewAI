"""Copy flat R2 interview media keys into session-type folders.

Old key:
    interviews/{session_id}/{file}

New key:
    interviews/{official|practice}/{session_id}/{file}

The script updates DB keys only after copy succeeds and does not delete old objects.
"""

import argparse
import asyncio
from pathlib import PurePosixPath
from pathlib import Path
import sys

APP_ROOT = Path(__file__).resolve().parents[1]
if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))

import aiobotocore.session

from configuration.settings import configuration
from db.db_connection import Database
from db.models.interview import InterviewAnswer, InterviewSession
from services.file_storage_service import R2FileStorageService
from sqlalchemy import select


def target_key_for(source_key: str | None, session_id: int, session_type: str | None) -> str | None:
    if not source_key:
        return None
    key = str(source_key).strip().replace("\\", "/").lstrip("/")
    parts = key.split("/")
    if len(parts) < 3 or parts[0] != "interviews":
        return None
    if parts[1] in {"official", "practice"}:
        return None
    if parts[1] != str(session_id):
        return None

    normalized_type = "practice" if session_type == "practice" else "official"
    file_name = PurePosixPath(key).name
    return f"interviews/{normalized_type}/{session_id}/{file_name}"


async def copy_r2_object(client, bucket: str, source_key: str, target_key: str) -> None:
    await client.copy_object(
        Bucket=bucket,
        Key=target_key,
        CopySource={"Bucket": bucket, "Key": source_key},
    )


async def migrate(apply: bool) -> int:
    if configuration.STORAGE_STRATEGY != "r2":
        raise RuntimeError("Set STORAGE_STRATEGY=r2 before running this migration.")

    storage = R2FileStorageService()
    storage._ensure_configured()
    session = aiobotocore.session.get_session()
    eligible_files = 0
    migrated_files = 0
    migrated_answers = 0
    failed_answers = 0

    async with Database.get_instance_db() as db_session:
        result = await db_session.execute(
            select(InterviewAnswer, InterviewSession.session_type)
            .join(InterviewSession, InterviewAnswer.session_id == InterviewSession.id)
            .order_by(InterviewAnswer.id.asc())
        )
        rows = list(result.all())

        async with session.create_client(
            "s3",
            region_name=storage.region_name,
            endpoint_url=storage.endpoint_url or None,
            aws_access_key_id=storage.access_key or None,
            aws_secret_access_key=storage.secret_key or None,
        ) as client:
            for answer, session_type in rows:
                updates: dict[str, str] = {}
                for field_name in ("audio_storage_key", "video_storage_key"):
                    source_key = getattr(answer, field_name)
                    target_key = target_key_for(source_key, answer.session_id, session_type)
                    if not target_key:
                        continue
                    eligible_files += 1

                    if not apply:
                        print(f"would copy answer={answer.id} field={field_name} {source_key} -> {target_key}")
                        continue

                    try:
                        await copy_r2_object(client, storage.bucket_name, source_key, target_key)
                        updates[field_name] = target_key
                    except Exception as exc:
                        failed_answers += 1
                        print(f"failed answer={answer.id} field={field_name}: {exc}")
                        updates = {}
                        break

                if not updates:
                    continue

                for field_name, target_key in updates.items():
                    setattr(answer, field_name, target_key)
                await db_session.commit()
                migrated_answers += 1
                migrated_files += len(updates)
                print(f"migrated answer={answer.id} files={len(updates)}")

    mode = "applied" if apply else "dry-run"
    print(
        f"Prefix migration {mode}: eligible_files={eligible_files}, "
        f"answers={migrated_answers}, files={migrated_files}, failed_answers={failed_answers}",
    )
    return failed_answers


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Copy objects and update database storage keys.")
    args = parser.parse_args()
    failures = asyncio.run(migrate(apply=args.apply))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
