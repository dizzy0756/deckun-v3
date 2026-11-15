"""Helpers for building absolute media URLs behind proxies or CDNs."""

from fastapi import Request

from app.core.config import settings


def media_base_url(request: Request) -> str:
    """Public base URL for uploaded media.

    Set PUBLIC_BASE_URL (e.g. https://api.deckun.in) in production so links
    stay correct behind a reverse proxy or when using object storage.
    """
    if settings.PUBLIC_BASE_URL:
        return settings.PUBLIC_BASE_URL.rstrip("/")
    return str(request.base_url).rstrip("/")
