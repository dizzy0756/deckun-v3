from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_db
from app.models import AdminUser
from app.schemas import NotificationRead
from app.services.notifications import NotificationService

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("/", response_model=list[NotificationRead])
def list_notifications(
    unread_only: bool = False,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[NotificationRead]:
    return NotificationService(db).list_notifications(unread_only)


@router.patch("/{notification_id}/read", response_model=NotificationRead)
def mark_read(
    notification_id: UUID,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> NotificationRead:
    return NotificationService(db).mark_read(notification_id)


@router.get("/unread-count")
def unread_count(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    return {"count": NotificationService(db).count_unread()}
