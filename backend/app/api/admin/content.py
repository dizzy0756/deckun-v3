from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import WebsiteContent
from app.schemas import (
    WebsiteContentCreate,
    WebsiteContentRead,
    WebsiteContentUpdate,
)
from app.services import ContentService

router = APIRouter()


@router.get("/", response_model=list[WebsiteContentRead])
def list_content(
    db: Session = Depends(get_db),
):
    contents = db.scalars(
        select(WebsiteContent).order_by(WebsiteContent.content_key)
    ).all()
    return [WebsiteContentRead.model_validate(c) for c in contents]


@router.post(
    "/", response_model=WebsiteContentRead, status_code=status.HTTP_201_CREATED
)
def create_content(
    payload: WebsiteContentCreate,
    db: Session = Depends(get_db),
):
    return ContentService(db).create_content(payload)


@router.patch("/{key}", response_model=WebsiteContentRead)
def update_content(
    key: str,
    payload: WebsiteContentUpdate,
    db: Session = Depends(get_db),
):
    return ContentService(db).update_content(key, payload)


@router.delete("/{key}")
def delete_content(
    key: str,
    db: Session = Depends(get_db),
):
    ContentService(db).delete_content(key)
    return {"detail": "Content deleted"}
