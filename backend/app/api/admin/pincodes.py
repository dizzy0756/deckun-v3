from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas import PincodeCreate, PincodeRead, PincodeUpdate
from app.services import PincodeService

router = APIRouter()


@router.get("/", response_model=list[PincodeRead])
def list_pincodes(
    db: Session = Depends(get_db),
):
    return PincodeService(db).list_pincodes()


@router.post("/", response_model=PincodeRead)
def create_pincode(
    payload: PincodeCreate,
    db: Session = Depends(get_db),
):
    return PincodeService(db).create(payload)


@router.patch("/{pincode_id}", response_model=PincodeRead)
def update_pincode(
    pincode_id: int,
    payload: PincodeUpdate,
    db: Session = Depends(get_db),
):
    return PincodeService(db).update(pincode_id, payload)


@router.delete("/{pincode_id}")
def delete_pincode(
    pincode_id: int,
    db: Session = Depends(get_db),
):
    deleted = PincodeService(db).delete(pincode_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Pincode not found"
        )
    return {"detail": "Pincode deactivated"}
