from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.enums import NotificationType, ReviewStatus


class ReviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    user_full_name: str
    product_id: UUID
    product_name: str
    order_item_id: UUID
    rating: int
    title: str | None = None
    comment: str
    status: ReviewStatus
    created_at: datetime
    updated_at: datetime | None = None


class ReviewCreate(BaseModel):
    product_id: UUID
    order_item_id: UUID
    rating: int
    title: str | None = None
    comment: str

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: int) -> int:
        if not 1 <= v <= 5:
            raise ValueError("Rating must be between 1 and 5")
        return v


class ReviewStatusChange(BaseModel):
    status: ReviewStatus


class PromotionProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_id: UUID


class PromotionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str | None = None
    name: str
    description: str | None = None
    discount_type: str
    discount_value: float
    starts_at: datetime
    ends_at: datetime
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None
    product_ids: list[UUID] = []


class PromotionCreate(BaseModel):
    code: str | None = None
    name: str
    description: str | None = None
    discount_type: str
    discount_value: float
    starts_at: datetime
    ends_at: datetime
    is_active: bool = False
    product_ids: list[UUID] = []

    @field_validator("discount_type")
    @classmethod
    def validate_discount_type(cls, v: str) -> str:
        if v not in ("percent", "fixed"):
            raise ValueError("discount_type must be 'percent' or 'fixed'")
        return v


class PromotionUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    description: str | None = None
    discount_type: str | None = None
    discount_value: float | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    is_active: bool | None = None
    product_ids: list[UUID] | None = None


class PromotionValidateRequest(BaseModel):
    code: str
    subtotal: int = 0

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Promotion code is required")
        return v.upper()


class PromotionValidateResult(BaseModel):
    valid: bool
    code: str
    name: str | None = None
    discount_type: str | None = None
    discount_value: float | None = None
    discount_amount: int = 0
    message: str = ""


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    type: NotificationType
    title: str
    message: str
    order_id: UUID | None = None
    is_read: bool
    created_at: datetime
