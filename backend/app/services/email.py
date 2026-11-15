"""Outbound email (SMTP). No-op with logging when not configured."""

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


def email_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_FROM)


def send_email(to: str | None, subject: str, body: str) -> bool:
    """Send a plain-text email. Never raises; returns True on success."""
    if not to:
        logger.warning("Email skipped: no recipient for %r", subject)
        return False

    if not email_configured():
        logger.info("[email:noop] to=%s subject=%s\n%s", to, subject, body)
        return False

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.SMTP_FROM
    message["To"] = to
    message.set_content(body)

    try:
        with smtplib.SMTP(
            settings.SMTP_HOST, settings.SMTP_PORT, timeout=15
        ) as smtp:
            smtp.ehlo()
            if settings.SMTP_USE_TLS:
                smtp.starttls()
                smtp.ehlo()
            if settings.SMTP_USERNAME:
                smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            smtp.send_message(message)
        return True
    except Exception as exc:  # never surface mail errors to the caller
        logger.error("Email send failed to %s: %s", to, exc)
        return False
