from datetime import UTC

from app.tests.conftest import (
    create_category,
    create_product,
    create_variant,
    ensure_low_stock_setting,
)


class TestCatalogue:
    def test_list_categories(self, client, db):
        create_category(db, name="Outdoor", slug="outdoor")
        create_category(db, name="Indoor", slug="indoor")
        resp = client.get("/api/catalogue/categories")
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_list_products(self, client, db):
        ensure_low_stock_setting(db)
        cat = create_category(db)
        create_product(db, slug="p1", category_id=cat.id, name="Product 1")
        create_product(db, slug="p2", category_id=cat.id, name="Product 2")
        resp = client.get("/api/catalogue/products")
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_list_products_featured_only(self, client, db):
        ensure_low_stock_setting(db)
        cat = create_category(db)
        create_product(db, slug="p1", category_id=cat.id, is_featured=True)
        create_product(db, slug="p2", category_id=cat.id, is_featured=False)
        resp = client.get("/api/catalogue/products?featured=true")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_product_detail_without_variants(self, client, db):
        ensure_low_stock_setting(db)
        cat = create_category(db)
        create_product(db, slug="simple", category_id=cat.id, base_price=1000)
        resp = client.get("/api/catalogue/products/simple")
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Test Product"
        assert data["has_variants"] is False
        assert data["base_price"] == 1000
        assert data["effective_price"] == 1000
        assert data["discount_amount"] == 0
        assert data["variants"] == []

    def test_product_detail_with_variants(self, client, db):
        ensure_low_stock_setting(db)
        cat = create_category(db)
        prod = create_product(
            db,
            slug="variant-prod",
            category_id=cat.id,
            has_variants=True,
            base_price=None,
        )
        create_variant(db, prod.id, sku="V1", price=1000, stock=10)
        create_variant(db, prod.id, sku="V2", price=1500, stock=0)
        resp = client.get("/api/catalogue/products/variant-prod")
        assert resp.status_code == 200
        data = resp.json()
        assert data["has_variants"] is True
        assert len(data["variants"]) == 2
        assert data["variants"][0]["sku"] == "V1"
        assert data["variants"][0]["availability"] == "in_stock"
        assert data["variants"][1]["availability"] == "out_of_stock"

    def test_price_with_discount(self, client, db):
        ensure_low_stock_setting(db)
        cat = create_category(db)
        create_product(
            db,
            slug="discounted",
            category_id=cat.id,
            base_price=1000,
            discount_percent=10.0,
        )
        resp = client.get("/api/catalogue/products/discounted")
        assert resp.status_code == 200
        data = resp.json()
        assert data["effective_price"] == 900
        assert data["discount_amount"] == 100

    def test_price_with_promotion(self, client, db):
        from datetime import datetime, timedelta

        from app.models import Promotion, PromotionProduct

        ensure_low_stock_setting(db)
        cat = create_category(db)
        prod = create_product(
            db,
            slug="promo-prod",
            category_id=cat.id,
            base_price=1000,
            discount_percent=10.0,
        )
        now = datetime.now(UTC).replace(tzinfo=None)
        promo = Promotion(
            code="SAVE20",
            name="20% off",
            discount_type="percent",
            discount_value=20.0,
            starts_at=now - timedelta(hours=1),
            ends_at=now + timedelta(hours=1),
            is_active=True,
        )
        db.add(promo)
        db.flush()
        db.add(PromotionProduct(promotion_id=promo.id, product_id=prod.id))
        db.flush()

        resp = client.get("/api/catalogue/products/promo-prod")
        assert resp.status_code == 200
        data = resp.json()
        assert data["effective_price"] == 720  # 1000 * 0.9 * 0.8 = 720
        assert data["promotion"]["name"] == "20% off"
