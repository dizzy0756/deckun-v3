"""Schema tests for Deckun Phase 1 (plan §1.5).

Covers:
- Constraint tests: negative stock, duplicate mobile, invalid status, duplicate order number, duplicate SKU, duplicate pincode
- Deletion tests: archived product still joins to historical orders, cascade delete of cart_items
- Dashboard queries: today's orders, low stock, pending confirmations
- Idempotency: duplicate razorpay payment id / event id rejected
"""

from datetime import UTC
from uuid import uuid4

import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError

from app.models import (
    Address,
    AdminUser,
    Cart,
    CartItem,
    Category,
    Order,
    OrderItem,
    Payment,
    PaymentEvent,
    Product,
    ProductVariant,
    ServiceablePincode,
    Setting,
    User,
)
from app.models.enums import (
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
    ProductStatus,
)


def _create_user(db, mobile="9999999999", email="user@test.com"):
    user = User(
        mobile_number=mobile, email=email, password_hash="hashed", full_name="Test User"
    )
    db.add(user)
    db.flush()
    return user


def _create_category(db, name="Outdoor", slug="outdoor"):
    cat = Category(name=name, slug=slug)
    db.add(cat)
    db.flush()
    return cat


def _create_address(db, user_id):
    addr = Address(
        user_id=user_id,
        label="Home",
        full_name="Test User",
        address_line1="123 Test St",
        city="Test City",
        state="Test State",
        pincode="560001",
        phone_number="9999999999",
    )
    db.add(addr)
    db.flush()
    return addr


def _create_product(db, slug="test-product", category_id=None, has_variants=False):
    if category_id is None:
        cat = _create_category(db)
        category_id = cat.id
    prod = Product(
        category_id=category_id,
        name="Test Product",
        slug=slug,
        description="A test product",
        has_variants=has_variants,
    )
    db.add(prod)
    db.flush()
    return prod


# ---------------------------------------------------------------------------
# Constraint tests
# ---------------------------------------------------------------------------


class TestStockConstraints:
    def test_negative_stock_rejected(self, db):
        cat = _create_category(db)
        prod = _create_product(db, slug="stock-test", category_id=cat.id)
        variant = ProductVariant(
            product_id=prod.id,
            sku="SK-NEG",
            name="Negative",
            price=100,
            stock=-1,
        )
        db.add(variant)
        with pytest.raises(IntegrityError):
            db.flush()
        db.rollback()

    def test_default_stock_is_zero(self, db):
        cat = _create_category(db)
        prod = _create_product(db, slug="zero-test", category_id=cat.id)
        variant = ProductVariant(
            product_id=prod.id,
            sku="SK-ZERO",
            name="Zero",
            price=100,
        )
        db.add(variant)
        db.flush()
        assert variant.stock == 0


class TestUniqueConstraints:
    def test_duplicate_mobile_rejected(self, db):
        _create_user(db, mobile="9999999999")
        db.add(User(mobile_number="9999999999", password_hash="h", full_name="Dup"))
        with pytest.raises(IntegrityError):
            db.flush()
        db.rollback()

    def test_duplicate_admin_email_rejected(self, db):
        db.add(AdminUser(email="admin@deckun.in", password_hash="h", full_name="A1"))
        db.flush()
        db.add(AdminUser(email="admin@deckun.in", password_hash="h", full_name="A2"))
        with pytest.raises(IntegrityError):
            db.flush()
        db.rollback()

    def test_duplicate_order_number_rejected(self, db):
        user = _create_user(db)
        addr = _create_address(db, user.id)
        db.add(
            Order(
                order_number="ORD-001",
                user_id=user.id,
                shipping_address_id=addr.id,
                payment_method=PaymentMethod.cod,
                subtotal=100,
                discount_amount=0,
                total_amount=100,
            )
        )
        db.add(
            Order(
                order_number="ORD-001",
                user_id=user.id,
                shipping_address_id=addr.id,
                payment_method=PaymentMethod.cod,
                subtotal=100,
                discount_amount=0,
                total_amount=100,
            )
        )
        with pytest.raises(IntegrityError):
            db.flush()
        db.rollback()

    def test_duplicate_sku_rejected(self, db):
        cat = _create_category(db)
        prod = _create_product(
            db, slug="sku-test", category_id=cat.id, has_variants=True
        )
        db.add(
            ProductVariant(
                product_id=prod.id, sku="SKU-DUP", name="V1", price=100, stock=5
            )
        )
        db.add(
            ProductVariant(
                product_id=prod.id, sku="SKU-DUP", name="V2", price=200, stock=3
            )
        )
        with pytest.raises(IntegrityError):
            db.flush()
        db.rollback()

    def test_duplicate_pincode_rejected(self, db):
        db.add(ServiceablePincode(pincode="560001", city="BLR", state="KA"))
        db.add(ServiceablePincode(pincode="560001", city="BLR2", state="KA"))
        with pytest.raises(IntegrityError):
            db.flush()
        db.rollback()


