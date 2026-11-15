"""Razorpay integration (Orders API + payment signature verification)."""

import base64
import hashlib
import hmac
import logging

import requests

from app.core.config import settings

logger = logging.getLogger(__name__)

API_ROOT = "https://api.razorpay.com/v1"


def is_configured() -> bool:
    return bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET)


def _auth_header() -> dict[str, str]:
    raw = f"{settings.RAZORPAY_KEY_ID}:{settings.RAZORPAY_KEY_SECRET}".encode()
    token = base64.b64encode(raw).decode()
    return {"Authorization": f"Basic {token}", "Content-Type": "application/json"}


def create_order(amount_rupees: float, receipt: str) -> dict | None:
    """Create a Razorpay order for the given rupee amount."""
    if not is_configured():
        logger.warning("Razorpay not configured; cannot create payment order")
        return None

    payload = {
        "amount": int(round(float(amount_rupees) * 100)),  # paise
        "currency": "INR",
        "receipt": receipt,
        "payment_capture": 1,
    }
    try:
        resp = requests.post(
            f"{API_ROOT}/orders", json=payload, headers=_auth_header(), timeout=15
        )
    except Exception as exc:
        logger.error("Razorpay order request failed: %s", exc)
        return None

    if resp.status_code >= 400:
        logger.error("Razorpay order rejected (%s): %s", resp.status_code, resp.text[:300])
        return None
    return resp.json()


def verify_signature(
    razorpay_order_id: str, razorpay_payment_id: str, signature: str
) -> bool:
    """Verify the checkout signature returned by Razorpay."""
    if not is_configured():
        return False
    message = f"{razorpay_order_id}|{razorpay_payment_id}".encode()
    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(), message, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature or "")
