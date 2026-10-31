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


class TestReviews:
    def test_review_requires_delivered_order(self, client, db):
        ensure_low_stock_setting(db)
        create_admin(db, email="admin@test.com", password="admin123")
        admin_token = get_admin_token(client)

        user = create_user(db, mobile="9876543210")
        token = get_customer_token(client, "9876543210")
        cat = create_category(db)
        prod = create_product(db, slug="review-prod", category_id=cat.id)
        create_variant(db, prod.id, sku="R-001", price=500, stock=5)
        addr = create_address(db, user.id)

        # Add to cart, checkout, confirm, deliver
        client.post(
            "/api/cart/items",
            headers={"Authorization": f"Bearer {token}"},
            json={"product_slug": "review-prod", "variant_sku": "R-001", "quantity": 1},
        )
        checkout_resp = client.post(
            "/api/orders/checkout",
            headers={"Authorization": f"Bearer {token}"},
            json={"shipping_address_id": str(addr.id), "payment_method": "cod"},
        )
        order_id = checkout_resp.json()["order"]["id"]
        order_item_id = checkout_resp.json()["order"]["items"][0]["id"]

        # Try to review before delivered — should fail
        resp = client.post(
            "/api/reviews/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "product_id": str(prod.id),
                "order_item_id": str(order_item_id),
                "rating": 5,
                "comment": "Great product!",
            },
        )
        assert resp.status_code == 400

        # Deliver the order
        client.post(
            f"/api/admin/orders/{order_id}/confirm",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"delivery_fee": 0},
        )
        client.patch(
            f"/api/admin/orders/{order_id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "preparing"},
        )
        client.patch(
            f"/api/admin/orders/{order_id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "out_for_delivery"},
        )
        client.patch(
            f"/api/admin/orders/{order_id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "delivered"},
        )

        # Now review should work
        resp = client.post(
            "/api/reviews/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "product_id": str(prod.id),
                "order_item_id": str(order_item_id),
                "rating": 5,
                "title": "Amazing",
                "comment": "Loved it!",
            },
        )
        assert resp.status_code == 200
        assert resp.json()["rating"] == 5
        assert resp.json()["status"] == "pending"

    def test_duplicate_review_prevented(self, client, db):
        ensure_low_stock_setting(db)
        create_admin(db, email="admin@test.com", password="admin123")
        admin_token = get_admin_token(client)

        user = create_user(db, mobile="9876543210")
        token = get_customer_token(client, "9876543210")
        cat = create_category(db)
        prod = create_product(db, slug="dup-review-prod", category_id=cat.id)
        create_variant(db, prod.id, sku="DUP-001", price=500, stock=5)
        addr = create_address(db, user.id)

        client.post(
            "/api/cart/items",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "product_slug": "dup-review-prod",
                "variant_sku": "DUP-001",
                "quantity": 1,
            },
        )
        checkout_resp = client.post(
            "/api/orders/checkout",
            headers={"Authorization": f"Bearer {token}"},
            json={"shipping_address_id": str(addr.id), "payment_method": "cod"},
        )
        order_id = checkout_resp.json()["order"]["id"]
        order_item_id = checkout_resp.json()["order"]["items"][0]["id"]

        # Deliver
        client.post(
            f"/api/admin/orders/{order_id}/confirm",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"delivery_fee": 0},
        )
        for status in ["preparing", "out_for_delivery", "delivered"]:
            client.patch(
                f"/api/admin/orders/{order_id}/status",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"status": status},
            )

        # First review
        resp = client.post(
            "/api/reviews/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "product_id": str(prod.id),
                "order_item_id": str(order_item_id),
                "rating": 5,
                "comment": "First review",
            },
        )
        assert resp.status_code == 200

        # Second review — should fail
        resp = client.post(
            "/api/reviews/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "product_id": str(prod.id),
                "order_item_id": str(order_item_id),
                "rating": 4,
                "comment": "Second review",
            },
        )
        assert resp.status_code == 409

    def test_admin_approve_review(self, client, db):
        ensure_low_stock_setting(db)
        create_admin(db, email="admin@test.com", password="admin123")
        admin_token = get_admin_token(client)

        user = create_user(db, mobile="9876543210")
        token = get_customer_token(client, "9876543210")
        cat = create_category(db)
        prod = create_product(db, slug="approve-prod", category_id=cat.id)
        create_variant(db, prod.id, sku="APP-001", price=500, stock=5)
        addr = create_address(db, user.id)

        client.post(
            "/api/cart/items",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "product_slug": "approve-prod",
                "variant_sku": "APP-001",
                "quantity": 1,
            },
        )
        checkout_resp = client.post(
            "/api/orders/checkout",
            headers={"Authorization": f"Bearer {token}"},
            json={"shipping_address_id": str(addr.id), "payment_method": "cod"},
        )
        order_id = checkout_resp.json()["order"]["id"]
        order_item_id = checkout_resp.json()["order"]["items"][0]["id"]

        # Deliver
        client.post(
            f"/api/admin/orders/{order_id}/confirm",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"delivery_fee": 0},
        )
        for status in ["preparing", "out_for_delivery", "delivered"]:
            client.patch(
                f"/api/admin/orders/{order_id}/status",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"status": status},
            )

        # Create review
        client.post(
            "/api/reviews/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "product_id": str(prod.id),
                "order_item_id": str(order_item_id),
                "rating": 5,
                "comment": "Great!",
            },
        )

        # List pending reviews (admin)
        resp = client.get(
            "/api/reviews/pending",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 1
        review_id = resp.json()[0]["id"]

        # Approve review
        resp = client.patch(
            f"/api/reviews/{review_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "approved"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "approved"

        # Public should now see the review
        resp = client.get(f"/api/reviews/product/{prod.id!s}")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_list_product_reviews_approved_only(self, client, db):
        from uuid import UUID

        from app.models import Review
        from app.models.enums import ReviewStatus

        ensure_low_stock_setting(db)
        create_admin(db, email="admin@test.com", password="admin123")
        admin_token = get_admin_token(client)

        user1 = create_user(db, mobile="9876543210")
        token1 = get_customer_token(client, "9876543210")
        user2 = create_user(db, mobile="8888888888")
        token2 = get_customer_token(client, "8888888888")
        cat = create_category(db)
        prod = create_product(db, slug="filter-prod", category_id=cat.id)
        addr1 = create_address(db, user1.id)
        addr2 = create_address(db, user2.id, is_default=False)

        # Create order items via checkout so reviews can reference them
        create_variant(db, prod.id, sku="F-001", price=500, stock=5)
        client.post(
            "/api/cart/items",
            headers={"Authorization": f"Bearer {token1}"},
            json={"product_slug": "filter-prod", "variant_sku": "F-001", "quantity": 1},
        )
        checkout_resp = client.post(
            "/api/orders/checkout",
            headers={"Authorization": f"Bearer {token1}"},
            json={"shipping_address_id": str(addr1.id), "payment_method": "cod"},
        )
        order_item_id_1 = UUID(checkout_resp.json()["order"]["items"][0]["id"])

        client.post(
            "/api/cart/items",
            headers={"Authorization": f"Bearer {token2}"},
            json={"product_slug": "filter-prod", "variant_sku": "F-001", "quantity": 1},
        )
        checkout_resp2 = client.post(
            "/api/orders/checkout",
            headers={"Authorization": f"Bearer {token2}"},
            json={"shipping_address_id": str(addr2.id), "payment_method": "cod"},
        )
        order_item_id_2 = UUID(checkout_resp2.json()["order"]["items"][0]["id"])
        order2_id = checkout_resp2.json()["order"]["id"]

        # Deliver both orders
        client.post(
            f"/api/admin/orders/{checkout_resp.json()['order']['id']}/confirm",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"delivery_fee": 0},
        )
        for status in ["preparing", "out_for_delivery", "delivered"]:
            client.patch(
                f"/api/admin/orders/{checkout_resp.json()['order']['id']}/status",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"status": status},
            )

        client.post(
            f"/api/admin/orders/{order2_id}/confirm",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"delivery_fee": 0},
        )
        for status in ["preparing", "out_for_delivery", "delivered"]:
            client.patch(
                f"/api/admin/orders/{order2_id}/status",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"status": status},
            )

        # Create reviews directly — one approved, one pending
        review1 = Review(
            user_id=user1.id,
            product_id=prod.id,
            order_item_id=order_item_id_1,
            rating=5,
            comment="Approved review",
            status=ReviewStatus.approved,
        )
        db.add(review1)
        review2 = Review(
            user_id=user2.id,
            product_id=prod.id,
            order_item_id=order_item_id_2,
            rating=3,
            comment="Pending review",
            status=ReviewStatus.pending,
        )
        db.add(review2)
        db.flush()

        resp = client.get(f"/api/reviews/product/{prod.id!s}")
        assert resp.status_code == 200
        assert len(resp.json()) == 1
        assert resp.json()[0]["status"] == "approved"
