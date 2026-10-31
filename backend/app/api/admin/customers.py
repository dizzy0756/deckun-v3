from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas import UserRead
from app.services import AdminService

router = APIRouter()


@router.get("/", response_model=list[UserRead])
def list_customers(
    db: Session = Depends(get_db),
):
    return AdminService(db).list_customers()
