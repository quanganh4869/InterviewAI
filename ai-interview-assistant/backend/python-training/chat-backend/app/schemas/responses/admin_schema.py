from datetime import datetime

from configuration.settings import configuration
from core.common.aes_gcm import AesGCMRotation
from core.constants import FIXED_ADMIN_EMAILS
from core.enums.user_enum import UserRole
from pydantic import BaseModel, ConfigDict, model_validator

aes_gcm = AesGCMRotation(configuration=configuration)


class AdminUserSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str | None = None
    avatar_url: str | None = None
    role: UserRole | None = UserRole.USER
    plan_id: int | None = None
    plan_name: str | None = None
    created_at: datetime | None = None
    is_fixed_admin: bool = False
    additional_practice_slots: int = 0
    practice_slots_base: int | None = None
    practice_slots_total: int | None = None
    practice_slots_used_today: int = 0
    practice_slots_remaining_today: int | None = None

    @model_validator(mode="before")
    @classmethod
    def decrypt_sensitive_fields(cls, data: object) -> object:
        if isinstance(data, dict):
            prepared_data = dict(data)
            encrypted_email = prepared_data.get(
                "email_encrypted", prepared_data.get("email")
            )
            encrypted_name = prepared_data.get(
                "name_encrypted", prepared_data.get("name")
            )
            plan = prepared_data.get("plan")
        else:
            plan = getattr(data, "plan", None)
            prepared_data = {
                "id": getattr(data, "id", None),
                "avatar_url": getattr(data, "avatar_url", None),
                "role": getattr(data, "role", UserRole.USER),
                "plan_id": getattr(data, "plan_id", None),
                "created_at": getattr(data, "created_at", None),
                "additional_practice_slots": getattr(data, "additional_practice_slots", 0),
            }
            encrypted_email = getattr(data, "email_encrypted", None)
            encrypted_name = getattr(data, "name_encrypted", None)


        email = aes_gcm.decrypt_data(encrypted_email) if encrypted_email else ""
        prepared_data["email"] = email
        prepared_data["name"] = (
            aes_gcm.decrypt_data(encrypted_name) if encrypted_name else None
        )
        plan_name = getattr(plan, "name", None) if plan is not None else None
        prepared_data["plan_name"] = getattr(plan_name, "value", plan_name)
        fixed_admin_emails = {item.strip().lower() for item in FIXED_ADMIN_EMAILS}
        prepared_data["is_fixed_admin"] = email.strip().lower() in fixed_admin_emails
        return prepared_data


class AdminUsersPageSchema(BaseModel):
    items: list[AdminUserSchema]
    total: int
    page: int
    page_size: int


class AdminDocumentSchema(BaseModel):
    id: int
    owner_user_id: int
    owner_email: str
    owner_name: str | None = None
    document_type: str
    file_name: str
    mime_type: str | None = None
    size_bytes: int | None = None
    created_at: datetime
    metadata_json: dict = {}

    @model_validator(mode="before")
    @classmethod
    def decrypt_owner_fields(cls, data: object) -> object:
        if isinstance(data, dict):
            prepared_data = dict(data)
            enc_email = prepared_data.get("owner_email_encrypted")
            enc_name = prepared_data.get("owner_name_encrypted")
            prepared_data["owner_email"] = aes_gcm.decrypt_data(enc_email) if enc_email else (prepared_data.get("owner_email") or "")
            prepared_data["owner_name"] = aes_gcm.decrypt_data(enc_name) if enc_name else prepared_data.get("owner_name")
            return prepared_data
        return data


class AdminDocumentsPageSchema(BaseModel):
    items: list[AdminDocumentSchema]
    total: int
    page: int
    page_size: int


