from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.services.content import ContentService

router = APIRouter(prefix="/api/content", tags=["content"])


@router.get("/")
def get_public_content(db: Session = Depends(get_db)):
    service = ContentService(db)
    return service.get_all_public()
