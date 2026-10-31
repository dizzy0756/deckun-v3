from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas import SettingRead, SettingUpdate
from app.services import AdminService

router = APIRouter()


@router.get("/", response_model=list[SettingRead])
def list_settings(
    db: Session = Depends(get_db),
):
    return AdminService(db).get_settings()


@router.patch("/{key}", response_model=SettingRead)
def update_setting(
    key: str,
    payload: SettingUpdate,
    db: Session = Depends(get_db),
):
    return AdminService(db).update_setting(key, payload.setting_value)
