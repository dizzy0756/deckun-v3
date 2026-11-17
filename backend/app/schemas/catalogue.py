from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    sort_order: int
    is_active: bool
    created_at: datetime


class ProductVariantAdmin(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID | None = None
    sku: str
    name: str
    price: int
    stock: int
    is_active: bool = True


class ProductImageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    url: str
    storage_key: str
    sort_order: int
    alt_text: str | None = None
    is_active: bool
    variant_id: UUID | None = None


class ProductImageCreate(BaseModel):
    url: str
    storage_key: str
    sort_order: int = 0
    alt_text: str | None = None
    is_active: bool = True
    variant_id: UUID | None = None


class ProductSpecRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    field_label: str
    field_value: str
    sort_order: int


class ProductSpecCreate(BaseModel):
    field_label: str
    field_value: str
    sort_order: int = 0


class Availability(str, Enum):
    in_stock = "in_stock"
    low_stock = "low_stock"
    out_of_stock = "out_of_stock"


class ProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    name: str
    description: str
    base_price: int | None = None
    discount_percent: float
    is_featured: bool
    category_id: int
    category_name: str
    primary_image_url: str | None = None
    availability: Availability
    has_variants: bool


class VariantAvailabilityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    sku: str
    name: str
    color: str | None = None
    size: str | None = None
    price: int
    availability: Availability


class ProductPromotionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None = None
    discount_type: str
    discount_value: float


class ProductDetailRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    name: str
    description: str
    base_price: int | None = None
    discount_percent: float
    is_featured: bool
    has_variants: bool
    category_id: int
    category_name: str
    meta_title: str | None = None
    meta_description: str | None = None
    images: list[ProductImageRead] = []
    specifications: list[ProductSpecRead] = []
    variants: list[VariantAvailabilityRead] = []
    effective_price: int | None = None
    discount_amount: int = 0
    promotion: ProductPromotionOut | None = None
