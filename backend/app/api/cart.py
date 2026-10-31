from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models import User
from app.schemas import CartItemAdd, CartItemUpdate, CartRead
from app.services.cart import CartService

router = APIRouter(prefix="/api/cart", tags=["cart"])


@router.get("/", response_model=CartRead)
def get_cart(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> CartRead:
    return CartService(db).get_cart(user.id)


@router.post("/items", response_model=CartRead)
def add_item(
    data: CartItemAdd,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CartRead:
    return CartService(db).add_item(user.id, data)


@router.put("/items/{item_id}", response_model=CartRead)
def update_item(
    item_id: UUID,
    data: CartItemUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CartRead:
    return CartService(db).update_item(user.id, item_id, data.quantity)


@router.delete("/items/{item_id}")
def remove_item(
    item_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    CartService(db).remove_item(user.id, item_id)
    return {"detail": "Item removed"}
