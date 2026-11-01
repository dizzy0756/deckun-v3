from app.api.admin import router as admin_router
from app.api.auth import router as auth_router
from app.api.cart import router as cart_router
from app.api.catalogue import router as catalogue_router
from app.api.content import router as content_router
from app.api.notifications import router as notifications_router
from app.api.orders import router as orders_router
from app.api.pincodes import router as pincodes_router
from app.api.reviews import router as reviews_router

__all__ = [
    "admin_router",
    "auth_router",
    "cart_router",
    "catalogue_router",
    "content_router",
    "notifications_router",
    "orders_router",
    "pincodes_router",
    "reviews_router",
]