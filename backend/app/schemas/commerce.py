from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.enums import OrderSource, OrderStatus, PaymentMethod, PaymentStatus


class CartItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    cart_id: UUID
    product_id: UUID
    variant_id: UUID | None = None
    quantity: int
    product_name: str
    variant_name: str | None = None
    unit_price: int
    total_price: int


class CartRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    items: list[CartItemRead] = []
    subtotal: int = 0
    item_count: int = 0


class CartItemAdd(BaseModel):
    product_slug: str
    variant_sku: str | None = None
    quantity: int = 1

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Quantity must be at least 1")
        return v


class CartItemUpdate(BaseModel):
    quantity: int

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Quantity must be at least 1")
        return v


class OrderItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_id: UUID
    variant_id: UUID | None = None
    product_name: str
    variant_name: str | None = None
    unit_price: int
    quantity: int
    discount_amount: int
    total_price: int


class OrderStatusHistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    order_id: UUID
    from_status: OrderStatus | None = None
    to_status: OrderStatus
    changed_by: str
    reason: str | None = None
    changed_at: datetime


class PaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    order_id: UUID
    razorpay_order_id: str | None = None
    razorpay_payment_id: str | None = None
    amount: int
    currency: str
    status: PaymentStatus
    method: str | None = None
    paid_at: datetime | None = None
    created_at: datetime


class OrderListItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    order_number: str
    status: OrderStatus
    payment_status: PaymentStatus
    payment_method: PaymentMethod
    order_source: OrderSource
    total_amount: int
    created_at: datetime
    delivered_at: datetime | None = None


class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    order_number: str
    user_id: UUID
    user_full_name: str
    user_mobile: str
    shipping_address: dict | None = None
    status: OrderStatus
    payment_status: PaymentStatus
    payment_method: PaymentMethod
    order_source: OrderSource
    subtotal: int
    discount_amount: int
    delivery_fee: int | None = None
    total_amount: int
    customer_note: str | None = None
    admin_note: str | None = None
    cancelled_at: datetime | None = None
    cancelled_by: str | None = None
    delivered_at: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None
    items: list[OrderItemRead] = []
    status_history: list[OrderStatusHistoryRead] = []
    payment: PaymentRead | None = None


class CheckoutBase(BaseModel):
    shipping_address_id: UUID
    payment_method: PaymentMethod
    customer_note: str | None = None
    promotion_code: str | None = None

    @field_validator("payment_method")
    @classmethod
    def validate_payment_method(cls, v: PaymentMethod) -> PaymentMethod:
        if v not in (PaymentMethod.cod, PaymentMethod.online):
            raise ValueError("Invalid payment method")
        return v


class CheckoutResponse(BaseModel):
    order: OrderRead
    client_secret: str | None = None


class OrderStatusChange(BaseModel):
    status: OrderStatus
    reason: str | None = None
