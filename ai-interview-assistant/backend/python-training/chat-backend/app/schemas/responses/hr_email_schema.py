from pydantic import BaseModel, EmailStr


class HrSendCandidateEmailResponse(BaseModel):
    recipient: EmailStr
    subject: str
    delivered: bool = True
