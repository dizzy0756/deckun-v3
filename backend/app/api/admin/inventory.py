from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.services import AdminService, InventoryService

router = APIRouter()


class StockUpdate(BaseModel):
    stock: int


@router.get("/")
def list_inventory(
    low_stock_only: bool = False,
    db: Session = Depends(get_db),
):
    return AdminService(db).list_inventory(low_stock_only=low_stock_only)


@router.patch("/variants/{variant_id}/stock")
def update_stock(
    variant_id: UUID,
    payload: StockUpdate,
    db: Session = Depends(get_db),
):
    service = InventoryService(db)
    try:
        service.set_stock(variant_id, payload.stock)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found"
        )
    return {"variant_id": str(variant_id), "stock": payload.stock}
