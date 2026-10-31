from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.services.pincodes import PincodeService

router = APIRouter(prefix="/api/pincodes", tags=["pincodes"])


@router.get("/check")
def check_pincode(pincode: str, db: Session = Depends(get_db)):
    service = PincodeService(db)
    serviceable = service.check_serviceable(pincode)
    return {"serviceable": serviceable}
