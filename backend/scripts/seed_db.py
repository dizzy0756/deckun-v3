"""Seed script for Deckun: categories, settings, sample admin, products with
variants, and PIN codes.

Usage (from backend/):

    PYTHONPATH=. python scripts/seed_db.py

Idempotent: re-running skips rows that already exist (matched on unique keys).
"""

import bcrypt
from sqlalchemy import select

from app.core.config import settings
from app.core.database import SessionLocal
from app.models import (
    AdminUser,
    Category,
    Product,
    ProductImage,
    ProductSpecification,
    ProductVariant,
    ServiceablePincode,
    Setting,
)

SAMPLE_CATEGORIES = [
    {"name": "Outdoor", "slug": "outdoor", "sort_order": 0},
    {"name": "Furniture", "slug": "furniture", "sort_order": 1},
    {"name": "Storage", "slug": "storage", "sort_order": 2},
]

SAMPLE_SETTINGS = [
    {
        "setting_key": "low_stock_threshold",
        "setting_value": "3",
        "data_type": "integer",
        "description": "Alert when variant stock falls to or below this value",
    },
]

SAMPLE_ADMIN = {
    "email": "admin@deckun.in",
    "password_hash": bcrypt.hashpw(b"ChangeMe123!", bcrypt.gensalt()).decode("utf-8"),
    "full_name": "Deckun Admin",
}

SAMPLE_PINCODES = [
    {"pincode": "560001", "city": "Bangalore", "state": "Karnataka"},
    {"pincode": "560002", "city": "Bangalore", "state": "Karnataka"},
    {"pincode": "700001", "city": "Kolkata", "state": "West Bengal"},
    {"pincode": "110001", "city": "Delhi", "state": "Delhi"},
    {"pincode": "400001", "city": "Mumbai", "state": "Maharashtra"},
    {"pincode": "600001", "city": "Chennai", "state": "Tamil Nadu"},
    {"pincode": "500001", "city": "Hyderabad", "state": "Telangana"},
    {"pincode": "600003", "city": "Coimbatore", "state": "Tamil Nadu"},
    {"pincode": "700002", "city": "Kolkata", "state": "West Bengal"},
    {"pincode": "560003", "city": "Bangalore", "state": "Karnataka"},
]

