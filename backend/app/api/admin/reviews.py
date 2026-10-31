from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.enums import ReviewStatus
from app.schemas import ReviewRead, ReviewStatusChange
from app.services import ReviewService

router = APIRouter()


@router.get("/", response_model=list[ReviewRead])
def list_reviews(
    status: ReviewStatus | None = None,
    db: Session = Depends(get_db),
):
    return ReviewService(db).list_reviews(status=status)


@router.patch("/{review_id}", response_model=ReviewRead)
def update_review(
    review_id: UUID,
    payload: ReviewStatusChange,
    db: Session = Depends(get_db),
):
    return ReviewService(db).change_status(review_id, payload.status)
