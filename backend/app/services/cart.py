from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Cart,
    CartItem,
    Product,
    ProductVariant,
)
from app.models.enums import ProductStatus
from app.schemas import (
    CartItemAdd,
    CartItemRead,
    CartRead,
)
from app.services.catalogue import CatalogueService
from app.services.pricing import PriceCalculator
from app.services.promotions import PromotionService


class CartService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self._catalogue = CatalogueService(db)
        self._promotions = PromotionService(db)

    def _get_or_create_cart(self, user_id: UUID) -> Cart:
        cart = self.db.scalar(select(Cart).where(Cart.user_id == user_id))
        if not cart:
            cart = Cart(user_id=user_id)
            self.db.add(cart)
            self.db.flush()
        return cart

    def _get_cart_items(self, cart_id: UUID) -> list[CartItem]:
        return self.db.scalars(
            select(CartItem).where(CartItem.cart_id == cart_id)
        ).all()

    def get_cart(self, user_id: UUID) -> CartRead:
        cart = self._get_or_create_cart(user_id)
        return self._build_cart_read(cart)

    def _build_cart_read(self, cart: Cart) -> CartRead:
        items = self._get_cart_items(cart.id)
        items_read: list[CartItemRead] = []
        subtotal = 0
        item_count = 0

        for item in items:
            product = self.db.get(Product, item.product_id)
            if not product or product.status != ProductStatus.active:
                continue
            variant = (
                self.db.get(ProductVariant, item.variant_id)
                if item.variant_id
                else None
            )

            base_price = variant.price if variant else (product.base_price or 0)
            discount_percent = float(product.discount_percent)
            promo = (
                self._promotions.get_active_promotion(product.id)
                if base_price
                else None
            )
            breakdown = PriceCalculator.compute_line_item(
                base_price, discount_percent, item.quantity, promo
            )
            subtotal += breakdown.unit_price * item.quantity
            item_count += item.quantity

            items_read.append(
                CartItemRead(
                    id=item.id,
                    cart_id=item.cart_id,
                    product_id=item.product_id,
                    variant_id=item.variant_id,
                    quantity=item.quantity,
                    product_name=product.name,
                    variant_name=variant.name if variant else None,
                    unit_price=breakdown.unit_price,
                    total_price=breakdown.total_price,
                )
            )

        return CartRead(
            id=cart.id,
            user_id=cart.user_id,
            items=items_read,
            subtotal=subtotal,
            item_count=item_count,
        )

    def add_item(self, user_id: UUID, data: CartItemAdd) -> CartRead:
        product, variant = self._catalogue.get_product_for_cart(
            data.product_slug, data.variant_sku
        )
        cart = self._get_or_create_cart(user_id)

        existing = self.db.scalar(
            select(CartItem).where(
                CartItem.cart_id == cart.id,
                CartItem.product_id == product.id,
            )
        )
        if existing and existing.variant_id != (variant.id if variant else None):
            existing = None

        if existing:
            existing.quantity += data.quantity
            self.db.flush()
        else:
            new_item = CartItem(
                cart_id=cart.id,
                product_id=product.id,
                variant_id=variant.id if variant else None,
                quantity=data.quantity,
            )
            self.db.add(new_item)
            self.db.flush()

        return self._build_cart_read(cart)

    def update_item(self, user_id: UUID, item_id: UUID, quantity: int) -> CartRead:
        cart = self._get_or_create_cart(user_id)
        item = self.db.scalar(
            select(CartItem).where(CartItem.id == item_id, CartItem.cart_id == cart.id)
        )
        if not item:
            raise HTTPException(status_code=404, detail="Cart item not found")
        item.quantity = quantity
        self.db.flush()
        return self._build_cart_read(cart)

    def remove_item(self, user_id: UUID, item_id: UUID) -> CartRead:
        cart = self._get_or_create_cart(user_id)
        item = self.db.scalar(
            select(CartItem).where(CartItem.id == item_id, CartItem.cart_id == cart.id)
        )
        if not item:
            raise HTTPException(status_code=404, detail="Cart item not found")
        self.db.delete(item)
        self.db.flush()
        return self._build_cart_read(cart)

    def clear_cart(self, user_id: UUID) -> None:
        cart = self._get_or_create_cart(user_id)
        items = self._get_cart_items(cart.id)
        for item in items:
            self.db.delete(item)
        self.db.flush()