SAMPLE_PRODUCTS = [
    {
        "name": "Alpine Pro Tent",
        "slug": "alpine-pro-tent",
        "category": "outdoor",
        "description": "A lightweight 3-season tent for alpine camping, sleeps 2 adults.",
        "has_variants": True,
        "discount_percent": 10.00,
        "is_featured": True,
        "meta_title": "Alpine Pro Tent - 3-Season, 2-Person",
        "meta_description": "Lightweight 3-season tent for alpine camping. Sleeps 2 adults.",
        "variants": [
            {"sku": "ALP-PRO-TENT-2P-GRN", "name": "2-Person / Forest Green", "price": 14999, "stock": 12},
            {"sku": "ALP-PRO-TENT-3P-GRN", "name": "3-Person / Forest Green", "price": 18999, "stock": 5},
            {"sku": "ALP-PRO-TENT-2P-BLK", "name": "2-Person / Midnight Black", "price": 14999, "stock": 0},
        ],
        "images": [
            {"url": "https://images.unsplash.com/photo-1", "storage_key": "placeholder-tent-1", "sort_order": 0, "alt_text": "Tent pitched on a mountain slope"},
            {"url": "https://images.unsplash.com/photo-2", "storage_key": "placeholder-tent-2", "sort_order": 1, "alt_text": "Interior view of the tent"},
        ],
        "specifications": [
            {"field_label": "Capacity", "field_value": "2-3 persons"},
            {"field_label": "Season", "field_value": "3-season"},
            {"field_label": "Weight", "field_value": "2.8 kg"},
            {"field_label": "Material", "field_value": "Aluminum frame, polyester fabric"},
        ],
    },
    {
        "name": "Summit Trekking Poles",
        "slug": "summit-trekking-poles",
        "category": "outdoor",
        "description": "Adjustable carbon-fiber trekking poles with anti-shock absorption.",
        "has_variants": False,
        "base_price": 5499,
        "discount_percent": 0.00,
        "is_featured": True,
        "meta_title": "Summit Trekking Poles - Carbon Fiber",
        "meta_description": "Adjustable carbon-fiber trekking poles with anti-shock absorption.",
        "variants": [],
        "images": [
            {"url": "https://images.unsplash.com/photo-3", "storage_key": "placeholder-poles-1", "sort_order": 0, "alt_text": "Carbon fiber trekking poles"},
        ],
        "specifications": [
            {"field_label": "Material", "field_value": "Carbon fiber"},
            {"field_label": "Adjustable", "field_value": "Yes, 90-140 cm"},
            {"field_label": "Weight", "field_value": "520 g per pair"},
        ],
    },
    {
        "name": "Foldable Camping Table",
        "slug": "foldable-camping-table",
        "category": "furniture",
        "description": "Anodized aluminum frame with a weather-resistant tabletop. Folds for easy transport.",
        "has_variants": False,
        "base_price": 3999,
        "discount_percent": 15.00,
        "is_featured": False,
        "meta_title": "Foldable Camping Table - Aluminum",
        "meta_description": "Anodized aluminum camping table that folds for easy transport.",
        "variants": [],
        "images": [
            {"url": "https://images.unsplash.com/photo-4", "storage_key": "placeholder-table-1", "sort_order": 0, "alt_text": "Foldable camping table"},
        ],
        "specifications": [
            {"field_label": "Dimensions", "field_value": "70 x 110 cm (unfolded)"},
            {"field_label": "Weight", "field_value": "4.2 kg"},
            {"field_label": "Material", "field_value": "Aluminum frame, polypropylene top"},
        ],
    },
    {
        "name": "Weatherproof Backpack 50L",
        "slug": "weatherproof-backpack-50l",
        "category": "storage",
        "description": "50-liter weatherproof backpack with multiple compartments and rain cover.",
        "has_variants": True,
        "discount_percent": 0.00,
        "is_featured": False,
        "meta_title": "Weatherproof Backpack 50L",
        "meta_description": "50-liter weatherproof backpack with multiple compartments.",
        "variants": [
            {"sku": "BP-50L-NAVY", "name": "Navy", "price": 7999, "stock": 20},
            {"sku": "BP-50L-TAN", "name": "Tan", "price": 7999, "stock": 3},
            {"sku": "BP-50L-ODG", "name": "Olive Drab", "price": 7999, "stock": 8},
        ],
        "images": [
            {"url": "https://images.unsplash.com/photo-5", "storage_key": "placeholder-backpack-1", "sort_order": 0, "alt_text": "Weatherproof backpack"},
            {"url": "https://images.unsplash.com/photo-6", "storage_key": "placeholder-backpack-2", "sort_order": 1, "alt_text": "Backpack compartments"},
        ],
        "specifications": [
            {"field_label": "Capacity", "field_value": "50 L"},
            {"field_label": "Waterproof", "field_value": "Yes (IP65)"},
            {"field_label": "Material", "field_value": "1000D Cordura"},
        ],
    },
    {
        "name": "Portable Camping Stove",
        "slug": "portable-camping-stove",
        "category": "outdoor",
        "description": "Compact alcohol stove that boils 1 liter of water in under 4 minutes.",
        "has_variants": False,
        "base_price": 1299,
        "discount_percent": 5.00,
        "is_featured": True,
        "meta_title": "Portable Camping Stove - Alcohol",
        "meta_description": "Compact alcohol camping stove, boils 1 L in under 4 minutes.",
        "variants": [],
        "images": [
            {"url": "https://images.unsplash.com/photo-7", "storage_key": "placeholder-stove-1", "sort_order": 0, "alt_text": "Portable camping stove"},
        ],
        "specifications": [
            {"field_label": "Fuel", "field_value": "Denatured alcohol"},
            {"field_label": "Boil Time", "field_value": "3.5 min (1 L water)"},
            {"field_label": "Weight", "field_value": "240 g"},
        ],
    },
]


