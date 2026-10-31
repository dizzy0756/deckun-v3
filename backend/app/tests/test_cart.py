from app.tests.conftest import (
    create_product,
    create_user,
    ensure_low_stock_setting,
    get_customer_token,
)


class TestCart:
    def test_get_empty_cart(self, client, db):
        create_user(db, mobile="9876543210")
        token = get_customer_token(client, "9876543210")
        resp = client.get("/api/cart/", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.json()["items"] == []
        assert resp.json()["subtotal"] == 0
        assert resp.json()["item_count"] == 0

    def test_add_to_cart(self, client, db):
        ensure_low_stock_setting(db)
        create_user(db, mobile="9876543210")
        token = get_customer_token(client, "9876543210")
        from app.tests.conftest import create_category

        cat = create_category(db)
        create_product(db, slug="cart-prod", category_id=cat.id)
        resp = client.post(
            "/api/cart/items",
            headers={"Authorization": f"Bearer {token}"},
            json={"product_slug": "cart-prod", "quantity": 2},
        )
        assert resp.status_code == 200
        cart = resp.json()
        assert len(cart["items"]) == 1
        assert cart["items"][0]["quantity"] == 2
        assert cart["item_count"] == 2

    def test_add_item_merges_quantity(self, client, db):
        ensure_low_stock_setting(db)
        create_user(db, mobile="9876543210")
        token = get_customer_token(client, "9876543210")
        from app.tests.conftest import create_category

        cat = create_category(db)
        create_product(db, slug="merge-prod", category_id=cat.id)
        client.post(
            "/api/cart/items",
            headers={"Authorization": f"Bearer {token}"},
            json={"product_slug": "merge-prod", "quantity": 2},
        )
        resp = client.post(
            "/api/cart/items",
            headers={"Authorization": f"Bearer {token}"},
            json={"product_slug": "merge-prod", "quantity": 3},
        )
        assert resp.status_code == 200
        assert resp.json()["items"][0]["quantity"] == 5

    def test_update_item_quantity(self, client, db):
        ensure_low_stock_setting(db)
        create_user(db, mobile="9876543210")
        token = get_customer_token(client, "9876543210")
        from app.tests.conftest import create_category

        cat = create_category(db)
        create_product(db, slug="update-prod", category_id=cat.id)
        add_resp = client.post(
            "/api/cart/items",
            headers={"Authorization": f"Bearer {token}"},
            json={"product_slug": "update-prod", "quantity": 1},
        )
        item_id = add_resp.json()["items"][0]["id"]
        resp = client.put(
            f"/api/cart/items/{item_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"quantity": 5},
        )
        assert resp.status_code == 200
        assert resp.json()["items"][0]["quantity"] == 5

    def test_remove_item(self, client, db):
        ensure_low_stock_setting(db)
        create_user(db, mobile="9876543210")
        token = get_customer_token(client, "9876543210")
        from app.tests.conftest import create_category

        cat = create_category(db)
        create_product(db, slug="remove-prod", category_id=cat.id)
        add_resp = client.post(
            "/api/cart/items",
            headers={"Authorization": f"Bearer {token}"},
            json={"product_slug": "remove-prod", "quantity": 1},
        )
        item_id = add_resp.json()["items"][0]["id"]
        resp = client.delete(
            f"/api/cart/items/{item_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        cart_resp = client.get(
            "/api/cart/", headers={"Authorization": f"Bearer {token}"}
        )
        assert len(cart_resp.json()["items"]) == 0

    def test_add_unavailable_product(self, client, db):
        ensure_low_stock_setting(db)
        create_user(db, mobile="9876543210")
        token = get_customer_token(client, "9876543210")
        resp = client.post(
            "/api/cart/items",
            headers={"Authorization": f"Bearer {token}"},
            json={"product_slug": "nonexistent", "quantity": 1},
        )
        assert resp.status_code == 404

    def test_cart_total_matches_price_calc(self, client, db):
        ensure_low_stock_setting(db)
        create_user(db, mobile="9876543210")
        token = get_customer_token(client, "9876543210")
        from app.tests.conftest import create_category

        cat = create_category(db)
        create_product(
            db,
            slug="price-prod",
            category_id=cat.id,
            base_price=1000,
            discount_percent=10.0,
        )
        resp = client.post(
            "/api/cart/items",
            headers={"Authorization": f"Bearer {token}"},
            json={"product_slug": "price-prod", "quantity": 2},
        )
        assert resp.status_code == 200
        cart = resp.json()
        item = cart["items"][0]
        assert item["unit_price"] == 1000
        assert item["total_price"] == 1800  # 900 per unit * 2
