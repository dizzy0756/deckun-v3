from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas import PromotionValidateRequest, PromotionValidateResult
from app.services.promotions import PromotionService

router = APIRouter(prefix="/api/promotions", tags=["promotions"])


@router.post("/validate", response_model=PromotionValidateResult)
def validate_promotion(
    payload: PromotionValidateRequest,
    db: Session = Depends(get_db),
):
    """Public endpoint: check a promo code and compute the discount for a subtotal."""
    return PromotionService(db).validate_code(payload.code, payload.subtotal)
