"""Verification of Google Sign-In ID tokens."""

import logging

from fastapi import HTTPException
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from app.core.config import settings

logger = logging.getLogger(__name__)


def is_configured() -> bool:
    return bool(settings.GOOGLE_CLIENT_ID)


def verify_credential(credential: str) -> dict:
    """Validate a Google ID token and return its claims."""
    if not is_configured():
        raise HTTPException(status_code=503, detail="Google sign-in is not configured")

    try:
        claims = google_id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except Exception as exc:
        logger.warning("Google token verification failed: %s", exc)
        raise HTTPException(
            status_code=401, detail="Invalid Google credential"
        ) from exc

    if not claims.get("email"):
        raise HTTPException(status_code=400, detail="Google account has no email")

    if claims.get("email_verified") is False:
        raise HTTPException(status_code=400, detail="Google email is not verified")

    return claims
