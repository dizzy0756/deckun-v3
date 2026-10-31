from datetime import UTC, datetime, timedelta
from uuid import UUID

import bcrypt
from jose import jwt

from app.core.config import settings


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _build_token(
    subject: str,
    token_type: str,
    expires_delta: timedelta | None = None,
    **extra: object,
) -> str:
    to_encode = {"sub": subject, "type": token_type, **extra}
    now = datetime.now(UTC)
    expire = now + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "iat": now})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_customer_token(
    user_id: UUID, *, expires_delta: timedelta | None = None
) -> str:
    return _build_token(
        str(user_id),
        "customer",
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_admin_token(
    admin_id: UUID, *, expires_delta: timedelta | None = None
) -> str:
    return _build_token(
        str(admin_id),
        "admin",
        expires_delta or timedelta(minutes=settings.ADMIN_TOKEN_EXPIRE_MINUTES),
    )


def decode_token(token: str) -> dict[str, object]:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
