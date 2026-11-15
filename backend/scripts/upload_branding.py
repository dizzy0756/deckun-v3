"""Upload the Deckun logo to Cloudflare R2 and optionally point the site at it.

Usage (from backend/):
    python scripts/upload_branding.py --set-content
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select  # noqa: E402

from app.core.database import SessionLocal  # noqa: E402
from app.models import WebsiteContent  # noqa: E402
from app.services.storage import r2_configured, save_media  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))


def main() -> None:
    parser = argparse.ArgumentParser(description="Upload branding assets to R2")
    parser.add_argument(
        "--file",
        default=os.path.join(HERE, "..", "..", "customer-web", "images", "logo.png"),
        help="Path to the logo file",
    )
    parser.add_argument(
        "--set-content",
        action="store_true",
        help="Also set the site.logo_url content key to the uploaded URL",
    )
    args = parser.parse_args()

    if not r2_configured():
        print("R2 is not configured. Set R2_* variables in backend/.env first.")
        sys.exit(1)

    path = os.path.abspath(args.file)
    if not os.path.isfile(path):
        print(f"Logo not found: {path}")
        sys.exit(1)

    with open(path, "rb") as fh:
        data = fh.read()

    url = save_media(data, "logo.png", "branding", "image/png", "")
    print(f"Uploaded logo -> {url}")

    if args.set_content:
        db = SessionLocal()
        try:
            row = db.scalar(
                select(WebsiteContent).where(
                    WebsiteContent.content_key == "site.logo_url"
                )
            )
            if row:
                row.text_value = url
                row.image_url = url
                row.content_type = "image"
                row.is_active = True
            else:
                db.add(
                    WebsiteContent(
                        content_key="site.logo_url",
                        content_type="image",
                        text_value=url,
                        image_url=url,
                        is_active=True,
                    )
                )
            db.commit()
            print("Updated content key: site.logo_url")
        finally:
            db.close()


if __name__ == "__main__":
    main()
