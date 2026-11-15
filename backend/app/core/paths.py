"""Filesystem locations that are independent of the process working directory."""

from pathlib import Path

# backend/  (this file is backend/app/core/paths.py)
BACKEND_DIR = Path(__file__).resolve().parents[2]

# backend/public/images  -> served at /images
MEDIA_DIR = BACKEND_DIR / "public" / "images"
PRODUCT_MEDIA_DIR = MEDIA_DIR / "products"
REVIEW_MEDIA_DIR = MEDIA_DIR / "reviews"
