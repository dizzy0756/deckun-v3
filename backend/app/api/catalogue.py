from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas import CategoryRead, ProductDetailRead, ProductRead
from app.services.catalogue import CatalogueService

router = APIRouter(prefix="/api/catalogue", tags=["catalogue"])


@router.get("/categories", response_model=list[CategoryRead])
def list_categories(db: Session = Depends(get_db)):
    service = CatalogueService(db)
    return service.list_categories()


@router.get("/products", response_model=list[ProductRead])
def list_products(
    category: str | None = Query(default=None),
    featured: bool | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    service = CatalogueService(db)
    return service.list_products(
        category_slug=category,
        featured_only=featured or False,
        skip=skip,
        limit=limit,
    )


@router.get("/products/{slug}", response_model=ProductDetailRead)
def get_product(slug: str, db: Session = Depends(get_db)):
    service = CatalogueService(db)
    return service.get_product_by_slug(slug)
