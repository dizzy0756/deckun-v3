from fastapi import APIRouter, Depends

from app.api.admin.content import router as content_router
from app.api.admin.customers import router as customers_router
from app.api.admin.dashboard import router as dashboard_router
from app.api.admin.inventory import router as inventory_router
from app.api.admin.notifications import router as notifications_router
from app.api.admin.orders import router as orders_router
from app.api.admin.pincodes import router as pincodes_router
from app.api.admin.products import router as products_router
from app.api.admin.promotions import router as promotions_router
from app.api.admin.reviews import router as reviews_router
from app.api.admin.settings import router as settings_router
from app.api.deps import get_current_admin

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
)

router.include_router(dashboard_router, prefix="/dashboard")
router.include_router(orders_router, prefix="/orders")
router.include_router(products_router, prefix="/products")
router.include_router(inventory_router, prefix="/inventory")
router.include_router(customers_router, prefix="/customers")
router.include_router(notifications_router, prefix="/notifications")
router.include_router(settings_router, prefix="/settings")
router.include_router(promotions_router, prefix="/promotions")
router.include_router(reviews_router, prefix="/reviews")
router.include_router(pincodes_router, prefix="/pincodes")
router.include_router(content_router, prefix="/content")

__all__ = ["router"]
