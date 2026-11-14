"""Outbound customer messaging (SMS / WhatsApp).

Provider-agnostic: pick one with MESSAGING_PROVIDER and supply its credentials.
Defaults to "noop", which only logs, so the app works without any provider.

Every send is best-effort: failures are logged and never break checkout or an
order status change.
"""

import logging

import requests

from app.core.config import settings

logger = logging.getLogger(__name__)

# Customer-facing copy per order status.
STATUS_MESSAGES: dict[str, str] = {
    "placed": "We received your Deckun order {number}. We'll confirm it shortly.",
    "confirmed": "Your Deckun order {number} is confirmed. We'll notify you when it ships.",
    "preparing": "Your Deckun order {number} is being packed.",
    "out_for_delivery": "Your Deckun order {number} is out for delivery and should arrive today.",
    "delivered": "Your Deckun order {number} has been delivered. Thank you for shopping with Deckun!",
    "cancelled": "Your Deckun order {number} has been cancelled.",
}


def normalize_phone(mobile: str) -> str:
    """Return an E.164-style number using the configured country code."""
    digits = "".join(ch for ch in (mobile or "") if ch.isdigit())
    cc = settings.MESSAGING_COUNTRY_CODE.strip()
    if digits.startswith(cc) and len(digits) > 10:
        return digits
    if len(digits) == 10 and cc:
        return f"{cc}{digits}"
    return digits


def _send_whatsapp(to: str, body: str) -> bool:
    if not settings.WHATSAPP_API_TOKEN or not settings.WHATSAPP_PHONE_NUMBER_ID:
        logger.warning("WhatsApp not configured; skipping message to %s", to)
        return False

    url = (
        f"https://graph.facebook.com/v20.0/"
        f"{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
    )
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_API_TOKEN}",
        "Content-Type": "application/json",
    }

    if settings.WHATSAPP_TEMPLATE_NAME:
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "template",
            "template": {
                "name": settings.WHATSAPP_TEMPLATE_NAME,
                "language": {"code": "en"},
                "components": [
                    {
                        "type": "body",
                        "parameters": [{"type": "text", "text": body}],
                    }
                ],
            },
        }
    else:
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": body},
        }

    resp = requests.post(
        url, headers=headers, json=payload, timeout=settings.MESSAGING_TIMEOUT_SECONDS
    )
    if resp.status_code >= 400:
        logger.error("WhatsApp send failed (%s): %s", resp.status_code, resp.text[:300])
        return False
    return True


def _send_msg91(to: str, body: str) -> bool:
    if not (settings.MSG91_AUTH_KEY and settings.MSG91_TEMPLATE_ID):
        logger.warning("MSG91 not configured; skipping message to %s", to)
        return False

    url = "https://control.msg91.com/api/v5/flow/"
    headers = {"authkey": settings.MSG91_AUTH_KEY, "Content-Type": "application/json"}
    payload = {
        "template_id": settings.MSG91_TEMPLATE_ID,
        "short_url": "0",
        "recipients": [{"mobiles": to, "message": body}],
    }
    if settings.MSG91_SENDER_ID:
        payload["sender"] = settings.MSG91_SENDER_ID

    resp = requests.post(url, headers=headers, json=payload, timeout=settings.MESSAGING_TIMEOUT_SECONDS)
    if resp.status_code >= 400:
        logger.error("MSG91 send failed (%s): %s", resp.status_code, resp.text[:300])
        return False
    return True


def _send_twilio(to: str, body: str) -> bool:
    if not (
        settings.TWILIO_ACCOUNT_SID
        and settings.TWILIO_AUTH_TOKEN
        and settings.TWILIO_FROM_NUMBER
    ):
        logger.warning("Twilio not configured; skipping message to %s", to)
        return False

    url = (
        f"https://api.twilio.com/2010-04-01/Accounts/"
        f"{settings.TWILIO_ACCOUNT_SID}/Messages.json"
    )
    data = {
        "To": f"+{to}",
        "From": settings.TWILIO_FROM_NUMBER,
        "Body": body,
    }
    resp = requests.post(
        url,
        data=data,
        auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
        timeout=settings.MESSAGING_TIMEOUT_SECONDS,
    )
    if resp.status_code >= 400:
        logger.error("Twilio send failed (%s): %s", resp.status_code, resp.text[:300])
        return False
    return True


def send_message(mobile: str, body: str) -> bool:
    """Send one message. Returns True only when the provider accepted it."""
    to = normalize_phone(mobile)
    if not to:
        logger.warning("No usable phone number for message")
        return False

    provider = (settings.MESSAGING_PROVIDER or "noop").lower()

    try:
        if provider == "whatsapp":
            return _send_whatsapp(to, body)
        if provider == "msg91":
            return _send_msg91(to, body)
        if provider == "twilio":
            return _send_twilio(to, body)

        # noop: log so developers can see what would have been sent
        logger.info("[messaging:noop] to=%s body=%s", to, body)
        return False
    except Exception as exc:  # never let messaging break a business action
        logger.error("Messaging error for %s: %s", to, exc)
        return False


def notify_order_status(mobile: str, order_number: str, status: str) -> bool:
    """Send the customer the message for a given order status."""
    template = STATUS_MESSAGES.get(status)
    if not template:
        return False
    return send_message(mobile, template.format(number=order_number))
