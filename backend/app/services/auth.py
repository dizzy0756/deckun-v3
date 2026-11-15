import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_customer_token,
    get_password_hash,
    verify_password,
)
from app.models import Address, AdminUser, Cart, PasswordReset, User
from app.models.enums import OtpType
from app.services.email import send_email
from app.schemas import (
    AddressCreate,
    AddressRead,
    AddressUpdate,
    UserRead,
    UserUpdate,
)


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def register(
        self,
        mobile_number: str,
        password: str,
        full_name: str,
        email: str | None = None,
    ) -> tuple[User, str]:
        existing = self.db.scalar(
            select(User).where(User.mobile_number == mobile_number)
        )
        if existing:
            raise HTTPException(
                status_code=409, detail="Mobile number already registered"
            )
        if email:
            existing_email = self.db.scalar(select(User).where(User.email == email))
            if existing_email:
                raise HTTPException(status_code=409, detail="Email already registered")

        user = User(
            mobile_number=mobile_number,
            password_hash=get_password_hash(password),
            full_name=full_name,
            email=email,
        )
        self.db.add(user)
        self.db.flush()

        cart = Cart(user_id=user.id)
        self.db.add(cart)
        self.db.flush()

        token = create_customer_token(user.id)
        return user, token

    def authenticate(self, mobile_number: str, password: str) -> User | None:
        user = self.db.scalar(select(User).where(User.mobile_number == mobile_number))
        if not user or not user.is_active:
            return None
        if not verify_password(password, user.password_hash):
            return None
        return user

    def authenticate_admin(self, email: str, password: str) -> AdminUser | None:
        admin = self.db.scalar(select(AdminUser).where(AdminUser.email == email))
        if not admin or not admin.is_active:
            return None
        if not verify_password(password, admin.password_hash):
            return None
        return admin

    def change_admin_password(self, admin_id: UUID, current_password: str, new_password: str) -> None:
        admin = self.db.get(AdminUser, admin_id)
        if not admin:
            raise ValueError("Admin not found")
        if not verify_password(current_password, admin.password_hash):
            raise ValueError("Current password is incorrect")
        admin.password_hash = get_password_hash(new_password)
        admin.updated_at = datetime.now(UTC).replace(tzinfo=None)
        self.db.flush()

    def get_user(self, user_id: UUID) -> UserRead | None:
        user = self.db.get(User, user_id)
        if not user or not user.is_active:
            return None
        return UserRead.model_validate(user)

    def update_user(self, user_id: UUID, data: UserUpdate) -> UserRead:
        user = self.db.get(User, user_id)
        if not user or not user.is_active:
            raise HTTPException(status_code=404, detail="User not found")

        update_data = data.model_dump(exclude_unset=True)
        if update_data.get("password"):
            update_data["password_hash"] = get_password_hash(
                update_data.pop("password")
            )
        for field, value in update_data.items():
            setattr(user, field, value)
        user.updated_at = datetime.now(UTC).replace(tzinfo=None)
        self.db.flush()
        return UserRead.model_validate(user)

    def get_addresses(self, user_id: UUID) -> list[AddressRead]:
        addresses = self.db.scalars(
            select(Address)
            .where(Address.user_id == user_id)
            .order_by(Address.is_default.desc(), Address.created_at.desc())
        ).all()
        return [AddressRead.model_validate(a) for a in addresses]

    def get_address(self, user_id: UUID, addr_id: UUID) -> AddressRead | None:
        addr = self.db.scalar(
            select(Address).where(Address.id == addr_id, Address.user_id == user_id)
        )
        if not addr:
            return None
        return AddressRead.model_validate(addr)

    def create_address(self, user_id: UUID, data: AddressCreate) -> AddressRead:
        if data.is_default:
            self.db.execute(
                update(Address)
                .where(Address.user_id == user_id, Address.is_default.is_(True))
                .values(is_default=False)
            )
        addr = Address(user_id=user_id, **data.model_dump())
        self.db.add(addr)
        self.db.flush()
        return AddressRead.model_validate(addr)

    def update_address(
        self, user_id: UUID, addr_id: UUID, data: AddressUpdate
    ) -> AddressRead:
        addr = self.db.scalar(
            select(Address).where(Address.id == addr_id, Address.user_id == user_id)
        )
        if not addr:
            raise HTTPException(status_code=404, detail="Address not found")

        update_data = data.model_dump(exclude_unset=True)
        if update_data.pop("is_default", False):
            self.db.execute(
                update(Address)
                .where(Address.user_id == user_id, Address.is_default.is_(True))
                .values(is_default=False)
            )
            update_data["is_default"] = True

        for field, value in update_data.items():
            setattr(addr, field, value)
        addr.updated_at = datetime.now(UTC).replace(tzinfo=None)
        self.db.flush()
        return AddressRead.model_validate(addr)

    def set_default_address(self, user_id: UUID, addr_id: UUID) -> AddressRead:
        addr = self.db.scalar(
            select(Address).where(Address.id == addr_id, Address.user_id == user_id)
        )
        if not addr:
            raise HTTPException(status_code=404, detail="Address not found")

        self.db.execute(
            update(Address)
            .where(Address.user_id == user_id, Address.is_default.is_(True))
            .values(is_default=False)
        )
        addr.is_default = True
        self.db.flush()
        return AddressRead.model_validate(addr)

    def delete_address(self, user_id: UUID, addr_id: UUID) -> bool:
        addr = self.db.scalar(
            select(Address).where(Address.id == addr_id, Address.user_id == user_id)
        )
        if not addr:
            return False
        self.db.delete(addr)
        self.db.flush()
        return True

    def request_password_reset(self, identifier: str) -> str | None:
        user = None
        if "@" in identifier:
            user = self.db.scalar(select(User).where(User.email == identifier))
        else:
            user = self.db.scalar(select(User).where(User.mobile_number == identifier))
        if not user or not user.is_active:
            return None

        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        reset = PasswordReset(
            user_id=user.id,
            token_hash=token_hash,
            token_type=OtpType.password_reset,
            expires_at=datetime.now(UTC).replace(tzinfo=None)
            + timedelta(minutes=15),
        )
        self.db.add(reset)
        self.db.flush()

        if user.email:
            site = settings.CUSTOMER_SITE_URL.rstrip("/")
            reset_link = f"{site}/#reset?token={token}"
            send_email(
                user.email,
                "Reset your Deckun password",
                (
                    f"Hi {user.full_name},\n\n"
                    "We received a request to reset your Deckun password.\n"
                    f"Open this link to choose a new password (valid for 15 minutes):\n\n"
                    f"{reset_link}\n\n"
                    f"If the link does not work, paste this code on the reset page:\n{token}\n\n"
                    "If you did not request this, you can safely ignore this email."
                ),
            )

        return token

    def reset_password(self, token: str, new_password: str) -> bool:
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        reset = self.db.scalar(
            select(PasswordReset).where(
                PasswordReset.token_hash == token_hash,
                PasswordReset.used_at.is_(None),
            )
        )
        if not reset:
            raise HTTPException(status_code=400, detail="Invalid or expired token")
        if reset.expires_at < datetime.now(UTC).replace(tzinfo=None):
            raise HTTPException(status_code=400, detail="Invalid or expired token")

        user = self.db.get(User, reset.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        user.password_hash = get_password_hash(new_password)
        user.updated_at = datetime.now(UTC).replace(tzinfo=None)

        reset.used_at = datetime.now(UTC).replace(tzinfo=None)
        self.db.flush()
        return True