class TestEnumConstraints:
    def test_invalid_order_status_rejected(self, db):
        user = _create_user(db)
        addr = _create_address(db, user.id)
        with pytest.raises(IntegrityError):
            db.execute(
                text(
                    "INSERT INTO orders (id, order_number, user_id, shipping_address_id, "
                    "status, payment_status, payment_method, order_source, subtotal, "
                    "discount_amount, delivery_fee, total_amount, created_at, updated_at) "
                    "VALUES (:id, :on, :uid, :aid, 'invalid_status', 'pending', 'cod', "
                    "'website', 100, 0, NULL, 100, datetime('now'), datetime('now'))"
                ).bindparams(
                    id=uuid4().hex,
                    on="ORD-ENUM-1",
                    uid=user.id.hex,
                    aid=addr.id.hex,
                )
            )
        db.rollback()

    def test_invalid_payment_method_rejected(self, db):
        user = _create_user(db)
        addr = _create_address(db, user.id)
        with pytest.raises(IntegrityError):
            db.execute(
                text(
                    "INSERT INTO orders (id, order_number, user_id, shipping_address_id, "
                    "status, payment_status, payment_method, order_source, subtotal, "
                    "discount_amount, delivery_fee, total_amount, created_at, updated_at) "
                    "VALUES (:id, :on, :uid, :aid, 'placed', 'pending', 'bitcoin', "
                    "'website', 100, 0, NULL, 100, datetime('now'), datetime('now'))"
                ).bindparams(
                    id=uuid4().hex,
                    on="ORD-ENUM-2",
                    uid=user.id.hex,
                    aid=addr.id.hex,
                )
            )
        db.rollback()


class TestFKAndCheckConstraints:
    def test_order_item_without_order_rejected(self, db):
        db.add(
            OrderItem(
                order_id=uuid4(),
                product_id=uuid4(),
                product_name="Ghost",
                unit_price=100,
                quantity=1,
                discount_amount=0,
                total_price=100,
            )
        )
        with pytest.raises(IntegrityError):
            db.flush()
        db.rollback()


# ---------------------------------------------------------------------------
# Deletion / archive tests
# ---------------------------------------------------------------------------


class TestArchivalIntegrity:
    def test_archived_product_still_joins_to_orders(self, db):
        cat = _create_category(db)
        prod = _create_product(db, slug="archive-test", category_id=cat.id)
        variant = ProductVariant(
            product_id=prod.id,
            sku="SKU-ARCH",
            name="Variant",
            price=500,
            stock=5,
        )
        db.add(variant)
        db.flush()

        user = _create_user(db)
        addr = _create_address(db, user.id)
        order = Order(
            order_number="ORD-ARCH-1",
            user_id=user.id,
            shipping_address_id=addr.id,
            payment_method=PaymentMethod.cod,
            subtotal=500,
            discount_amount=0,
            total_amount=500,
        )
        db.add(order)
        db.flush()

        order_item = OrderItem(
            order_id=order.id,
            product_id=prod.id,
            variant_id=variant.id,
            product_name=prod.name,
            variant_name=variant.name,
            unit_price=500,
            quantity=1,
            discount_amount=0,
            total_price=500,
        )
        db.add(order_item)
        db.flush()

        prod.status = ProductStatus.archived
        db.flush()
        db.refresh(prod)

        assert prod.status == ProductStatus.archived

        result = db.execute(
            text(
                "SELECT p.name, oi.product_name FROM order_items oi "
                "JOIN products p ON oi.product_id = p.id "
                "WHERE oi.order_id = :oid"
            ).bindparams(oid=order.id.hex)
        ).fetchall()
        assert len(result) == 1
        assert result[0][1] == "Test Product"

    def test_cascade_delete_cart_items_on_cart_delete(self, db):
        user = _create_user(db)
        cart = Cart(user_id=user.id)
        db.add(cart)
        db.flush()

        cat = _create_category(db)
        prod = _create_product(db, slug="cart-cascade", category_id=cat.id)

        item = CartItem(cart_id=cart.id, product_id=prod.id, quantity=2)
        db.add(item)
        db.flush()

        db.delete(cart)
        db.flush()

        remaining = db.execute(
            text("SELECT COUNT(*) FROM cart_items WHERE cart_id = :cid").bindparams(
                cid=cart.id.hex
            )
        ).scalar()
        assert remaining == 0


# ---------------------------------------------------------------------------
# Dashboard query tests
# ---------------------------------------------------------------------------


