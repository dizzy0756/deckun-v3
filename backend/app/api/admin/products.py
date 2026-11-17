from uuid import UUID
import os
import uuid as uuid_lib
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.media import media_base_url
from app.services.storage import save_media
from app.models import (
    CartItem,
    Category,
    OrderItem,
    Product,
    ProductImage,
    ProductSpecification,
    ProductVariant,
    PromotionProduct,
    Review,
)
from app.models.enums import ProductStatus
from app.schemas import (
    ProductDetailRead,
    ProductImageRead,
    ProductRead,
)
from app.services.catalogue import CatalogueService

router = APIRouter()


class VariantCreate(BaseModel):
    id: UUID | None = None
    sku: str
    name: str
    color: str | None = None
    size: str | None = None
    price: int
    stock: int = 0
    is_active: bool = True


class ImageCreate(BaseModel):
    url: str
    storage_key: str
    sort_order: int = 0
    alt_text: str | None = None
    is_active: bool = True


class SpecCreate(BaseModel):
    field_label: str
    field_value: str
    sort_order: int = 0


class ProductCreate(BaseModel):
    category_id: int
    name: str
    slug: str
    description: str
    status: ProductStatus = ProductStatus.active
    has_variants: bool = False
    base_price: int | None = None
    discount_percent: float = 0.0
    is_featured: bool = False
    meta_title: str | None = None
    meta_description: str | None = None
    variants: list[VariantCreate] = []
    images: list[ImageCreate] = []
    specifications: list[SpecCreate] = []


class ProductUpdate(BaseModel):
    category_id: int | None = None
    name: str | None = None
    slug: str | None = None
    description: str | None = None
    status: ProductStatus | None = None
    has_variants: bool | None = None
    base_price: int | None = None
    discount_percent: float | None = None
    is_featured: bool | None = None
    meta_title: str | None = None
    meta_description: str | None = None
    variants: list[VariantCreate] | None = None
    images: list[ImageCreate] | None = None
    specifications: list[SpecCreate] | None = None


def _primary_image_url(db: Session, product_id: UUID, request_base_url: str | None = None) -> str | None:
    url = db.scalar(
        select(ProductImage.url)
        .where(
            ProductImage.product_id == product_id,
            ProductImage.is_active.is_(True),
        )
        .order_by(ProductImage.sort_order)
        .limit(1)
    )
    if url and url.startswith('/'):
        return request_base_url + url
    return url


def _to_product_read(db: Session, product: Product, request_base_url: str | None = None) -> ProductRead:
    category = db.get(Category, product.category_id)
    variants = db.scalars(
        select(ProductVariant).where(
            ProductVariant.product_id == product.id,
            ProductVariant.is_active.is_(True),
        )
    ).all()
    service = CatalogueService(db)
    availability = service._compute_product_availability(product, variants)
    return ProductRead(
        id=product.id,
        slug=product.slug,
        name=product.name,
        description=product.description,
        base_price=product.base_price,
        discount_percent=float(product.discount_percent),
        is_featured=product.is_featured,
        category_id=product.category_id,
        category_name=category.name if category else "Unknown",
        primary_image_url=_primary_image_url(db, product.id, request_base_url),
        availability=availability,
        has_variants=product.has_variants,
    )


