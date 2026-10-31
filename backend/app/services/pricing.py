from dataclasses import dataclass

from app.models import Promotion


@dataclass
class PriceBreakdown:
    unit_price: int
    discount_amount: int
    total_price: int


class PriceCalculator:
    @staticmethod
    def effective_price(
        base_price: int, discount_percent: float, promotion: Promotion | None = None
    ) -> int:
        price = int(base_price * (100 - discount_percent) / 100)
        if promotion and promotion.is_active:
            if promotion.discount_type == "percent":
                price = int(price * (100 - float(promotion.discount_value)) / 100)
            elif promotion.discount_type == "fixed":
                price = price - int(float(promotion.discount_value))
        return max(0, price)

    @staticmethod
    def compute_line_item(
        base_price: int,
        discount_percent: float,
        quantity: int,
        promotion: Promotion | None = None,
    ) -> PriceBreakdown:
        effective = PriceCalculator.effective_price(
            base_price, discount_percent, promotion
        )
        total = effective * quantity
        discount = base_price * quantity - total
        return PriceBreakdown(
            unit_price=base_price, discount_amount=discount, total_price=total
        )
