from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator


class PincodeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pincode: str
    city: str
    state: str
    is_active: bool
    created_at: datetime


class PincodeCreate(BaseModel):
    pincode: str
    city: str
    state: str
    is_active: bool = True

    @field_validator("pincode")
    @classmethod
    def validate_pincode(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) < 4 or len(v) > 10:
            raise ValueError("Invalid pincode")
        return v


class PincodeUpdate(BaseModel):
    pincode: str | None = None
    city: str | None = None
    state: str | None = None
    is_active: bool | None = None


class WebsiteContentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content_key: str
    content_type: str
    text_value: str | None = None
    image_url: str | None = None
    is_active: bool
    updated_at: datetime | None = None


class WebsiteContentUpdate(BaseModel):
    text_value: str | None = None
    image_url: str | None = None
    is_active: bool | None = None
    content_type: str | None = None


class WebsiteContentCreate(BaseModel):
    content_key: str
    content_type: str = "text"
    text_value: str | None = None
    image_url: str | None = None
    is_active: bool = True

    @field_validator("content_key")
    @classmethod
    def validate_key(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("content_key is required")
        if len(v) > 100:
            raise ValueError("content_key must be 100 characters or fewer")
        return v

    @field_validator("content_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in ("text", "image"):
            raise ValueError("content_type must be 'text' or 'image'")
        return v


class SettingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    setting_key: str
    setting_value: str
    data_type: str
    description: str | None = None
    updated_at: datetime | None = None


class SettingUpdate(BaseModel):
    setting_value: str

    @field_validator("setting_value")
    @classmethod
    def validate_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Setting value cannot be empty")
        return v


class InventoryMovementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    variant_id: UUID | None = None
    product_id: UUID | None = None
    order_id: UUID | None = None
    quantity_change: int
    reason: str
    running_balance: int
    created_at: datetime
