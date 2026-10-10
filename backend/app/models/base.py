from datetime import datetime, timezone
from uuid import UUID, uuid4  # noqa: F401

from sqlalchemy import DateTime, Enum, ForeignKey, String, text  # noqa: F401
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column  # noqa: F401


class Base(DeclarativeBase):
    pass


def utcnow() -> datetime:
    """Naive UTC datetime (compatible with SQLite DATETIME and PostgreSQL TIMESTAMP)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)
