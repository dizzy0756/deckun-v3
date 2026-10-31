from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.services import AdminService

router = APIRouter()


@router.get("/")
def dashboard(
    db: Session = Depends(get_db),
):
    return AdminService(db).dashboard_summary()
