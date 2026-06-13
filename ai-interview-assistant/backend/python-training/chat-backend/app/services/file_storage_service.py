import os
import shutil
import uuid
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any

import aiobotocore.session
from botocore.exceptions import ClientError
from configuration.logger.config import log
from configuration.settings import configuration
from core.exception_handler.custom_exception import ExceptionValueError
from fastapi import UploadFile


def _sanitize_filename(file_name: str) -> str:
    safe_name = os.path.basename(file_name or "")
    safe_name = safe_name.replace("\\", "_").replace("/", "_")
    return safe_name or "file.bin"


class FileStorageService(ABC):
    supports_presigned_download: bool = False

    @abstractmethod
    async def save_file(self, file: UploadFile, sub_dir: str) -> str:
        pass

    async def delete_file(self, storage_key: str) -> None:
        raise NotImplementedError("Delete file is not implemented for this strategy.")

    async def object_exists(self, object_key: str) -> bool:
        raise NotImplementedError(
            "Object existence check is only available for R2 strategy."
        )

    async def create_presigned_download(
        self,
        object_key: str,
        expires_seconds: int = 600,
    ) -> dict[str, Any]:
        raise NotImplementedError(
            "Presigned download is only available for R2 strategy."
        )


class LocalFileStorageService(FileStorageService):
    async def save_file(self, file: UploadFile, sub_dir: str) -> str:
        upload_path = Path(configuration.UPLOAD_DIR) / sub_dir
        upload_path.mkdir(parents=True, exist_ok=True)

        safe_name = _sanitize_filename(file.filename)
        file_path = upload_path / f"{uuid.uuid4().hex}_{safe_name}"
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        return str(file_path)

    async def delete_file(self, storage_key: str) -> None:
        file_path = Path(storage_key)
        if file_path.exists():
            file_path.unlink()


class R2FileStorageService(FileStorageService):
    supports_presigned_download: bool = True

    def __init__(self) -> None:
        self.session = aiobotocore.session.get_session()
        self.bucket_name = configuration.CLOUDFLARE_R2_BUCKET_NAME
        self.region_name = configuration.CLOUDFLARE_R2_REGION
        self.endpoint_url = configuration.CLOUDFLARE_R2_ENDPOINT
        self.access_key = configuration.CLOUDFLARE_R2_ACCESS_KEY_ID
        self.secret_key = configuration.CLOUDFLARE_R2_SECRET_ACCESS_KEY

    def _ensure_configured(self) -> None:
        missing_fields = [
            field_name
            for field_name, value in {
                "CLOUDFLARE_R2_ACCESS_KEY_ID": self.access_key,
                "CLOUDFLARE_R2_SECRET_ACCESS_KEY": self.secret_key,
                "CLOUDFLARE_R2_ENDPOINT": self.endpoint_url,
                "CLOUDFLARE_R2_BUCKET_NAME": self.bucket_name,
            }.items()
            if not str(value or "").strip()
        ]
        if missing_fields:
            raise ExceptionValueError(
                message=(
                    "Cloudflare R2 storage is not configured. "
                    "Set required R2 credentials or use STORAGE_STRATEGY=local. "
                    f"Missing: {', '.join(missing_fields)}."
                ),
                status_code=503,
            )

    def _build_object_key(self, sub_dir: str, file_name: str) -> str:
        safe_name = _sanitize_filename(file_name)
        return f"{sub_dir}/{uuid.uuid4().hex}_{safe_name}"

    async def save_file(self, file: UploadFile, sub_dir: str) -> str:
        self._ensure_configured()
        object_key = self._build_object_key(sub_dir=sub_dir, file_name=file.filename)
        content_type = file.content_type or "application/octet-stream"
        body = await file.read()
        await file.seek(0)

        async with self.session.create_client(
            "s3",
            region_name=self.region_name,
            endpoint_url=self.endpoint_url or None,
            aws_access_key_id=self.access_key or None,
            aws_secret_access_key=self.secret_key or None,
        ) as client:
            await client.put_object(
                Bucket=self.bucket_name,
                Key=object_key,
                Body=body,
                ContentType=content_type,
            )

        log.info(f"Uploaded object to R2: bucket={self.bucket_name}, key={object_key}")
        return object_key

    async def delete_file(self, storage_key: str) -> None:
        self._ensure_configured()
        async with self.session.create_client(
            "s3",
            region_name=self.region_name,
            endpoint_url=self.endpoint_url or None,
            aws_access_key_id=self.access_key or None,
            aws_secret_access_key=self.secret_key or None,
        ) as client:
            await client.delete_object(Bucket=self.bucket_name, Key=storage_key)

    async def object_exists(self, object_key: str) -> bool:
        self._ensure_configured()
        try:
            async with self.session.create_client(
                "s3",
                region_name=self.region_name,
                endpoint_url=self.endpoint_url or None,
                aws_access_key_id=self.access_key or None,
                aws_secret_access_key=self.secret_key or None,
            ) as client:
                await client.head_object(Bucket=self.bucket_name, Key=object_key)
            return True
        except ClientError as exc:
            error_code = str(exc.response.get("Error", {}).get("Code", ""))
            if error_code in {"404", "NoSuchKey", "NotFound"}:
                return False
            raise

    async def create_presigned_download(
        self,
        object_key: str,
        expires_seconds: int = 600,
    ) -> dict[str, Any]:
        self._ensure_configured()
        params: dict[str, Any] = {"Bucket": self.bucket_name, "Key": object_key}
        async with self.session.create_client(
            "s3",
            region_name=self.region_name,
            endpoint_url=self.endpoint_url or None,
            aws_access_key_id=self.access_key or None,
            aws_secret_access_key=self.secret_key or None,
        ) as client:
            download_url = await client.generate_presigned_url(
                ClientMethod="get_object",
                Params=params,
                ExpiresIn=expires_seconds,
            )

        return {
            "download_url": download_url,
            "expires_in": expires_seconds,
        }


def get_storage_service() -> FileStorageService:
    if configuration.STORAGE_STRATEGY == "r2":
        return R2FileStorageService()
    return LocalFileStorageService()
