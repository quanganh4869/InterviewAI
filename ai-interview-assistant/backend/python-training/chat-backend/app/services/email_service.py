import asyncio
import smtplib
from email.header import Header
from email.message import EmailMessage
from email.utils import formataddr
from http import HTTPStatus

from configuration.logger.config import log
from configuration.settings import configuration
from core.exception_handler.custom_exception import ExceptionValueError
from schemas.requests.hr_email_schema import HrSendCandidateEmailRequest
from schemas.responses.hr_email_schema import HrSendCandidateEmailResponse


class EmailService:
    def __init__(self):
        self.settings = configuration

    async def send_candidate_email(
        self,
        payload: HrSendCandidateEmailRequest,
        sender_user_id: int,
        reply_to_email: str | None = None,
        reply_to_name: str | None = None,
    ) -> HrSendCandidateEmailResponse:
        self._validate_configuration()
        message = self._build_message(
            payload=payload,
            reply_to_email=reply_to_email,
            reply_to_name=reply_to_name,
        )

        try:
            await asyncio.to_thread(self._send_message, message)
        except Exception as exc:
            log.error(
                "Failed to send candidate email by user %s to %s: %s",
                sender_user_id,
                payload.to_email,
                exc,
            )
            raise ExceptionValueError(
                message="Email provider rejected the request or is unavailable.",
                message_code="EMAIL_SEND_FAILED",
                status_code=HTTPStatus.SERVICE_UNAVAILABLE.value,
            ) from exc

        log.info(
            "Candidate email sent by user %s to %s for candidate %s",
            sender_user_id,
            payload.to_email,
            payload.candidate_id or "unknown",
        )
        return HrSendCandidateEmailResponse(
            recipient=payload.to_email,
            subject=payload.subject,
            delivered=True,
        )

    def _validate_configuration(self):
        missing = []
        if not self.settings.SMTP_HOST:
            missing.append("SMTP_HOST")
        if not self.settings.SMTP_FROM_EMAIL:
            missing.append("SMTP_FROM_EMAIL")
        if not self.settings.SMTP_USERNAME:
            missing.append("SMTP_USERNAME")
        if not self.settings.SMTP_PASSWORD:
            missing.append("SMTP_PASSWORD")

        if missing:
            raise ExceptionValueError(
                message=(
                    "Email delivery is not configured. Missing: "
                    + ", ".join(missing)
                ),
                message_code="EMAIL_NOT_CONFIGURED",
                status_code=HTTPStatus.SERVICE_UNAVAILABLE.value,
            )

    def _build_message(
        self,
        payload: HrSendCandidateEmailRequest,
        reply_to_email: str | None = None,
        reply_to_name: str | None = None,
    ) -> EmailMessage:
        message = EmailMessage()
        from_name = self.settings.SMTP_FROM_NAME.strip()
        from_email = self.settings.SMTP_FROM_EMAIL.strip()
        message["From"] = self._format_address(from_name, from_email)
        message["To"] = self._format_address(payload.to_name, str(payload.to_email))
        message["Subject"] = payload.subject.strip()
        if reply_to_email:
            message["Reply-To"] = self._format_address(
                reply_to_name or reply_to_email,
                reply_to_email,
            )
        message.set_content(payload.body.strip())
        return message

    def _send_message(self, message: EmailMessage):
        timeout = self.settings.SMTP_TIMEOUT_SECONDS
        if self.settings.SMTP_USE_SSL:
            with smtplib.SMTP_SSL(
                self.settings.SMTP_HOST,
                self.settings.SMTP_PORT,
                timeout=timeout,
            ) as smtp:
                self._login_and_send(smtp, message)
            return

        with smtplib.SMTP(
            self.settings.SMTP_HOST,
            self.settings.SMTP_PORT,
            timeout=timeout,
        ) as smtp:
            if self.settings.SMTP_USE_TLS:
                smtp.starttls()
            self._login_and_send(smtp, message)

    def _login_and_send(self, smtp: smtplib.SMTP, message: EmailMessage):
        smtp.login(self.settings.SMTP_USERNAME, self.settings.SMTP_PASSWORD)
        smtp.send_message(message)

    @staticmethod
    def _format_address(name: str, email: str) -> str:
        clean_name = str(name or "").strip()
        if not clean_name:
            return email
        return formataddr((str(Header(clean_name, "utf-8")), email))
