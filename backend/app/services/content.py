from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import WebsiteContent
from app.schemas import (
    WebsiteContentCreate,
    WebsiteContentRead,
    WebsiteContentUpdate,
)


class ContentService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_content(self, data: WebsiteContentCreate) -> WebsiteContentRead:
        existing = self.db.scalar(
            select(WebsiteContent).where(
                WebsiteContent.content_key == data.content_key
            )
        )
        if existing:
            raise HTTPException(
                status_code=409, detail="Content key already exists"
            )
        content = WebsiteContent(
            content_key=data.content_key,
            content_type=data.content_type,
            text_value=data.text_value,
            image_url=data.image_url,
            is_active=data.is_active,
        )
        self.db.add(content)
        self.db.flush()
        return WebsiteContentRead.model_validate(content)

    def delete_content(self, key: str) -> bool:
        content = self.db.scalar(
            select(WebsiteContent).where(WebsiteContent.content_key == key)
        )
        if not content:
            raise HTTPException(status_code=404, detail="Content not found")
        self.db.delete(content)
        self.db.flush()
        return True

    def get_all_public(self) -> dict[str, dict]:
        contents = self.db.scalars(
            select(WebsiteContent).where(WebsiteContent.is_active.is_(True))
        ).all()
        return {
            c.content_key: {
                "content_type": c.content_type,
                "text_value": c.text_value,
                "image_url": c.image_url,
            }
            for c in contents
        }

    def get_content(self, key: str) -> WebsiteContentRead | None:
        content = self.db.scalar(
            select(WebsiteContent).where(WebsiteContent.content_key == key)
        )
        return WebsiteContentRead.model_validate(content) if content else None

    def update_content(
        self, key: str, data: WebsiteContentUpdate
    ) -> WebsiteContentRead:
        content = self.db.scalar(
            select(WebsiteContent).where(WebsiteContent.content_key == key)
        )
        if not content:
            if data.text_value is None and data.image_url is None:
                raise HTTPException(status_code=400, detail="No fields to update")
            content = WebsiteContent(
                content_key=key,
                content_type=data.content_type or "text",
                text_value=data.text_value,
                image_url=data.image_url,
                is_active=data.is_active if data.is_active is not None else True,
            )
            self.db.add(content)
        else:
            update_data = data.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                setattr(content, field, value)
        content.updated_at = datetime.now(UTC).replace(tzinfo=None)
        self.db.flush()
        return WebsiteContentRead.model_validate(content)
