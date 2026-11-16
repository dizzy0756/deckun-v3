from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    Order,
    Product,
    ProductVariant,
    Setting,
    User,
)
from app.models.enums import ProductStatus
from app.models.enums import OrderStatus
from app.schemas import SettingRead, UserRead
from app.services.orders import OrderService


class AdminService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self._orders = OrderService(db)

    def dashboard_summary(self) -> dict:
        now = datetime.now(UTC).replace(tzinfo=None)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        today_orders = self.db.scalar(
            select(func.count()).where(
                Order.created_at >= today_start,
                Order.status == OrderStatus.placed,
            )
        )

        pending_orders = self.db.scalar(
            select(func.count()).where(Order.status == OrderStatus.placed)
        )

        revenue = (
            self.db.scalar(
                select(func.coalesce(func.sum(Order.total_amount), 0)).where(
                    Order.created_at >= today_start,
                    Order.payment_status.in_(["paid", "pending"]),
                    Order.status != OrderStatus.cancelled,
                )
            )
            or 0
        )

        threshold = int(
            self.db.scalar(
                select(Setting.setting_value).where(
                    Setting.setting_key == "low_stock_threshold"
                )
            )
            or 3
        )
        low_stock_variants = self.db.scalars(
            select(ProductVariant).where(
                ProductVariant.stock <= threshold,
                ProductVariant.stock >= 0,
            )
        ).all()

        recent_orders = self.db.scalars(
            select(Order)
            .where(Order.created_at >= today_start)
            .order_by(Order.created_at.desc())
            .limit(10)
        ).all()

        from app.services.notifications import NotificationService

        unread_notifications = NotificationService(self.db).count_unread()

        return {
            "today_orders": today_orders or 0,
            "pending_orders": pending_orders or 0,
            "revenue_today": int(revenue),
            "low_stock_count": len(low_stock_variants),
            "recent_orders": [
                {
                    "order_number": o.order_number,
                    "status": o.status.value,
                    "total_amount": o.total_amount,
                    "created_at": o.created_at.isoformat(),
                }
                for o in recent_orders
            ],
            "unread_notifications": unread_notifications,
        }

    def list_orders(
        self,
        status: OrderStatus | None = None,
        skip: int = 0,
        limit: int = 50,
        customer_id: UUID | None = None,
    ) -> list:
        return self._orders.list_orders_admin(status, skip, limit, customer_id)

    def get_order_detail(self, order_id: UUID):
        return self._orders.get_order_detail(order_id)

    def change_order_status(
        self,
        order_id: UUID,
        new_status: OrderStatus,
        admin_id: UUID,
        reason: str | None = None,
    ):
        return self._orders.change_status(order_id, new_status, str(admin_id), reason)

    def confirm_order(self, order_id: UUID, admin_id: UUID, delivery_fee: int):
        return self._orders.confirm_order(order_id, admin_id, delivery_fee)

    def cancel_order(self, order_id: UUID, admin_id: UUID, reason: str | None = None):
        return self._orders.cancel_order(order_id, "admin", reason)

    def list_customers(self) -> list[UserRead]:
        users = self.db.scalars(select(User).where(User.is_active.is_(True))).all()
        return [UserRead.model_validate(u) for u in users]

    def list_inventory(self, low_stock_only: bool = False) -> list:
        threshold = int(
            self.db.scalar(
                select(Setting.setting_value).where(
                    Setting.setting_key == "low_stock_threshold"
                )
            )
            or 3
        )
        stmt = (
            select(
                ProductVariant.id,
                Product.name,
                ProductVariant.name.label("variant_name"),
                ProductVariant.sku,
                ProductVariant.stock,
                ProductVariant.price,
            )
            .join(Product, ProductVariant.product_id == Product.id)
            .where(ProductVariant.is_active.is_(True))
            .where(Product.status != ProductStatus.archived)
        )
        if low_stock_only:
            stmt = stmt.where(ProductVariant.stock <= threshold)
        stmt = stmt.order_by(ProductVariant.stock.asc())
        rows = self.db.execute(stmt).all()
        results = []
        for row in rows:
            results.append(
                {
                    "variant_id": str(row.id),
                    "product_name": row.name,
                    "variant_name": row.variant_name,
                    "sku": row.sku,
                    "stock": row.stock,
                    "price": row.price,
                }
            )
        return results

    def get_settings(self) -> list[SettingRead]:
        settings_rows = self.db.scalars(select(Setting)).all()
        return [SettingRead.model_validate(s) for s in settings_rows]

    def update_setting(self, key: str, value: str) -> SettingRead:
        setting = self.db.scalar(select(Setting).where(Setting.setting_key == key))
        if not setting:
            raise HTTPException(status_code=404, detail="Setting not found")
        setting.setting_value = value
        setting.updated_at = datetime.now(UTC).replace(tzinfo=None)
        self.db.flush()
        return SettingRead.model_validate(setting)