@router.get("/", response_model=list[ProductRead])
def list_products(
    request: Request,
    status: ProductStatus | None = None,
    include_archived: bool = False,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    stmt = (
        select(Product, Category)
        .join(Category, Product.category_id == Category.id)
        .order_by(Product.created_at.desc())
    )
    if status:
        stmt = stmt.where(Product.status == status)
    elif not include_archived:
        stmt = stmt.where(Product.status != ProductStatus.archived)
    stmt = stmt.offset(skip).limit(limit)
    results = db.execute(stmt).all()
    return [_to_product_read(db, p, media_base_url(request)) for p, _ in results]


def _unique_sku(db: Session, base: str) -> str:
    """Return a SKU derived from the slug that is not already taken."""
    candidate = (base or "SKU").upper().replace(" ", "-")
    suffix = 1
    while db.scalar(select(ProductVariant.id).where(ProductVariant.sku == candidate)):
        suffix += 1
        candidate = f"{base.upper().replace(' ', '-')}-{suffix}"
    return candidate


def _ensure_default_variant(db: Session, product: Product) -> None:
    """Guarantee a single variant so the product is manageable in inventory."""
    variants = db.scalars(
        select(ProductVariant).where(ProductVariant.product_id == product.id)
    ).all()
    if len(variants) == 1:
        variants[0].price = product.base_price or 0
        return
    if len(variants) == 0:
        db.add(
            ProductVariant(
                product_id=product.id,
                sku=_unique_sku(db, product.slug),
                name="Default",
                price=product.base_price or 0,
                stock=0,
                is_active=True,
            )
        )
        db.flush()


@router.post("/", response_model=ProductRead)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
):
    existing = db.scalar(select(Product).where(Product.slug == payload.slug))
    if existing:
        raise HTTPException(
            status_code=409, detail="Product with this slug already exists"
        )
    category = db.get(Category, payload.category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    product = Product(
        category_id=payload.category_id,
        name=payload.name,
        slug=payload.slug,
        description=payload.description,
        status=payload.status,
        has_variants=payload.has_variants,
        base_price=payload.base_price,
        discount_percent=payload.discount_percent,
        is_featured=payload.is_featured,
        meta_title=payload.meta_title,
        meta_description=payload.meta_description,
    )
    db.add(product)
    db.flush()

    for v in payload.variants:
        db.add(
            ProductVariant(
                product_id=product.id,
                sku=v.sku,
                name=v.name,
                color=v.color,
                size=v.size,
                price=v.price,
                stock=v.stock,
                is_active=v.is_active,
            )
        )
    db.flush()

    if not payload.variants:
        _ensure_default_variant(db, product)

    for img in payload.images:
        db.add(
            ProductImage(
                product_id=product.id,
                url=img.url,
                storage_key=img.storage_key,
                sort_order=img.sort_order,
                alt_text=img.alt_text,
                is_active=img.is_active,
            )
        )
    db.flush()

    for spec in payload.specifications:
        db.add(
            ProductSpecification(
                product_id=product.id,
                field_label=spec.field_label,
                field_value=spec.field_value,
                sort_order=spec.sort_order,
            )
        )
    db.flush()

    db.commit()
    db.refresh(product)
    return _to_product_read(db, product)


@router.get("/{product_id}", response_model=ProductDetailRead)
def get_product(request: Request, product_id: UUID, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return CatalogueService(db).get_product_by_slug(product.slug, media_base_url(request))


@router.patch("/{product_id}", response_model=ProductRead)
def update_product(
    product_id: UUID,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = payload.model_dump(exclude_unset=True)
    replaced_variants = "variants" in update_data
    if replaced_variants:
        incoming = update_data.pop("variants")
        existing = {
            str(v.id): v
            for v in db.scalars(
                select(ProductVariant).where(ProductVariant.product_id == product_id)
            ).all()
        }
        kept: set[str] = set()

        for item in incoming:
            variant_id = item.get("id")
            fields = {k: v for k, v in item.items() if k != "id"}
            if variant_id and str(variant_id) in existing:
                obj = existing[str(variant_id)]
                for key, value in fields.items():
                    setattr(obj, key, value)
                kept.add(str(variant_id))
            else:
                db.add(ProductVariant(product_id=product_id, **fields))

        # Variants removed in the form: delete when unreferenced, else deactivate.
        for key, obj in existing.items():
            if key in kept:
                continue
            referenced = db.scalar(
                select(CartItem.id).where(CartItem.variant_id == obj.id).limit(1)
            ) or db.scalar(
                select(OrderItem.id).where(OrderItem.variant_id == obj.id).limit(1)
            )
            if referenced:
                obj.is_active = False
            else:
                db.delete(obj)
    if "images" in update_data:
        db.execute(delete(ProductImage).where(ProductImage.product_id == product_id))
        for img in update_data.pop("images"):
            db.add(ProductImage(product_id=product_id, **img))
    if "specifications" in update_data:
        db.execute(
            delete(ProductSpecification).where(
                ProductSpecification.product_id == product_id
            )
        )
        for spec in update_data.pop("specifications"):
            db.add(ProductSpecification(product_id=product_id, **spec))

    for field, value in update_data.items():
        setattr(product, field, value)

    # Non-variant products keep exactly one default variant (price synced) so
    # inventory management keeps working; variant products keep what was sent.
    if not product.has_variants:
        _ensure_default_variant(db, product)

    db.commit()
    db.refresh(product)
    return _to_product_read(db, product)


@router.delete("/{product_id}")
def delete_product(product_id: UUID, db: Session = Depends(get_db)):
    """Delete a product, or archive it when it is referenced by orders/reviews.

    Reference checks are explicit because SQLite does not enforce foreign keys
    by default (PostgreSQL does), so behaviour must match on both.
    """
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    original_slug = product.slug

    has_orders = db.scalar(
        select(OrderItem.id).where(OrderItem.product_id == product_id).limit(1)
    )
    has_reviews = db.scalar(
        select(Review.id).where(Review.product_id == product_id).limit(1)
    )

    if has_orders or has_reviews:
        product.status = ProductStatus.archived
        product.is_featured = False
        product.slug = f"{original_slug}-archived-{uuid_lib.uuid4().hex[:8]}"
        db.flush()
        return {
            "detail": "Product archived because it has orders or reviews",
            "mode": "archived",
        }

    # Remove children explicitly so SQLite (FKs off) does not orphan rows.
    db.execute(delete(ProductImage).where(ProductImage.product_id == product_id))
    db.execute(
        delete(ProductSpecification).where(
            ProductSpecification.product_id == product_id
        )
    )
    db.execute(delete(ProductVariant).where(ProductVariant.product_id == product_id))
    db.execute(
        delete(PromotionProduct).where(PromotionProduct.product_id == product_id)
    )
    db.delete(product)
    db.flush()
    return {"detail": "Product deleted", "mode": "deleted"}


@router.post("/{product_id}/images", response_model=ProductImageRead)
async def upload_image(
    request: Request,
    product_id: UUID,
    file: UploadFile = File(...),
    alt_text: str | None = None,
    is_active: bool = True,
    db: Session = Depends(get_db),
):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Generate unique filename
    ext = os.path.splitext(file.filename or "image")[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        raise HTTPException(status_code=400, detail="Unsupported image format")

    unique_name = f"{uuid_lib.uuid4().hex}{ext}"
    contents = await file.read()
    image_url = save_media(
        contents,
        unique_name,
        "products",
        file.content_type,
        media_base_url(request),
    )

    # Determine sort_order (next available)
    max_sort = db.scalar(
        select(ProductImage.sort_order)
        .where(ProductImage.product_id == product_id)
        .order_by(ProductImage.sort_order.desc())
        .limit(1)
    ) or 0

    img = ProductImage(
        product_id=product_id,
        url=image_url,
        storage_key=unique_name,
        sort_order=max_sort + 1,
        alt_text=alt_text or file.filename or "Product image",
        is_active=is_active,
    )
    db.add(img)
    db.commit()
    db.refresh(img)
    return ProductImageRead.model_validate(img)


@router.delete("/{product_id}/images/{image_id}")
def delete_image(
    product_id: UUID,
    image_id: UUID,
    db: Session = Depends(get_db),
):
    img = db.get(ProductImage, image_id)
    if not img or img.product_id != product_id:
        raise HTTPException(status_code=404, detail="Image not found")
    db.delete(img)
    db.flush()
    return {"detail": "Image deleted"}
