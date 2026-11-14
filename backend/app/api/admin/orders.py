import secrets
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_db
from app.core.security import get_password_hash
from app.models import Address, AdminUser, Cart, CartItem, Order, User
from app.models.enums import OrderSource, OrderStatus, PaymentMethod
from app.schemas import (
    AddressCreate,
    CheckoutBase,
    OrderListItemRead,
    OrderRead,
    OrderStatusChange,
)
from app.services import AdminService, OrderService
from app.services.cart import CartService

router = APIRouter()


class ConfirmRequest(BaseModel):
    delivery_fee: int


class CancelRequest(BaseModel):
    reason: str | None = None


class WhatsappOrderItem(BaseModel):
    product_id: UUID
    variant_id: UUID | None = None
    quantity: int = 1


class WhatsappOrderCreate(BaseModel):
    full_name: str
    mobile_number: str
    email: str | None = None
    address: AddressCreate
    items: list[WhatsappOrderItem]
    payment_method: PaymentMethod = PaymentMethod.cod
    customer_note: str | None = None


@router.get("/", response_model=list[OrderListItemRead])
def list_orders(
    status: OrderStatus | None = None,
    customer_id: UUID | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    return AdminService(db).list_orders(
        status=status, skip=skip, limit=limit, customer_id=customer_id
    )


@router.get("/{order_id}", response_model=OrderRead)
def get_order(
    order_id: UUID,
    db: Session = Depends(get_db),
):
    return AdminService(db).get_order_detail(order_id)


@router.post("/{order_id}/confirm", response_model=OrderRead)
def confirm_order(
    order_id: UUID,
    payload: ConfirmRequest,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return AdminService(db).confirm_order(order_id, admin.id, payload.delivery_fee)


@router.patch("/{order_id}/status", response_model=OrderRead)
def change_status(
    order_id: UUID,
    payload: OrderStatusChange,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return AdminService(db).change_order_status(
        order_id, payload.status, admin.id, payload.reason
    )


@router.post("/{order_id}/cancel", response_model=OrderRead)
def cancel_order(
    order_id: UUID,
    payload: CancelRequest,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return AdminService(db).cancel_order(order_id, admin.id, payload.reason)


@router.post("/whatsapp", response_model=OrderRead)
def create_whatsapp_order(
    payload: WhatsappOrderCreate,
    db: Session = Depends(get_db),
):
    user = db.scalar(select(User).where(User.mobile_number == payload.mobile_number))
    if not user:
        user = User(
            mobile_number=payload.mobile_number,
            full_name=payload.full_name,
            email=payload.email,
            password_hash=get_password_hash(secrets.token_urlsafe(32)),
        )
        db.add(user)
        db.flush()
        db.add(Cart(user_id=user.id))
        db.flush()

    address = Address(user_id=user.id, **payload.address.model_dump())
    db.add(address)
    db.flush()

    CartService(db).clear_cart(user.id)

    cart = db.scalar(select(Cart).where(Cart.user_id == user.id))
    for item in payload.items:
        db.add(
            CartItem(
                cart_id=cart.id,
                product_id=item.product_id,
                variant_id=item.variant_id,
                quantity=item.quantity,
            )
        )
    db.flush()

    order_service = OrderService(db)
    checkout = CheckoutBase(
        shipping_address_id=address.id,
        payment_method=payload.payment_method,
        customer_note=payload.customer_note,
    )
    order_read = order_service.create_order(user.id, checkout)

    order = db.get(Order, order_read.id)
    order.order_source = OrderSource.whatsapp
    db.flush()

    return order_service.get_order_detail(order_read.id)
