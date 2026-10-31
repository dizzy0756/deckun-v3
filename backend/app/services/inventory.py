from uuid import UUID

from sqlalchemy import update
from sqlalchemy.orm import Session

from app.models import InventoryMovement, ProductVariant


class InventoryService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_stock(self, variant_id: UUID) -> int:
        variant = self.db.get(ProductVariant, variant_id)
        if not variant:
            return 0
        return variant.stock

    def reduce_stock(
        self,
        variant_id: UUID,
        quantity: int,
        order_id: UUID | None = None,
    ) -> bool:
        variant = self.db.get(ProductVariant, variant_id)
        if not variant:
            return False

        result = self.db.execute(
            update(ProductVariant)
            .where(
                ProductVariant.id == variant_id,
                ProductVariant.stock >= quantity,
            )
            .values(stock=ProductVariant.stock - quantity)
        )
        if result.rowcount == 0:
            return False

        self.db.refresh(variant)
        self._create_movement(variant_id, None, order_id, -quantity, variant.stock)
        return True

    def restore_stock(
        self,
        variant_id: UUID,
        quantity: int,
        order_id: UUID | None = None,
    ) -> bool:
        variant = self.db.get(ProductVariant, variant_id)
        if not variant:
            return False

        self.db.execute(
            update(ProductVariant)
            .where(ProductVariant.id == variant_id)
            .values(stock=ProductVariant.stock + quantity)
        )
        self.db.refresh(variant)
        self._create_movement(variant_id, None, order_id, quantity, variant.stock)
        return True

    def set_stock(self, variant_id: UUID, new_stock: int) -> int:
        variant = self.db.get(ProductVariant, variant_id)
        if not variant:
            raise ValueError("Variant not found")
        change = new_stock - variant.stock
        if change != 0:
            self.db.execute(
                update(ProductVariant)
                .where(ProductVariant.id == variant_id)
                .values(stock=new_stock)
            )
            self._create_movement(variant_id, None, None, change, new_stock)
        return new_stock

    def _create_movement(
        self,
        variant_id: UUID,
        product_id: UUID | None,
        order_id: UUID | None,
        quantity_change: int,
        running_balance: int,
    ) -> InventoryMovement:
        movement = InventoryMovement(
            variant_id=variant_id,
            product_id=product_id,
            order_id=order_id,
            quantity_change=quantity_change,
            reason="order_confirmed"
            if quantity_change < 0
            else "order_cancelled"
            if quantity_change > 0
            else "manual_adjustment",
            running_balance=running_balance,
        )
        self.db.add(movement)
        self.db.flush()
        return movement
