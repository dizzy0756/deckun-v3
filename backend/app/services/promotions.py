from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Promotion, PromotionProduct
from app.schemas import (
    PromotionCreate,
    PromotionRead,
    PromotionUpdate,
)


class PromotionService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_active_promotion(
        self, product_id: UUID, now: datetime | None = None
    ) -> Promotion | None:
        if now is None:
            now = datetime.now(UTC).replace(tzinfo=None)
        promo = self.db.scalar(
            select(Promotion)
            .join(
                PromotionProduct,
                PromotionProduct.promotion_id == Promotion.id,
            )
            .where(
                PromotionProduct.product_id == product_id,
                Promotion.is_active.is_(True),
                Promotion.starts_at <= now,
                Promotion.ends_at >= now,
            )
            .order_by(Promotion.starts_at.desc())
        )
        return promo

    def list_promotions(self) -> list[PromotionRead]:
        promotions = self.db.scalars(
            select(Promotion).order_by(Promotion.created_at.desc())
        ).all()
        result: list[PromotionRead] = []
        for promo in promotions:
            product_ids = (
                [
                    pp.product_id
                    for pp in self.db.scalars(
                        select(PromotionProduct).where(
                            PromotionProduct.promotion_id == promo.id
                        )
                    ).all()
                ]
                if promo
                else []
            )
            result.append(
                PromotionRead(
                    id=promo.id,
                    code=promo.code,
                    name=promo.name,
                    description=promo.description,
                    discount_type=promo.discount_type,
                    discount_value=float(promo.discount_value),
                    starts_at=promo.starts_at,
                    ends_at=promo.ends_at,
                    is_active=promo.is_active,
                    created_at=promo.created_at,
                    updated_at=promo.updated_at,
                    product_ids=product_ids,
                )
            )
        return result

    def get_promotion(self, promo_id: UUID) -> PromotionRead | None:
        promo = self.db.get(Promotion, promo_id)
        if not promo:
            return None
        return self._to_read(promo)

    def _to_read(self, promo: Promotion) -> PromotionRead:
        product_ids = [
            pp.product_id
            for pp in self.db.scalars(
                select(PromotionProduct).where(
                    PromotionProduct.promotion_id == promo.id
                )
            ).all()
        ]
        return PromotionRead(
            id=promo.id,
            code=promo.code,
            name=promo.name,
            description=promo.description,
            discount_type=promo.discount_type,
            discount_value=float(promo.discount_value),
            starts_at=promo.starts_at,
            ends_at=promo.ends_at,
            is_active=promo.is_active,
            created_at=promo.created_at,
            updated_at=promo.updated_at,
            product_ids=product_ids,
        )

    def create_promotion(self, data: PromotionCreate) -> PromotionRead:
        if data.code:
            existing = self.db.scalar(
                select(Promotion).where(Promotion.code == data.code)
            )
            if existing:
                raise HTTPException(
                    status_code=409, detail="Promotion code already exists"
                )

        promo = Promotion(
            code=data.code,
            name=data.name,
            description=data.description,
            discount_type=data.discount_type,
            discount_value=data.discount_value,
            starts_at=data.starts_at,
            ends_at=data.ends_at,
            is_active=data.is_active,
        )
        self.db.add(promo)
        self.db.flush()

        for product_id in data.product_ids:
            pp = PromotionProduct(promotion_id=promo.id, product_id=product_id)
            self.db.add(pp)
        self.db.flush()
        return self._to_read(promo)

    def update_promotion(self, promo_id: UUID, data: PromotionUpdate) -> PromotionRead:
        promo = self.db.get(Promotion, promo_id)
        if not promo:
            raise HTTPException(status_code=404, detail="Promotion not found")

        update_data = data.model_dump(exclude_unset=True)
        if (
            "discount_value" in update_data
            and update_data["discount_value"] is not None
        ):
            update_data["discount_value"] = update_data["discount_value"]
        if "product_ids" in update_data and update_data["product_ids"] is not None:
            existing_links = self.db.scalars(
                select(PromotionProduct).where(
                    PromotionProduct.promotion_id == promo_id
                )
            ).all()
            for link in existing_links:
                self.db.delete(link)
            for product_id in update_data.pop("product_ids"):
                self.db.add(
                    PromotionProduct(promotion_id=promo_id, product_id=product_id)
                )
        for field, value in update_data.items():
            setattr(promo, field, value)
        promo.updated_at = datetime.now(UTC).replace(tzinfo=None)
        self.db.flush()
        return self._to_read(promo)

    def delete_promotion(self, promo_id: UUID) -> bool:
        promo = self.db.get(Promotion, promo_id)
        if not promo:
            return False
        promo.is_active = False
        promo.updated_at = datetime.now(UTC).replace(tzinfo=None)
        self.db.flush()
        return True