def seed_categories(db: SessionLocal) -> dict[str, Category]:
    cats: dict[str, Category] = {}
    for row in SAMPLE_CATEGORIES:
        existing = db.execute(
            select(Category).where(Category.slug == row["slug"])
        ).scalar_one_or_none()
        if existing:
            cats[row["slug"]] = existing
            continue
        cat = Category(**row)
        db.add(cat)
        db.flush()
        cats[row["slug"]] = cat
    return cats


def seed_settings(db: SessionLocal) -> None:
    for row in SAMPLE_SETTINGS:
        existing = db.execute(
            select(Setting).where(Setting.setting_key == row["setting_key"])
        ).scalar_one_or_none()
        if existing:
            existing.setting_value = row["setting_value"]
            existing.data_type = row["data_type"]
            existing.description = row["description"]
            continue
        db.add(Setting(**row))
        db.flush()


def seed_admin(db: SessionLocal) -> None:
    existing = db.execute(
        select(AdminUser).where(AdminUser.email == SAMPLE_ADMIN["email"])
    ).scalar_one_or_none()
    if existing:
        return
    db.add(AdminUser(**SAMPLE_ADMIN))
    db.flush()


def seed_pincodes(db: SessionLocal) -> None:
    for row in SAMPLE_PINCODES:
        existing = db.execute(
            select(ServiceablePincode).where(
                ServiceablePincode.pincode == row["pincode"]
            )
        ).scalar_one_or_none()
        if existing:
            continue
        db.add(ServiceablePincode(**row))
        db.flush()


def seed_products(db: SessionLocal, cats: dict[str, Category]) -> None:
    for prod_data in SAMPLE_PRODUCTS:
        existing = db.execute(
            select(Product).where(Product.slug == prod_data["slug"])
        ).scalar_one_or_none()
        if existing:
            continue
        category = cats.get(prod_data["category"])
        if category is None:
            raise ValueError(f"Unknown category slug: {prod_data['category']}")
        prod = Product(
            category_id=category.id,
            name=prod_data["name"],
            slug=prod_data["slug"],
            description=prod_data["description"],
            has_variants=prod_data["has_variants"],
            discount_percent=prod_data["discount_percent"],
            is_featured=prod_data["is_featured"],
            meta_title=prod_data.get("meta_title"),
            meta_description=prod_data.get("meta_description"),
        )
        if not prod_data["has_variants"]:
            prod.base_price = prod_data["base_price"]
        db.add(prod)
        db.flush()

        for v in prod_data["variants"]:
            db.add(ProductVariant(
                product_id=prod.id,
                sku=v["sku"],
                name=v["name"],
                price=v["price"],
                stock=v["stock"],
            ))
            db.flush()

        for img in prod_data["images"]:
            db.add(ProductImage(
                product_id=prod.id,
                url=img["url"],
                storage_key=img["storage_key"],
                sort_order=img["sort_order"],
                alt_text=img["alt_text"],
            ))
            db.flush()

        for spec in prod_data["specifications"]:
            db.add(ProductSpecification(
                product_id=prod.id,
                field_label=spec["field_label"],
                field_value=spec["field_value"],
            ))
            db.flush()


def main() -> None:
    print(f"DATABASE_URL: {settings.DATABASE_URL}")
    db = SessionLocal()
    try:
        cats = seed_categories(db)
        seed_settings(db)
        seed_admin(db)
        seed_pincodes(db)
        seed_products(db, cats)
        db.commit()
        print("Seed complete:")
        print(f"  Categories: {len(db.execute(select(Category)).scalars().all())} rows")
        print(f"  Admins:     {len(db.execute(select(AdminUser)).scalars().all())} rows")
        print(f"  Products:   {len(db.execute(select(Product)).scalars().all())} rows")
        print(f"  Variants:   {len(db.execute(select(ProductVariant)).scalars().all())} rows")
        print(f"  PIN codes:  {len(db.execute(select(ServiceablePincode)).scalars().all())} rows")
        print(f"  Settings:   {len(db.execute(select(Setting)).scalars().all())} rows")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
