"""Media storage: Cloudflare R2 when configured, local disk otherwise."""

import logging
from pathlib import Path

from app.core.config import settings
from app.core.paths import MEDIA_DIR

logger = logging.getLogger(__name__)

_client = None


def r2_configured() -> bool:
    return bool(
        settings.R2_ACCOUNT_ID
        and settings.R2_ACCESS_KEY_ID
        and settings.R2_SECRET_ACCESS_KEY
        and settings.R2_BUCKET
        and settings.R2_PUBLIC_BASE_URL
    )


def _get_client():
    global _client
    if _client is None:
        import boto3

        _client = boto3.client(
            "s3",
            endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            region_name="auto",
        )
    return _client


def save_media(
    data: bytes,
    filename: str,
    subdir: str,
    content_type: str | None,
    local_public_base: str,
) -> str:
    """Store a file and return its public URL.

    Uses R2 when configured; otherwise writes under backend/public/images and
    returns a URL built from the request base (local development).
    """
    key = f"{subdir}/{filename}"

    if r2_configured():
        _get_client().put_object(
            Bucket=settings.R2_BUCKET,
            Key=key,
            Body=data,
            ContentType=content_type or "application/octet-stream",
            CacheControl="public, max-age=31536000, immutable",
        )
        return f"{settings.R2_PUBLIC_BASE_URL.rstrip('/')}/{key}"

    target_dir = MEDIA_DIR / subdir
    target_dir.mkdir(parents=True, exist_ok=True)
    (target_dir / filename).write_bytes(data)
    return f"{local_public_base.rstrip('/')}/images/{key}"


def delete_media(url: str | None) -> None:
    """Best-effort removal of a stored object (R2 only)."""
    if not url or not r2_configured():
        return
    base = settings.R2_PUBLIC_BASE_URL.rstrip("/")
    if not url.startswith(base + "/"):
        return
    key = url[len(base) + 1 :]
    try:
        _get_client().delete_object(Bucket=settings.R2_BUCKET, Key=key)
    except Exception as exc:  # never break a request because of cleanup
        logger.warning("Failed to delete R2 object %s: %s", key, exc)
