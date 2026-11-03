from uuid import UUID
import os
import uuid as uuid_lib
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import (
    Category,
    Product,
    ProductImage,
    ProductSpecification,
    ProductVariant,
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
    sku: str
    name: str
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


def _primary_image_url(db: Session, product_id: UUID) -> str | None:
    return db.scalar(
        select(ProductImage.url)
        .where(
            ProductImage.product_id == product_id,
            ProductImage.is_active.is_(True),
        )
        .order_by(ProductImage.sort_order)
        .limit(1)
    )


def _to_product_read(db: Session, product: Product) -> ProductRead:
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
        primary_image_url=_primary_image_url(db, product.id),
        availability=availability,
        has_variants=product.has_variants,
    )


@router.get("/", response_model=list[ProductRead])
def list_products(
    status: ProductStatus | None = None,
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
    stmt = stmt.offset(skip).limit(limit)
    results = db.execute(stmt).all()
    return [_to_product_read(db, p) for p, _ in results]


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
                price=v.price,
                stock=v.stock,
                is_active=v.is_active,
            )
        )
    db.flush()

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
def get_product(product_id: UUID, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return CatalogueService(db).get_product_by_slug(product.slug)


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
    if "variants" in update_data:
        db.execute(
            delete(ProductVariant).where(ProductVariant.product_id == product_id)
        )
        for v in update_data.pop("variants"):
            db.add(ProductVariant(product_id=product_id, **v))
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
    db.commit()
    db.refresh(product)
    return _to_product_read(db, product)


@router.delete("/{product_id}")
def archive_product(product_id: UUID, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.status = ProductStatus.archived
    db.flush()
    return {"detail": "Product archived"}


@router.post("/{product_id}/images", response_model=ProductImageRead)
async def upload_image(
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
    file_path = Path("public/images/products") / unique_name

    # Save file to disk
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    # Build public URL
    image_url = f"/images/products/{unique_name}"

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
    db.flush()
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
