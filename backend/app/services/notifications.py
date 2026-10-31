from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Notification
from app.schemas import NotificationRead


class NotificationService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        type_value: str,
        title: str,
        message: str,
        order_id: UUID | None = None,
    ) -> Notification:
        notif = Notification(
            type=type_value,
            title=title,
            message=message,
            order_id=order_id,
        )
        self.db.add(notif)
        self.db.flush()
        return notif

    def list_notifications(self, unread_only: bool = False) -> list[NotificationRead]:
        stmt = select(Notification).order_by(Notification.created_at.desc())
        if unread_only:
            stmt = stmt.where(Notification.is_read.is_(False))
        notifications = self.db.scalars(stmt).all()
        return [NotificationRead.model_validate(n) for n in notifications]

    def mark_read(self, notification_id: UUID) -> NotificationRead:
        notif = self.db.get(Notification, notification_id)
        if not notif:
            raise HTTPException(status_code=404, detail="Notification not found")
        notif.is_read = True
        self.db.flush()
        return NotificationRead.model_validate(notif)

    def count_unread(self) -> int:
        return (
            self.db.scalar(select(Notification).where(Notification.is_read.is_(False)))
            or 0
        )
