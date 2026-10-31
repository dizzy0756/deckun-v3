from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas import NotificationRead
from app.services import NotificationService

router = APIRouter()


@router.get("/", response_model=list[NotificationRead])
def list_notifications(
    unread_only: bool = False,
    db: Session = Depends(get_db),
):
    return NotificationService(db).list_notifications(unread_only=unread_only)


@router.patch("/{notification_id}/read", response_model=NotificationRead)
def mark_read(
    notification_id: UUID,
    db: Session = Depends(get_db),
):
    return NotificationService(db).mark_read(notification_id)
