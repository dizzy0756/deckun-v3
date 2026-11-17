from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: str
    type: str
    exp: int | None = None
    iat: int | None = None


class UserBase(BaseModel):
    mobile_number: str
    full_name: str
    email: str | None = None

    @field_validator("mobile_number")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) < 10 or len(v) > 15:
            raise ValueError("Invalid mobile number")
        return v


class UserRegister(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserLogin(BaseModel):
    mobile_number: str
    password: str

    @field_validator("mobile_number")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) < 10 or len(v) > 15:
            raise ValueError("Invalid mobile number")
        return v


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    mobile_number: str | None = None
    full_name: str
    email: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    password: str | None = None


class AdminLogin(BaseModel):
    email: EmailStr
    password: str


class PasswordResetRequest(BaseModel):
    mobile_number: str | None = None
    email: str | None = None

    @field_validator("mobile_number")
    @classmethod
    def validate_mobile(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if not v.isdigit() or len(v) < 10 or len(v) > 15:
                raise ValueError("Invalid mobile number")
        return v


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class AddressBase(BaseModel):
    label: str
    full_name: str
    address_line1: str
    address_line2: str | None = None
    city: str
    state: str
    pincode: str
    landmark: str | None = None
    phone_number: str
    is_default: bool = False


class AddressCreate(AddressBase):
    pass


class AddressRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    label: str
    full_name: str
    address_line1: str
    address_line2: str | None = None
    city: str
    state: str
    pincode: str
    landmark: str | None = None
    phone_number: str
    is_default: bool
    created_at: datetime


class AddressUpdate(BaseModel):
    label: str | None = None
    full_name: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    landmark: str | None = None
    phone_number: str | None = None
    is_default: bool | None = None
