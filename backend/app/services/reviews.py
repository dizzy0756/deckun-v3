from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Order, OrderItem, Product, Review, User
from app.models.enums import NotificationType, OrderStatus, ReviewStatus
from app.schemas import ReviewCreate, ReviewRead
from app.services.notifications import NotificationService


class ReviewService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def can_review(self, user_id: UUID, order_item_id: UUID) -> bool:
        order_item = self.db.get(OrderItem, order_item_id)
        if not order_item:
            return False
        order = self.db.get(Order, order_item.order_id)
        if not order or order.user_id != user_id:
            return False
        if order.status != OrderStatus.delivered:
            return False
        existing = self.db.scalar(
            select(Review).where(
                Review.user_id == user_id, Review.order_item_id == order_item_id
            )
        )
        return existing is None

    def create_review(self, user_id: UUID, data: ReviewCreate) -> ReviewRead:
        product = self.db.get(Product, data.product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        existing = self.db.scalar(
            select(Review).where(
                Review.user_id == user_id, Review.product_id == data.product_id
            )
        )
        if existing:
            raise HTTPException(
                status_code=409, detail="You have already reviewed this product"
            )

        if not self.can_review(user_id, data.order_item_id):
            raise HTTPException(
                status_code=400,
                detail="You can only review products from delivered orders",
            )

        review = Review(
            user_id=user_id,
            product_id=data.product_id,
            order_item_id=data.order_item_id,
            rating=data.rating,
            title=data.title,
            comment=data.comment,
            status=ReviewStatus.pending,
        )
        self.db.add(review)
        self.db.flush()

        NotificationService(self.db).create(
            NotificationType.review_pending,
            "Review awaiting moderation",
            f"New review for '{review.title or 'product'}' by user.",
        )
        return self._to_read(review)

    def _to_read(self, review: Review) -> ReviewRead:
        user = self.db.get(User, review.user_id)
        product = self.db.get(Product, review.product_id)
        return ReviewRead(
            id=review.id,
            user_id=review.user_id,
            user_full_name=user.full_name if user else "Unknown",
            product_id=review.product_id,
            product_name=product.name if product else "Unknown",
            order_item_id=review.order_item_id,
            rating=review.rating,
            title=review.title,
            comment=review.comment,
            status=review.status,
            created_at=review.created_at,
            updated_at=review.updated_at,
        )

    def get_product_reviews(
        self, product_id: UUID, status: ReviewStatus = ReviewStatus.approved
    ) -> list[ReviewRead]:
        reviews = self.db.scalars(
            select(Review)
            .where(
                Review.product_id == product_id,
                Review.status == status,
            )
            .order_by(Review.created_at.desc())
        ).all()
        return [self._to_read(r) for r in reviews]

    def list_reviews(self, status: ReviewStatus | None = None) -> list[ReviewRead]:
        stmt = select(Review).order_by(Review.created_at.desc())
        if status:
            stmt = stmt.where(Review.status == status)
        reviews = self.db.scalars(stmt).all()
        return [self._to_read(r) for r in reviews]

    def change_status(self, review_id: UUID, new_status: ReviewStatus) -> ReviewRead:
        review = self.db.get(Review, review_id)
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        review.status = new_status
        review.updated_at = datetime.now(UTC).replace(tzinfo=None)
        self.db.flush()
        return self._to_read(review)
