import os
import uuid as uuid_lib
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_current_user, get_db
from app.core.media import media_base_url
from app.core.paths import REVIEW_MEDIA_DIR
from app.models import AdminUser, User
from app.models.enums import ReviewStatus
from app.schemas import ReviewCreate, ReviewRead, ReviewStatusChange
from app.services.reviews import ReviewService

router = APIRouter(prefix="/api/reviews", tags=["reviews"])

ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


@router.get("/product/{product_id}", response_model=list[ReviewRead])
def get_product_reviews(
    product_id: UUID, db: Session = Depends(get_db)
) -> list[ReviewRead]:
    return ReviewService(db).get_product_reviews(product_id)


@router.get("/can-review/{product_id}")
def can_review_product(
    product_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return ReviewService(db).review_eligibility(user.id, product_id)


@router.post("/upload")
async def upload_review_image(
    request: Request,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
) -> dict[str, str]:
    """Store a customer review photo alongside the other product media."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    ext = os.path.splitext(file.filename or "image")[1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Unsupported image format")

    target_dir = REVIEW_MEDIA_DIR
    target_dir.mkdir(parents=True, exist_ok=True)

    unique_name = f"{uuid_lib.uuid4().hex}{ext}"
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be 5MB or smaller")

    with open(target_dir / unique_name, "wb") as fh:
        fh.write(contents)

    base_url = media_base_url(request)
    return {"url": f"{base_url}/images/reviews/{unique_name}"}


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
