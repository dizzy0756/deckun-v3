from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.models import AdminUser, User
from app.schemas import TokenPayload

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        token_data = TokenPayload(**payload)
    except (JWTError, ValidationError):
        raise credentials_exception
    if token_data.type != "customer":
        raise credentials_exception
    user = db.get(User, UUID(token_data.sub))
    if not user or not user.is_active:
        raise credentials_exception
    return user


def get_current_admin(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> AdminUser:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        token_data = TokenPayload(**payload)
    except (JWTError, ValidationError):
        raise credentials_exception
    if token_data.type != "admin":
        raise credentials_exception
    admin = db.get(AdminUser, UUID(token_data.sub))
    if not admin or not admin.is_active:
        raise credentials_exception
    return admin
