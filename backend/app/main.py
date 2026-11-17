from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, select

from app.api.admin import router as admin_router
from app.api.auth import router as auth_router
from app.api.cart import router as cart_router
from app.api.catalogue import router as catalogue_router
from app.api.content import router as content_router
from app.api.notifications import router as notifications_router
from app.api.orders import router as orders_router
from app.api.pincodes import router as pincodes_router
from app.api.promotions import router as promotions_router
from app.api.reviews import router as reviews_router
from app.core.config import settings
from app.core.database import SessionLocal, engine
from app.models.base import Base
from app.core.paths import MEDIA_DIR, PRODUCT_MEDIA_DIR, REVIEW_MEDIA_DIR
from app.core.security import get_password_hash
from app.models import AdminUser

app = FastAPI(title="Deckun Backend", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(catalogue_router)
app.include_router(cart_router)
app.include_router(orders_router)
app.include_router(reviews_router)
app.include_router(content_router)
app.include_router(pincodes_router)
app.include_router(promotions_router)
app.include_router(notifications_router)
app.include_router(admin_router)

# Serve uploaded media (product + review images)
PRODUCT_MEDIA_DIR.mkdir(parents=True, exist_ok=True)
REVIEW_MEDIA_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/images", StaticFiles(directory=str(MEDIA_DIR)), name="images")


@app.on_event("startup")
def bootstrap_database() -> None:
    """Create missing tables and a default admin on a fresh deployment.

    Alembic remains the source of truth for schema changes; this only makes a
    brand-new database usable so the admin panel can be reached without shell
    access. It never touches an existing schema or existing admins.
    """
    inspector = inspect(engine)
    if not inspector.has_table("products"):
        Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        has_admin = db.scalar(select(AdminUser.id).limit(1))
        if not has_admin:
            db.add(
                AdminUser(
                    email=settings.ADMIN_EMAIL,
                    password_hash=get_password_hash(settings.ADMIN_PASSWORD),
                    full_name="Deckun Admin",
                    is_active=True,
                )
            )
            db.commit()
    finally:
        db.close()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Deckun API"}