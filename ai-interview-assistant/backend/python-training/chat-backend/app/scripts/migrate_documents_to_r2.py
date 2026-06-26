"""Copy local CV/JD documents to Cloudflare R2 without deleting local files.

Run inside the backend app environment:
    python scripts/migrate_documents_to_r2.py
    python scripts/migrate_documents_to_r2.py --apply
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
from core.enums.document_enum import DocumentType
from db.db_connection import Database
from db.models.document import Document
from services.file_storage_service import R2FileStorageService
from sqlalchemy import select


def normalize_prefix(prefix: str) -> str:
    normalized = str(prefix or "").strip().strip("/")
    return normalized or "documents"


def resolve_document_prefix(document_type: str) -> str:
    if document_type == DocumentType.CV.value:
        return normalize_prefix(configuration.DOCUMENT_CV_PREFIX)
    return normalize_prefix(configuration.DOCUMENT_JD_PREFIX)


def get_local_path(storage_key: str | None, upload_root: Path) -> Path | None:
    if not storage_key:
        return None

    raw_path = Path(storage_key)
    candidates: list[Path] = []
    if raw_path.is_absolute():
        candidates.append(raw_path)
    else:
        candidates.append((Path.cwd() / raw_path).resolve())
        candidates.append((upload_root / raw_path).resolve())

    seen: set[str] = set()
    for candidate in candidates:
        try:
            resolved = candidate.resolve()
        except OSError:
            continue

        resolved_key = str(resolved)
        if resolved_key in seen:
            continue
        seen.add(resolved_key)

        if resolved.is_relative_to(upload_root) and resolved.is_file():
            return resolved

    return None


async def upload_local_document(
    storage: R2FileStorageService,
    document: Document,
    local_path: Path,
) -> str:
    with local_path.open("rb") as source:
        upload = UploadFile(
            filename=document.file_name or local_path.name,
            file=source,
            headers=Headers(
                {"content-type": document.mime_type or "application/octet-stream"}
            ),
        )
        return await storage.save_file(
            upload,
            sub_dir=resolve_document_prefix(document.document_type),
        )


async def migrate(apply: bool) -> int:
    if configuration.STORAGE_STRATEGY != "r2":
        raise RuntimeError("Set STORAGE_STRATEGY=r2 before running this migration.")

    upload_root = Path(configuration.UPLOAD_DIR).resolve()
    storage = R2FileStorageService()

    migrated = 0
    eligible = 0
    existing_r2 = 0
    missing_local = 0
    failed = 0

    async with Database.get_instance_db() as db_session:
        result = await db_session.execute(
            select(Document)
            .where(Document.deleted_at.is_(None))
            .order_by(Document.id.asc())
        )
        documents = list(result.scalars().all())

        for document in documents:
            try:
                if await storage.object_exists(document.storage_key):
                    existing_r2 += 1
                    continue
            except Exception:
                pass

            local_path = get_local_path(document.storage_key, upload_root)
            if not local_path:
                missing_local += 1
                print(
                    f"missing document={document.id} storage_key={document.storage_key}"
                )
                continue

            eligible += 1
            if not apply:
                print(f"would migrate document={document.id} path={local_path}")
                continue

            try:
                document.storage_key = await upload_local_document(
                    storage=storage,
                    document=document,
                    local_path=local_path,
                )
                await db_session.commit()
                migrated += 1
                print(f"migrated document={document.id} key={document.storage_key}")
            except Exception as exc:
                failed += 1
                await db_session.rollback()
                print(f"failed document={document.id}: {exc}")

    mode = "applied" if apply else "dry-run"
    print(
        f"Migration {mode}: eligible={eligible}, migrated={migrated}, "
        f"existing_r2={existing_r2}, missing_local={missing_local}, failed={failed}",
    )
    return failed


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Upload local documents and update database storage keys.",
    )
    args = parser.parse_args()
    failures = asyncio.run(migrate(apply=args.apply))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
