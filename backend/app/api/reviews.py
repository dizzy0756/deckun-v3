from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_current_user, get_db
from app.models import AdminUser, User
from app.models.enums import ReviewStatus
from app.schemas import ReviewCreate, ReviewRead, ReviewStatusChange
from app.services.reviews import ReviewService

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@router.get("/product/{product_id}", response_model=list[ReviewRead])
def get_product_reviews(
    product_id: UUID, db: Session = Depends(get_db)
) -> list[ReviewRead]:
    return ReviewService(db).get_product_reviews(product_id)


@router.post("/", response_model=ReviewRead)
def create_review(
    data: ReviewCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReviewRead:
    return ReviewService(db).create_review(user.id, data)


@router.get("/pending", response_model=list[ReviewRead])
def get_pending_reviews(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[ReviewRead]:
    return ReviewService(db).list_reviews(ReviewStatus.pending)


@router.patch("/{review_id}", response_model=ReviewRead)
def change_review_status(
    review_id: UUID,
    data: ReviewStatusChange,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ReviewRead:
    return ReviewService(db).change_status(review_id, data.status)
