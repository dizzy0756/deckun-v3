from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas import (
    PromotionCreate,
    PromotionRead,
    PromotionUpdate,
)
from app.services import PromotionService

router = APIRouter()


@router.get("/", response_model=list[PromotionRead])
def list_promotions(
    db: Session = Depends(get_db),
):
    return PromotionService(db).list_promotions()


@router.post("/", response_model=PromotionRead)
def create_promotion(
    payload: PromotionCreate,
    db: Session = Depends(get_db),
):
    return PromotionService(db).create_promotion(payload)


@router.get("/{promo_id}", response_model=PromotionRead)
def get_promotion(
    promo_id: UUID,
    db: Session = Depends(get_db),
):
    promo = PromotionService(db).get_promotion(promo_id)
    if not promo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Promotion not found"
        )
    return promo


@router.patch("/{promo_id}", response_model=PromotionRead)
def update_promotion(
    promo_id: UUID,
    payload: PromotionUpdate,
    db: Session = Depends(get_db),
):
    return PromotionService(db).update_promotion(promo_id, payload)


@router.delete("/{promo_id}")
def delete_promotion(
    promo_id: UUID,
    db: Session = Depends(get_db),
):
    deleted = PromotionService(db).delete_promotion(promo_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Promotion not found"
        )
    return {"detail": "Promotion deactivated"}
