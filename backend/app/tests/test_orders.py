from app.tests.conftest import (
    create_address,
    create_admin,
    create_category,
    create_product,
    create_user,
    create_variant,
    ensure_low_stock_setting,
    get_admin_token,
    get_customer_token,
)


class TestCheckout:
    def test_checkout_cod(self, client, db):
        ensure_low_stock_setting(db)
        user = create_user(db, mobile="9876543210")
        token = get_customer_token(client, "9876543210")
        cat = create_category(db)
        create_product(db, slug="checkout-prod", category_id=cat.id)
        addr = create_address(db, user.id)

        client.post(
            "/api/cart/items",
            headers={"Authorization": f"Bearer {token}"},
            json={"product_slug": "checkout-prod", "quantity": 2},
        )

        resp = client.post(
            "/api/orders/checkout",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "shipping_address_id": str(addr.id),
                "payment_method": "cod",
                "customer_note": "Ring the bell",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        order = data["order"]
        assert order["status"] == "placed"
        assert order["payment_status"] == "pending"
        assert order["payment_method"] == "cod"
        assert order["customer_note"] == "Ring the bell"
        assert data["client_secret"] is None
        assert order["subtotal"] == 2000
        assert order["discount_amount"] == 0
        assert order["total_amount"] == 2000

    def test_checkout_with_discount_consistency(self, client, db):
        ensure_low_stock_setting(db)
        user = create_user(db, mobile="9876543210")
        token = get_customer_token(client, "9876543210")
        cat = create_category(db)
        create_product(
            db,
            slug="disc-prod",
            category_id=cat.id,
            base_price=1000,
            discount_percent=10.0,
        )
        addr = create_address(db, user.id)

        client.post(
            "/api/cart/items",
            headers={"Authorization": f"Bearer {token}"},
            json={"product_slug": "disc-prod", "quantity": 2},
        )

        resp = client.post(
            "/api/orders/checkout",
            headers={"Authorization": f"Bearer {token}"},
            json={"shipping_address_id": str(addr.id), "payment_method": "cod"},
        )
        assert resp.status_code == 200
        order = resp.json()["order"]
        assert order["subtotal"] == 2000  # 1000 * 2
        assert order["discount_amount"] == 200  # (1000-900)*2
        assert order["total_amount"] == 1800

        item = order["items"][0]
        assert item["unit_price"] == 1000
        assert item["discount_amount"] == 200
        assert item["total_price"] == 1800

    def test_checkout_clears_cart(self, client, db):
        ensure_low_stock_setting(db)
        user = create_user(db, mobile="9876543210")
        token = get_customer_token(client, "9876543210")
        cat = create_category(db)
        create_product(db, slug="clear-cart-prod", category_id=cat.id)
        addr = create_address(db, user.id)

        client.post(
            "/api/cart/items",
            headers={"Authorization": f"Bearer {token}"},
            json={"product_slug": "clear-cart-prod", "quantity": 1},
        )

        client.post(
            "/api/orders/checkout",
            headers={"Authorization": f"Bearer {token}"},
            json={"shipping_address_id": str(addr.id), "payment_method": "cod"},
        )

        resp = client.get("/api/cart/", headers={"Authorization": f"Bearer {token}"})
        assert resp.json()["items"] == []
        assert resp.json()["item_count"] == 0

    def test_checkout_empty_cart_rejected(self, client, db):
        ensure_low_stock_setting(db)
        user = create_user(db, mobile="9876543210")
        token = get_customer_token(client, "9876543210")
        addr = create_address(db, user.id)
        resp = client.post(
            "/api/orders/checkout",
            headers={"Authorization": f"Bearer {token}"},
            json={"shipping_address_id": str(addr.id), "payment_method": "cod"},
        )
        assert resp.status_code == 400

    def test_checkout_online_creates_payment(self, client, db):
        ensure_low_stock_setting(db)
        user = create_user(db, mobile="9876543210")
        token = get_customer_token(client, "9876543210")
        cat = create_category(db)
        create_product(db, slug="online-prod", category_id=cat.id)
        addr = create_address(db, user.id)

        client.post(
            "/api/cart/items",
            headers={"Authorization": f"Bearer {token}"},
            json={"product_slug": "online-prod", "quantity": 1},
        )

        resp = client.post(
            "/api/orders/checkout",
            headers={"Authorization": f"Bearer {token}"},
            json={"shipping_address_id": str(addr.id), "payment_method": "online"},
        )
        assert resp.status_code == 200
        order = resp.json()["order"]
        assert order["payment_method"] == "online"
        assert order["payment"] is not None
        assert order["payment"]["status"] == "pending"


class TestOrderLifecycle:
    def test_full_lifecycle(self, client, db):
        ensure_low_stock_setting(db)
        create_admin(db, email="admin@test.com", password="admin123")
        admin_token = get_admin_token(client)

        user = create_user(db, mobile="9876543210")
        token = get_customer_token(client, "9876543210")
        cat = create_category(db)
        create_product(db, slug="lifecycle-prod", category_id=cat.id)
        addr = create_address(db, user.id)

        client.post(
            "/api/cart/items",
            headers={"Authorization": f"Bearer {token}"},
            json={"product_slug": "lifecycle-prod", "quantity": 1},
        )

        resp = client.post(
            "/api/orders/checkout",
            headers={"Authorization": f"Bearer {token}"},
            json={"shipping_address_id": str(addr.id), "payment_method": "cod"},
        )
        order_id = resp.json()["order"]["id"]

        # Confirm
        resp = client.post(
            f"/api/admin/orders/{order_id}/confirm",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"delivery_fee": 5000},
        )
        assert resp.status_code == 200
        order = resp.json()
        assert order["status"] == "confirmed"
        assert order["delivery_fee"] == 5000
        assert order["total_amount"] == 6000  # 1000 + 5000 - 0

        # Preparing
        resp = client.patch(
            f"/api/admin/orders/{order_id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "preparing"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "preparing"

        # Out for delivery
        resp = client.patch(
            f"/api/admin/orders/{order_id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "out_for_delivery"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "out_for_delivery"

        # Delivered
        resp = client.patch(
            f"/api/admin/orders/{order_id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "delivered"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "delivered"
        assert resp.json()["delivered_at"] is not None

    def test_invalid_status_transition(self, client, db):
        ensure_low_stock_setting(db)
        create_admin(db, email="admin@test.com", password="admin123")
        admin_token = get_admin_token(client)
        user = create_user(db, mobile="9876543210")
        token = get_customer_token(client, "9876543210")
        cat = create_category(db)
        create_product(db, slug="trans-prod", category_id=cat.id)
        addr = create_address(db, user.id)

        client.post(
            "/api/cart/items",
            headers={"Authorization": f"Bearer {token}"},
            json={"product_slug": "trans-prod", "quantity": 1},
        )
        resp = client.post(
            "/api/orders/checkout",
            headers={"Authorization": f"Bearer {token}"},
            json={"shipping_address_id": str(addr.id), "payment_method": "cod"},
        )
        order_id = resp.json()["order"]["id"]

        # Skip confirmed, go straight to preparing — should fail
        resp = client.patch(
            f"/api/admin/orders/{order_id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "preparing"},
        )
        assert resp.status_code == 400

    def test_cancel_before_confirm(self, client, db):
        ensure_low_stock_setting(db)
        user = create_user(db, mobile="9876543210")
        token = get_customer_token(client, "9876543210")
        cat = create_category(db)
        create_product(db, slug="cancel-prod", category_id=cat.id)
        addr = create_address(db, user.id)

        client.post(
            "/api/cart/items",
            headers={"Authorization": f"Bearer {token}"},
            json={"product_slug": "cancel-prod", "quantity": 1},
        )
        resp = client.post(
            "/api/orders/checkout",
            headers={"Authorization": f"Bearer {token}"},
            json={"shipping_address_id": str(addr.id), "payment_method": "cod"},
        )
        order_id = resp.json()["order"]["id"]

        resp = client.post(
            f"/api/orders/{order_id}/cancel",
            headers={"Authorization": f"Bearer {token}"},
            json={"reason": "Changed my mind"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "cancelled"
        assert resp.json()["cancelled_by"] == str(user.id)

    def test_cancel_after_confirm_restores_stock(self, client, db):

        ensure_low_stock_setting(db)
        create_admin(db, email="admin@test.com", password="admin123")
        admin_token = get_admin_token(client)

        user = create_user(db, mobile="9876543210")
        token = get_customer_token(client, "9876543210")
        cat = create_category(db)
        prod = create_product(
            db, slug="stock-restore-prod", category_id=cat.id, has_variants=True
        )
        variant = create_variant(db, prod.id, sku="SR-001", price=500, stock=3)
        addr = create_address(db, user.id)

        client.post(
            "/api/cart/items",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "product_slug": "stock-restore-prod",
                "variant_sku": "SR-001",
                "quantity": 1,
            },
        )
        resp = client.post(
            "/api/orders/checkout",
            headers={"Authorization": f"Bearer {token}"},
            json={"shipping_address_id": str(addr.id), "payment_method": "cod"},
        )
        order_id = resp.json()["order"]["id"]

        # Confirm — reduces stock from 3 to 2
        client.post(
            f"/api/admin/orders/{order_id}/confirm",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"delivery_fee": 0},
        )
        db.refresh(variant)
        assert variant.stock == 2

        # Cancel — restores stock from 2 to 3
        resp = client.post(
            f"/api/admin/orders/{order_id}/cancel",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"reason": "Customer cancelled"},
        )
        assert resp.status_code == 200
        db.refresh(variant)
        assert variant.stock == 3

    def test_cancel_after_out_for_delivery_rejected(self, client, db):
        ensure_low_stock_setting(db)
        create_admin(db, email="admin@test.com", password="admin123")
        admin_token = get_admin_token(client)
        user = create_user(db, mobile="9876543210")
        token = get_customer_token(client, "9876543210")
        cat = create_category(db)
        create_product(db, slug="shipped-prod", category_id=cat.id)
        addr = create_address(db, user.id)

        client.post(
            "/api/cart/items",
            headers={"Authorization": f"Bearer {token}"},
            json={"product_slug": "shipped-prod", "quantity": 1},
        )
        resp = client.post(
            "/api/orders/checkout",
            headers={"Authorization": f"Bearer {token}"},
            json={"shipping_address_id": str(addr.id), "payment_method": "cod"},
        )
        order_id = resp.json()["order"]["id"]

        for step in ["confirmed", "preparing", "out_for_delivery"]:
            client.patch(
                f"/api/admin/orders/{order_id}/status",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"status": step},
            )

        # Now try to cancel
        resp = client.post(
            f"/api/orders/{order_id}/cancel",
            headers={"Authorization": f"Bearer {token}"},
            json={"reason": "Too late"},
        )
        assert resp.status_code == 400


class TestStockConcurrency:
    def test_concurrent_confirms_respect_stock(self, client, db):
        from app.models import ProductVariant

        ensure_low_stock_setting(db)
        create_admin(db, email="admin@test.com", password="admin123")
        admin_token = get_admin_token(client)

        cat = create_category(db)
        prod = create_product(
            db, slug="concurrent-prod", category_id=cat.id, has_variants=True
        )
        variant = create_variant(db, prod.id, sku="CONC-001", price=500, stock=1)

        # Order 1
        user1 = create_user(db, mobile="1111111111")
        addr1 = create_address(db, user1.id)
        token1 = get_customer_token(client, "1111111111")
        client.post(
            "/api/cart/items",
            headers={"Authorization": f"Bearer {token1}"},
            json={
                "product_slug": "concurrent-prod",
                "variant_sku": "CONC-001",
                "quantity": 1,
            },
        )
        resp1 = client.post(
            "/api/orders/checkout",
            headers={"Authorization": f"Bearer {token1}"},
            json={"shipping_address_id": str(addr1.id), "payment_method": "cod"},
        )
        order1_id = resp1.json()["order"]["id"]

        # Order 2
        user2 = create_user(db, mobile="2222222222")
        addr2 = create_address(db, user2.id)
        token2 = get_customer_token(client, "2222222222")
        client.post(
            "/api/cart/items",
            headers={"Authorization": f"Bearer {token2}"},
            json={
                "product_slug": "concurrent-prod",
                "variant_sku": "CONC-001",
                "quantity": 1,
            },
        )
        resp2 = client.post(
            "/api/orders/checkout",
            headers={"Authorization": f"Bearer {token2}"},
            json={"shipping_address_id": str(addr2.id), "payment_method": "cod"},
        )
        order2_id = resp2.json()["order"]["id"]

        # Confirm order 1 — should succeed
        client.post(
            f"/api/admin/orders/{order1_id}/confirm",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"delivery_fee": 0},
        )
        v1 = db.get(ProductVariant, variant.id)
        db.refresh(v1)
        assert v1.stock == 0

        # Confirm order 2 — stock is 0, should not reduce further (stays at 0)
        resp = client.post(
            f"/api/admin/orders/{order2_id}/confirm",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"delivery_fee": 0},
        )
        assert resp.status_code == 200
        v2 = db.get(ProductVariant, variant.id)
        db.refresh(v2)
        assert v2.stock == 0

    def test_inventory_movement_logged(self, client, db):
        from sqlalchemy import select

        from app.models import InventoryMovement

        ensure_low_stock_setting(db)
        create_admin(db, email="admin@test.com", password="admin123")
        admin_token = get_admin_token(client)

        user = create_user(db, mobile="9876543210")
        token = get_customer_token(client, "9876543210")
        cat = create_category(db)
        prod = create_product(
            db, slug="movement-prod", category_id=cat.id, has_variants=True
        )
        variant = create_variant(db, prod.id, sku="MV-001", price=500, stock=5)
        addr = create_address(db, user.id)

        client.post(
            "/api/cart/items",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "product_slug": "movement-prod",
                "variant_sku": "MV-001",
                "quantity": 2,
            },
        )
        resp = client.post(
            "/api/orders/checkout",
            headers={"Authorization": f"Bearer {token}"},
            json={"shipping_address_id": str(addr.id), "payment_method": "cod"},
        )
        order_id = resp.json()["order"]["id"]

        client.post(
            f"/api/admin/orders/{order_id}/confirm",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"delivery_fee": 0},
        )

        db.expire_all()
        movements = db.scalars(
            select(InventoryMovement).where(InventoryMovement.variant_id == variant.id)
        ).all()
        assert len(movements) == 1
        assert movements[0].quantity_change == -2
        assert movements[0].running_balance == 3
