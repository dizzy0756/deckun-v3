import random
from datetime import UTC, datetime
from typing import ClassVar
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Address,
    Cart,
    CartItem,
    Order,
    OrderItem,
    OrderStatusHistory,
    Payment,
    Product,
    ProductVariant,
    User,
)
from app.models.enums import (
    NotificationType,
    OrderSource,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
    ProductStatus,
)
from app.schemas import (
    CheckoutBase,
    OrderItemRead,
    OrderListItemRead,
    OrderRead,
    OrderStatusHistoryRead,
    PaymentRead,
)
from app.services.cart import CartService
from app.services.catalogue import CatalogueService
from app.services.inventory import InventoryService
from app.services.messaging import notify_order_status
from app.services.notifications import NotificationService
from app.services.pricing import PriceCalculator
from app.services.promotions import PromotionService


class OrderService:
    ALLOWED_TRANSITIONS: ClassVar[dict[OrderStatus, set[OrderStatus]]] = {
        OrderStatus.placed: {OrderStatus.confirmed},
        OrderStatus.confirmed: {OrderStatus.preparing},
        OrderStatus.preparing: {OrderStatus.out_for_delivery},
        OrderStatus.out_for_delivery: {OrderStatus.delivered},
        OrderStatus.delivered: set(),
        OrderStatus.cancelled: set(),
    }

    CANCELABLE_FROM: ClassVar[set[OrderStatus]] = {
        OrderStatus.placed,
        OrderStatus.confirmed,
        OrderStatus.preparing,
    }

    def __init__(self, db: Session) -> None:
        self.db = db
        self._cart = CartService(db)
        self._catalogue = CatalogueService(db)
        self._promotions = PromotionService(db)
        self._inventory = InventoryService(db)
        self._notifications = NotificationService(db)

    def _generate_order_number(self) -> str:
        date_str = datetime.now(UTC).strftime("%Y%m%d")
        for _ in range(5):
            suffix = random.randint(100000, 999999)
            number = f"ORD-{date_str}-{suffix}"
            if not self.db.scalar(select(Order).where(Order.order_number == number)):
                return number
        raise HTTPException(status_code=500, detail="Failed to generate order number")

    def _validate_cart_item(
        self, product: Product, variant: ProductVariant | None
    ) -> int:
        if product.status != ProductStatus.active:
            raise HTTPException(
                status_code=400, detail=f"Product '{product.name}' is not available"
            )
        base_price = variant.price if variant else (product.base_price or 0)
        if variant is not None and variant.stock <= 0:
            raise HTTPException(
                status_code=400,
                detail=f"Variant '{variant.name}' is out of stock",
            )
        return base_price

    def _resolve_cart_item(
        self, cart_item: CartItem
    ) -> tuple[Product, ProductVariant | None, int]:
        product = self.db.get(Product, cart_item.product_id)
        if not product:
            raise HTTPException(
                status_code=400, detail="Product in cart no longer exists"
            )
        variant = None
        if cart_item.variant_id:
            variant = self.db.get(ProductVariant, cart_item.variant_id)
            if not variant:
                raise HTTPException(
                    status_code=400, detail="Variant in cart no longer exists"
                )
        base_price = self._validate_cart_item(product, variant)
        return product, variant, base_price

    def _build_order_read(self, order: Order) -> OrderRead:
        user = self.db.get(User, order.user_id)
        address = self.db.get(Address, order.shipping_address_id)

        order_items = self.db.scalars(
            select(OrderItem).where(OrderItem.order_id == order.id)
        ).all()
        status_history = self.db.scalars(
            select(OrderStatusHistory)
            .where(OrderStatusHistory.order_id == order.id)
            .order_by(OrderStatusHistory.changed_at)
        ).all()
        payment = self.db.scalar(select(Payment).where(Payment.order_id == order.id))

        address_dict = None
        if address:
            address_dict = {
                "id": str(address.id),
                "full_name": address.full_name,
                "address_line1": address.address_line1,
                "address_line2": address.address_line2,
                "city": address.city,
                "state": address.state,
                "pincode": address.pincode,
                "landmark": address.landmark,
                "phone_number": address.phone_number,
                "is_default": address.is_default,
            }

        return OrderRead(
            id=order.id,
            order_number=order.order_number,
            user_id=order.user_id,
            user_full_name=user.full_name if user else "Unknown",
            user_mobile=user.mobile_number if user else "Unknown",
            shipping_address=address_dict,
            status=order.status,
            payment_status=order.payment_status,
            payment_method=order.payment_method,
            order_source=order.order_source,
            subtotal=order.subtotal,
            discount_amount=order.discount_amount,
            delivery_fee=order.delivery_fee,
            total_amount=order.total_amount,
            customer_note=order.customer_note,
            admin_note=order.admin_note,
            cancelled_at=order.cancelled_at,
            cancelled_by=order.cancelled_by,
            delivered_at=order.delivered_at,
            created_at=order.created_at,
            updated_at=order.updated_at,
            items=[OrderItemRead.model_validate(oi) for oi in order_items],
            status_history=[
                OrderStatusHistoryRead.model_validate(h) for h in status_history
            ],
            payment=PaymentRead.model_validate(payment) if payment else None,
        )

    def create_order(
        self,
        user_id: UUID,
        checkout_data: CheckoutBase,
    ) -> OrderRead:
        cart = self.db.scalar(select(Cart).where(Cart.user_id == user_id))
        if not cart:
            cart = Cart(user_id=user_id)
            self.db.add(cart)
            self.db.flush()

        cart_items = self.db.scalars(
            select(CartItem).where(CartItem.cart_id == cart.id)
        ).all()
        if not cart_items:
            raise HTTPException(status_code=400, detail="Cart is empty")

        address = self.db.scalar(
            select(Address).where(
                Address.id == checkout_data.shipping_address_id,
                Address.user_id == user_id,
            )
        )
        if not address:
            raise HTTPException(status_code=404, detail="Address not found")

        subtotal = 0
        total_discount = 0
        item_snapshots: list[dict] = []

        for cart_item in cart_items:
            product, variant, base_price = self._resolve_cart_item(cart_item)
            discount_percent = float(product.discount_percent)
            promo = self._promotions.get_active_promotion(product.id)
            breakdown = PriceCalculator.compute_line_item(
                base_price,
                discount_percent,
                cart_item.quantity,
                promo,
            )

            subtotal += breakdown.unit_price * cart_item.quantity
            total_discount += breakdown.discount_amount

            item_snapshots.append(
                {
                    "product_id": product.id,
                    "variant_id": variant.id if variant else None,
                    "product_name": product.name,
                    "variant_name": variant.name if variant else None,
                    "unit_price": breakdown.unit_price,
                    "quantity": cart_item.quantity,
                    "discount_amount": breakdown.discount_amount,
                    "total_price": breakdown.total_price,
                }
            )

        delivery_fee = None

        # Apply a code-based promo at cart level (after per-line discounts)
        after_line_discounts = max(0, subtotal - total_discount)
        if checkout_data.promotion_code:
            result = self._promotions.validate_code(
                checkout_data.promotion_code, after_line_discounts
            )
            if not result.valid:
                raise HTTPException(status_code=400, detail=result.message)
            total_discount += result.discount_amount

        total_amount = max(0, subtotal - total_discount)

        order_number = self._generate_order_number()
        order = Order(
            order_number=order_number,
            user_id=user_id,
            shipping_address_id=checkout_data.shipping_address_id,
            status=OrderStatus.placed,
            payment_status=PaymentStatus.pending,
            payment_method=checkout_data.payment_method,
            order_source=OrderSource.website,
            subtotal=subtotal,
            discount_amount=total_discount,
            delivery_fee=delivery_fee,
            total_amount=total_amount,
            customer_note=checkout_data.customer_note,
        )
        self.db.add(order)
        self.db.flush()

        for snap in item_snapshots:
            order_item = OrderItem(
                order_id=order.id,
                **snap,
            )
            self.db.add(order_item)

        self._create_status_history(
            order.id, None, OrderStatus.placed, "system", "Order created"
        )

        payment_record = None
        if checkout_data.payment_method == PaymentMethod.online:
            payment_record = Payment(
                order_id=order.id,
                amount=order.total_amount,
                currency="INR",
                status=PaymentStatus.pending,
                method=None,
            )
            self.db.add(payment_record)

        self._notifications.create(
            NotificationType.new_order,
            "New order placed",
            f"Order {order_number} has been placed and is awaiting confirmation.",
            order_id=order.id,
        )

        self._cart.clear_cart(user_id)
        self.db.flush()

        self._notify_customer(order, "placed")

        return self._build_order_read(order)

    def _create_status_history(
        self,
        order_id: UUID,
        from_status: OrderStatus | None,
        to_status: OrderStatus,
        changed_by: str,
        reason: str | None = None,
    ) -> None:
        history = OrderStatusHistory(
            order_id=order_id,
            from_status=from_status,
            to_status=to_status,
            changed_by=changed_by,
            reason=reason,
        )
        self.db.add(history)
        self.db.flush()

    def _notify_customer(self, order: Order, status: str) -> None:
        """Best-effort SMS/WhatsApp update; never raises."""
        user = self.db.get(User, order.user_id)
        if not user or not user.mobile_number:
            return
        notify_order_status(user.mobile_number, order.order_number, status)

    def change_status(
        self,
        order_id: UUID,
        new_status: OrderStatus,
        changed_by: str,
        reason: str | None = None,
    ) -> OrderRead:
        order = self.db.get(Order, order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        current = order.status
        if new_status not in self.ALLOWED_TRANSITIONS.get(current, set()):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot transition from {current.value} to {new_status.value}",
            )

        order.status = new_status
        if new_status == OrderStatus.delivered:
            order.delivered_at = datetime.now(UTC).replace(tzinfo=None)
            self._notifications.create(
                NotificationType.order_delivered,
                "Order delivered",
                f"Order {order.order_number} has been delivered.",
                order_id=order_id,
            )
        self._create_status_history(order_id, current, new_status, changed_by, reason)

        self.db.flush()
        self._notify_customer(order, new_status.value)
        return self._build_order_read(order)

    def confirm_order(
        self, order_id: UUID, admin_id: UUID, delivery_fee: int
    ) -> OrderRead:
        order = self.db.get(Order, order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order.status != OrderStatus.placed:
            raise HTTPException(
                status_code=400,
                detail="Only placed orders can be confirmed",
            )

        self._reduce_stock_for_order(order)

        order.status = OrderStatus.confirmed
        order.delivery_fee = delivery_fee
        order.total_amount = order.subtotal - order.discount_amount + delivery_fee

        self._create_status_history(
            order_id,
            OrderStatus.placed,
            OrderStatus.confirmed,
            str(admin_id),
            f"Confirmed with delivery fee: ₹{delivery_fee}",
        )
        self._notifications.create(
            NotificationType.order_confirmed,
            "Order confirmed",
            f"Order {order.order_number} has been confirmed.",
            order_id=order_id,
        )
        self.db.flush()
        self._notify_customer(order, "confirmed")
        return self._build_order_read(order)

    def _reduce_stock_for_order(self, order: Order) -> None:
        for item in self.db.scalars(
            select(OrderItem).where(OrderItem.order_id == order.id)
        ):
            if item.variant_id and not self._inventory.reduce_stock(
                item.variant_id, item.quantity, order_id=order.id
            ):
                self._notifications.create(
                    NotificationType.payment_failed,
                    "Stock conflict on confirm",
                    f"Order {order.order_number}: could not reduce stock for an item.",
                    order_id=order.id,
                )

    def cancel_order(
        self, order_id: UUID, cancelled_by: str, reason: str | None = None
    ) -> OrderRead:
        order = self.db.get(Order, order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        if order.status not in self.CANCELABLE_FROM:
            raise HTTPException(
                status_code=400,
                detail="Order cannot be cancelled after it has shipped",
            )

        stock_was_reduced = order.status in (
            OrderStatus.confirmed,
            OrderStatus.preparing,
        )

        if stock_was_reduced:
            for item in self.db.scalars(
                select(OrderItem).where(OrderItem.order_id == order.id)
            ):
                if item.variant_id:
                    self._inventory.restore_stock(
                        item.variant_id, item.quantity, order_id=order.id
                    )

        previous_status = order.status
        order.status = OrderStatus.cancelled
        order.cancelled_at = datetime.now(UTC).replace(tzinfo=None)
        order.cancelled_by = cancelled_by

        self._create_status_history(
            order_id, previous_status, OrderStatus.cancelled, cancelled_by, reason
        )
        self.db.flush()
        self._notify_customer(order, "cancelled")
        return self._build_order_read(order)

    def get_order_detail(self, order_id: UUID) -> OrderRead:
        order = self.db.get(Order, order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        return self._build_order_read(order)

    def list_orders(
        self,
        user_id: UUID,
        status: OrderStatus | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[OrderListItemRead]:
        stmt = (
            select(Order)
            .where(Order.user_id == user_id)
            .order_by(Order.created_at.desc())
        )
        if status:
            stmt = stmt.where(Order.status == status)
        stmt = stmt.offset(skip).limit(limit)
        orders = self.db.scalars(stmt).all()
        return [OrderListItemRead.model_validate(o) for o in orders]

    def list_orders_admin(
        self,
        status: OrderStatus | None = None,
        skip: int = 0,
        limit: int = 50,
        customer_id: UUID | None = None,
    ) -> list[OrderListItemRead]:
        stmt = select(Order).order_by(Order.created_at.desc())
        if status:
            stmt = stmt.where(Order.status == status)
        if customer_id:
            stmt = stmt.where(Order.user_id == customer_id)
        stmt = stmt.offset(skip).limit(limit)
        orders = self.db.scalars(stmt).all()
        return [OrderListItemRead.model_validate(o) for o in orders]
