from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Category,
    Product,
    ProductImage,
    ProductSpecification,
    ProductVariant,
    Promotion,
    PromotionProduct,
    Setting,
)
from app.models.enums import ProductStatus
from app.schemas import (
    Availability,
    CategoryRead,
    ProductDetailRead,
    ProductImageRead,
    ProductPromotionOut,
    ProductRead,
    ProductSpecRead,
    VariantAvailabilityRead,
)
from app.services.pricing import PriceCalculator


class CatalogueService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_categories(self) -> list[CategoryRead]:
        categories = self.db.scalars(
            select(Category)
            .where(Category.is_active.is_(True))
            .order_by(Category.sort_order, Category.name)
        ).all()
        return [CategoryRead.model_validate(c) for c in categories]

    def get_product_by_id(self, product_id: UUID) -> Product | None:
        return self.db.get(Product, product_id)

    def get_product_for_cart(
        self, product_slug: str, variant_sku: str | None = None
    ) -> tuple[Product, ProductVariant | None]:
        product = self.db.scalar(
            select(Product).where(
                Product.slug == product_slug, Product.status == ProductStatus.active
            )
        )
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        variant: ProductVariant | None = None
        if product.has_variants:
            if not variant_sku:
                raise HTTPException(
                    status_code=400, detail="Variant SKU required for this product"
                )
            variant = self.db.scalar(
                select(ProductVariant).where(
                    ProductVariant.product_id == product.id,
                    ProductVariant.sku == variant_sku,
                    ProductVariant.is_active.is_(True),
                )
            )
            if not variant:
                raise HTTPException(status_code=404, detail="Variant not found")

        return product, variant

    def _get_low_stock_threshold(self) -> int:
        setting = self.db.scalar(
            select(Setting).where(Setting.setting_key == "low_stock_threshold")
        )
        if setting:
            return int(setting.setting_value)
        return 3

    def _compute_variant_availability(self, variant: ProductVariant) -> Availability:
        threshold = self._get_low_stock_threshold()
        if variant.stock <= 0:
            return Availability.out_of_stock
        if variant.stock <= threshold:
            return Availability.low_stock
        return Availability.in_stock

    def _compute_product_availability(
        self, product: Product, variants: list[ProductVariant]
    ) -> Availability:
        if not product.has_variants or not variants:
            return Availability.in_stock
        threshold = self._get_low_stock_threshold()
        max_stock = max(v.stock for v in variants if v.is_active)
        if max_stock <= 0:
            return Availability.out_of_stock
        if max_stock <= threshold:
            return Availability.low_stock
        return Availability.in_stock

    def _get_active_promotion(self, product_id: UUID) -> Promotion | None:
        now = datetime.now(UTC).replace(tzinfo=None)
        promo = self.db.scalar(
            select(Promotion)
            .join(
                PromotionProduct,
                PromotionProduct.promotion_id == Promotion.id,
            )
            .where(
                PromotionProduct.product_id == product_id,
                Promotion.is_active.is_(True),
                Promotion.starts_at <= now,
                Promotion.ends_at >= now,
            )
            .order_by(Promotion.starts_at.desc())
        )
        return promo

    def list_products(
        self,
        category_slug: str | None = None,
        featured_only: bool = False,
        skip: int = 0,
        limit: int = 50,
        base_url: str | None = None,
    ) -> list[ProductRead]:
        stmt = (
            select(Product, Category)
            .join(Category, Product.category_id == Category.id)
            .where(Product.status == ProductStatus.active)
        )
        if category_slug:
            stmt = stmt.where(Category.slug == category_slug)
        if featured_only:
            stmt = stmt.where(Product.is_featured.is_(True))
        stmt = stmt.offset(skip).limit(limit)

        results = self.db.execute(stmt).all()
        products: list[ProductRead] = []
        for product, category in results:
            variants = self.db.scalars(
                select(ProductVariant).where(
                    ProductVariant.product_id == product.id,
                    ProductVariant.is_active.is_(True),
                )
            ).all()
            primary_image = self.db.scalar(
                select(ProductImage.url)
                .where(
                    ProductImage.product_id == product.id,
                    ProductImage.is_active.is_(True),
                )
                .order_by(ProductImage.sort_order)
                .limit(1)
            )
            if primary_image and primary_image.startswith('/') and base_url:
                primary_image = base_url.rstrip('/') + primary_image
            availability = self._compute_product_availability(product, variants)
            products.append(
                ProductRead(
                    id=product.id,
                    slug=product.slug,
                    name=product.name,
                    description=product.description,
                    base_price=product.base_price,
                    discount_percent=float(product.discount_percent),
                    is_featured=product.is_featured,
                    category_id=product.category_id,
                    category_name=category.name,
                    primary_image_url=primary_image,
                    availability=availability,
                    has_variants=product.has_variants,
                )
            )
        return products

    def get_product_by_slug(self, slug: str, base_url: str | None = None) -> ProductDetailRead:
        product = self.db.scalar(
            select(Product).where(
                Product.slug == slug, Product.status == ProductStatus.active
            )
        )
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        category = self.db.get(Category, product.category_id)
        images = self.db.scalars(
            select(ProductImage)
            .where(
                ProductImage.product_id == product.id,
                ProductImage.is_active.is_(True),
            )
            .order_by(ProductImage.sort_order)
        ).all()
        # Resolve relative image URLs to full URLs
        resolved_images = []
        for img in images:
            img_url = img.url
            if img_url and img_url.startswith('/') and base_url:
                img_url = base_url.rstrip('/') + img_url
            resolved_images.append(ProductImageRead.model_validate(img).model_copy(update={"url": img_url}))
        specs = self.db.scalars(
            select(ProductSpecification)
            .where(ProductSpecification.product_id == product.id)
        ).all()
        variants = self.db.scalars(
            select(ProductVariant).where(
                ProductVariant.product_id == product.id,
                ProductVariant.is_active.is_(True),
            )
        ).all()

        base_price = product.base_price if not product.has_variants else None
        variant_reads = [
            VariantAvailabilityRead(
                id=v.id,
                sku=v.sku,
                name=v.name,
                price=v.price,
                availability=self._compute_variant_availability(v),
            )
            for v in variants
        ]

        promo = self._get_active_promotion(product.id)
        promo_out = ProductPromotionOut.model_validate(promo) if promo else None

        effective_price: int | None = None
        discount_amount = 0
        if base_price is not None:
            breakdown = PriceCalculator.compute_line_item(
                base_price,
                float(product.discount_percent),
                1,
                promo,
            )
            effective_price = breakdown.total_price
            discount_amount = breakdown.discount_amount

        # Resolve primary_image_url from images list
        primary_image_url = None
        if resolved_images:
            primary_image_url = resolved_images[0].url

        return ProductDetailRead(
            id=product.id,
            slug=product.slug,
            name=product.name,
            description=product.description,
            base_price=base_price,
            discount_percent=float(product.discount_percent),
            is_featured=product.is_featured,
            has_variants=product.has_variants,
            category_id=product.category_id,
            category_name=category.name if category else "Unknown",
            meta_title=product.meta_title,
            meta_description=product.meta_description,
            images=resolved_images,
            specifications=[ProductSpecRead.model_validate(spec) for spec in specs],
            variants=variant_reads,
            effective_price=effective_price,
            discount_amount=discount_amount,
            promotion=promo_out,
            primary_image_url=primary_image_url,
        )