class TestDashboardQueries:
    def test_todays_orders_query(self, db):
        from datetime import datetime

        user = _create_user(db)
        addr = _create_address(db, user.id)
        for i in range(3):
            db.add(
                Order(
                    order_number=f"ORD-TODAY-{i}",
                    user_id=user.id,
                    shipping_address_id=addr.id,
                    payment_method=PaymentMethod.cod,
                    subtotal=100,
                    discount_amount=0,
                    total_amount=100,
                )
            )
        db.flush()

        today = datetime.now(UTC).replace(
            hour=0, minute=0, second=0, microsecond=0, tzinfo=None
        )
        count = db.scalar(
            text(
                "SELECT COUNT(*) FROM orders WHERE created_at >= :today AND status = 'placed'"
            ).bindparams(today=today)
        )
        assert count == 3

    def test_low_stock_query(self, db):
        threshold_setting = Setting(
            setting_key="low_stock_threshold",
            setting_value="3",
            data_type="integer",
            description="test",
        )
        db.add(threshold_setting)
        db.flush()

        cat = _create_category(db)
        prod = _create_product(
            db, slug="low-stock-test", category_id=cat.id, has_variants=True
        )

        v_low = ProductVariant(
            product_id=prod.id, sku="SKU-LOW", name="Low", price=100, stock=2
        )
        v_ok = ProductVariant(
            product_id=prod.id, sku="SKU-OK", name="Ok", price=100, stock=5
        )
        db.add_all([v_low, v_ok])
        db.flush()

        threshold = int(
            db.scalar(
                select(Setting.setting_value).where(
                    Setting.setting_key == "low_stock_threshold"
                )
            )
        )
        low_stock = (
            db.execute(select(ProductVariant).where(ProductVariant.stock <= threshold))
            .scalars()
            .all()
        )
        assert len(low_stock) == 1
        assert low_stock[0].sku == "SKU-LOW"

    def test_pending_orders_query(self, db):
        user = _create_user(db)
        addr = _create_address(db, user.id)
        db.add(
            Order(
                order_number="ORD-PENDING-1",
                user_id=user.id,
                shipping_address_id=addr.id,
                payment_method=PaymentMethod.cod,
                subtotal=100,
                discount_amount=0,
                total_amount=100,
            )
        )
        db.add(
            Order(
                order_number="ORD-CONFIRMED-1",
                user_id=user.id,
                shipping_address_id=addr.id,
                payment_method=PaymentMethod.online,
                subtotal=200,
                discount_amount=0,
                total_amount=200,
                status=OrderStatus.confirmed,
                payment_status=PaymentStatus.paid,
            )
        )
        db.flush()

        pending = db.scalar(
            text(
                "SELECT COUNT(*) FROM orders WHERE status = 'placed' AND payment_status = 'pending'"
            )
        )
        assert pending == 1


# ---------------------------------------------------------------------------
# Idempotency / payment event tests
# ---------------------------------------------------------------------------


class TestPaymentIdempotency:
    def test_duplicate_razorpay_payment_id_rejected(self, db):
        user = _create_user(db)
        addr = _create_address(db, user.id)
        order = Order(
            order_number="ORD-PAY-1",
            user_id=user.id,
            shipping_address_id=addr.id,
            payment_method=PaymentMethod.online,
            subtotal=100,
            discount_amount=0,
            total_amount=100,
        )
        db.add(order)
        db.flush()

        pay1 = Payment(
            order_id=order.id, razorpay_payment_id="pay_123", amount=100, currency="INR"
        )
        pay2 = Payment(
            order_id=uuid4(), razorpay_payment_id="pay_123", amount=100, currency="INR"
        )
        db.add(pay1)
        db.flush()
        db.add(pay2)
        with pytest.raises(IntegrityError):
            db.flush()
        db.rollback()

    def test_duplicate_razorpay_event_id_rejected(self, db):
        user = _create_user(db)
        addr = _create_address(db, user.id)
        order = Order(
            order_number="ORD-EVT-1",
            user_id=user.id,
            shipping_address_id=addr.id,
            payment_method=PaymentMethod.online,
            subtotal=100,
            discount_amount=0,
            total_amount=100,
        )
        db.add(order)
        db.flush()

        pay = Payment(order_id=order.id, amount=100, currency="INR")
        db.add(pay)
        db.flush()

        e1 = PaymentEvent(
            payment_id=pay.id,
            order_id=order.id,
            event_type="captured",
            razorpay_event_id="evt_abc",
            payload="{}",
        )
        e2 = PaymentEvent(
            payment_id=pay.id,
            order_id=order.id,
            event_type="captured",
            razorpay_event_id="evt_abc",
            payload="{}",
        )
        db.add(e1)
        db.flush()
        db.add(e2)
        with pytest.raises(IntegrityError):
            db.flush()
        db.rollback()
