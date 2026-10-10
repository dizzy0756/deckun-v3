import enum

from sqlalchemy import CheckConstraint


def enum_check(table_name: str, column_name: str, enum_cls) -> CheckConstraint:
    """Create a CHECK constraint enforcing allowed enum values at the DB level.

    Needed because ``Enum(native_enum=False)`` does not auto-generate a
    CHECK in Alembic for SQLite/PostgreSQL VARCHAR columns.
    """
    values = ", ".join(f"'{e.value}'" for e in enum_cls)
    return CheckConstraint(
        f"{column_name} IN ({values})",
        name=f"ck_{table_name}_{column_name}",
    )


class ProductStatus(str, enum.Enum):
    active = "active"
    hidden = "hidden"
    archived = "archived"


class OrderStatus(str, enum.Enum):
    placed = "placed"
    confirmed = "confirmed"
    preparing = "preparing"
    out_for_delivery = "out_for_delivery"
    delivered = "delivered"
    cancelled = "cancelled"


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"
    cancelled = "cancelled"
    refunded = "refunded"


class PaymentMethod(str, enum.Enum):
    cod = "cod"
    online = "online"


class OrderSource(str, enum.Enum):
    website = "website"
    whatsapp = "whatsapp"


class ReviewStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    hidden = "hidden"


class NotificationType(str, enum.Enum):
    new_order = "new_order"
    order_confirmed = "order_confirmed"
    order_delivered = "order_delivered"
    low_stock = "low_stock"
    review_pending = "review_pending"
    payment_failed = "payment_failed"


class OtpType(str, enum.Enum):
    password_reset = "password_reset"
