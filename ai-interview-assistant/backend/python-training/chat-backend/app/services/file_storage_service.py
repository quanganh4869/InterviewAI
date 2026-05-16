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
            "Object existence check is only available for S3 strategy."
        )

    async def create_presigned_download(
        self,
        object_key: str,
        expires_seconds: int = 600,
    ) -> dict[str, Any]:
        raise NotImplementedError(
            "Presigned download is only available for S3 strategy."
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


class S3FileStorageService(FileStorageService):
    supports_presigned_download: bool = True

    def __init__(self) -> None:
        self.session = aiobotocore.session.get_session()
        self.bucket_name = configuration.AWS_BUCKET_NAME
        self.region_name = configuration.AWS_REGION
        self.access_key = configuration.AWS_ACCESS_KEY_ID
        self.secret_key = configuration.AWS_SECRET_ACCESS_KEY

    def _build_object_key(self, sub_dir: str, file_name: str) -> str:
        safe_name = _sanitize_filename(file_name)
        return f"{sub_dir}/{uuid.uuid4().hex}_{safe_name}"

    async def save_file(self, file: UploadFile, sub_dir: str) -> str:
        object_key = self._build_object_key(sub_dir=sub_dir, file_name=file.filename)
        content_type = file.content_type or "application/octet-stream"
        body = await file.read()
        await file.seek(0)

        async with self.session.create_client(
            "s3",
            region_name=self.region_name,
            aws_access_key_id=self.access_key or None,
            aws_secret_access_key=self.secret_key or None,
        ) as client:
            await client.put_object(
                Bucket=self.bucket_name,
                Key=object_key,
                Body=body,
                ContentType=content_type,
            )

        log.info(f"Uploaded object to S3: bucket={self.bucket_name}, key={object_key}")
        return object_key

    async def delete_file(self, storage_key: str) -> None:
        async with self.session.create_client(
            "s3",
            region_name=self.region_name,
            aws_access_key_id=self.access_key or None,
            aws_secret_access_key=self.secret_key or None,
        ) as client:
            await client.delete_object(Bucket=self.bucket_name, Key=storage_key)

    async def object_exists(self, object_key: str) -> bool:
        try:
            async with self.session.create_client(
                "s3",
                region_name=self.region_name,
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
        params: dict[str, Any] = {"Bucket": self.bucket_name, "Key": object_key}
        async with self.session.create_client(
            "s3",
            region_name=self.region_name,
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
    if configuration.STORAGE_STRATEGY == "s3":
        return S3FileStorageService()
    return LocalFileStorageService()
