from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models import User
from app.models.enums import OrderStatus
from app.schemas import (
    CheckoutBase,
    CheckoutResponse,
    OrderListItemRead,
    OrderRead,
)
from app.services.orders import OrderService

router = APIRouter(prefix="/api/orders", tags=["orders"])


class CancelRequest(BaseModel):
    reason: str | None = None


@router.post("/checkout", response_model=CheckoutResponse)
def checkout(
    data: CheckoutBase,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CheckoutResponse:
    order = OrderService(db).create_order(user.id, data)
    return CheckoutResponse(order=order)


@router.get("/", response_model=list[OrderListItemRead])
def list_orders(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status: OrderStatus | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
) -> list[OrderListItemRead]:
    return OrderService(db).list_orders(user.id, status, skip, limit)


@router.get("/{order_id}", response_model=OrderRead)
def get_order(
    order_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrderRead:
    return OrderService(db).get_order_detail(order_id)


@router.post("/{order_id}/cancel", response_model=OrderRead)
def cancel_order(
    order_id: UUID,
    data: CancelRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrderRead:
    return OrderService(db).cancel_order(order_id, str(user.id), data.reason)