class AdminInterviewSchema(BaseModel):
    id: int
    candidate_user_id: int
    candidate_email: str
    candidate_name: str | None = None
    session_type: str
    status: str
    created_at: datetime
    overall_score: float | None = None
    job_posting_title: str | None = None
    cv_document_name: str | None = None

    @model_validator(mode="before")
    @classmethod
    def decrypt_candidate_fields(cls, data: object) -> object:
        if isinstance(data, dict):
            prepared_data = dict(data)
            enc_email = prepared_data.get("candidate_email_encrypted")
            enc_name = prepared_data.get("candidate_name_encrypted")
            prepared_data["candidate_email"] = aes_gcm.decrypt_data(enc_email) if enc_email else (prepared_data.get("candidate_email") or "")
            prepared_data["candidate_name"] = aes_gcm.decrypt_data(enc_name) if enc_name else prepared_data.get("candidate_name")
            return prepared_data
        return data


class AdminInterviewsPageSchema(BaseModel):
    items: list[AdminInterviewSchema]
    total: int
    page: int
    page_size: int


class AdminMatchSchema(BaseModel):
    id: int
    analyst_user_id: int
    analyst_email: str
    analyst_name: str | None = None
    cv_document_id: int | None = None
    cv_file_name_snapshot: str | None = None
    overall_score: float
    created_at: datetime
    job_posting_title: str | None = None

    @model_validator(mode="before")
    @classmethod
    def decrypt_analyst_fields(cls, data: object) -> object:
        if isinstance(data, dict):
            prepared_data = dict(data)
            enc_email = prepared_data.get("analyst_email_encrypted")
            enc_name = prepared_data.get("analyst_name_encrypted")
            prepared_data["analyst_email"] = aes_gcm.decrypt_data(enc_email) if enc_email else (prepared_data.get("analyst_email") or "")
            prepared_data["analyst_name"] = aes_gcm.decrypt_data(enc_name) if enc_name else prepared_data.get("analyst_name")
            return prepared_data
        return data


class AdminMatchesPageSchema(BaseModel):
    items: list[AdminMatchSchema]
    total: int
    page: int
    page_size: int


class AdminUserDetailDocumentSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_type: str
    file_name: str
    mime_type: str | None = None
    size_bytes: int | None = None
    created_at: datetime


class AdminUserDetailSessionSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_type: str
    status: str
    created_at: datetime
    overall_score: float | None = None
    job_posting_title: str | None = None


class AdminUserDetailSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str | None = None
    avatar_url: str | None = None
    role: UserRole | None = UserRole.USER
    plan_id: int | None = None
    plan_name: str | None = None
    created_at: datetime | None = None
    additional_practice_slots: int = 0
    practice_slots_base: int | None = None
    practice_slots_total: int | None = None
    practice_slots_used_today: int = 0
    practice_slots_remaining_today: int | None = None
    is_fixed_admin: bool = False
    documents: list[AdminUserDetailDocumentSchema] = []
    interviews: list[AdminUserDetailSessionSchema] = []

    @model_validator(mode="before")
    @classmethod
    def decrypt_user_fields(cls, data: object) -> object:
        if isinstance(data, dict):
            prepared_data = dict(data)
            encrypted_email = prepared_data.get("email_encrypted", prepared_data.get("email"))
            encrypted_name = prepared_data.get("name_encrypted", prepared_data.get("name"))
            plan = prepared_data.get("plan")
        else:
            plan = getattr(data, "plan", None)
            prepared_data = {
                "id": getattr(data, "id", None),
                "avatar_url": getattr(data, "avatar_url", None),
                "role": getattr(data, "role", UserRole.USER),
                "plan_id": getattr(data, "plan_id", None),
                "created_at": getattr(data, "created_at", None),
                "additional_practice_slots": getattr(data, "additional_practice_slots", 0),
            }
            encrypted_email = getattr(data, "email_encrypted", None)
            encrypted_name = getattr(data, "name_encrypted", None)

        prepared_data["email"] = aes_gcm.decrypt_data(encrypted_email) if encrypted_email else ""
        prepared_data["name"] = aes_gcm.decrypt_data(encrypted_name) if encrypted_name else None
        plan_name = getattr(plan, "name", None) if plan is not None else None
        prepared_data["plan_name"] = getattr(plan_name, "value", plan_name)
        fixed_admin_emails = {item.strip().lower() for item in FIXED_ADMIN_EMAILS}
        prepared_data["is_fixed_admin"] = prepared_data["email"].strip().lower() in fixed_admin_emails
        return prepared_data
