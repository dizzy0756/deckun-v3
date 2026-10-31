from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ServiceablePincode
from app.schemas import PincodeCreate, PincodeRead, PincodeUpdate


class PincodeService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def check_serviceable(self, pincode: str) -> bool:
        result = self.db.scalar(
            select(ServiceablePincode).where(
                ServiceablePincode.pincode == pincode,
                ServiceablePincode.is_active.is_(True),
            )
        )
        return result is not None

    def list_pincodes(self) -> list[PincodeRead]:
        rows = self.db.scalars(
            select(ServiceablePincode).order_by(ServiceablePincode.pincode)
        ).all()
        return [PincodeRead.model_validate(r) for r in rows]

    def create(self, data: PincodeCreate) -> PincodeRead:
        existing = self.db.scalar(
            select(ServiceablePincode).where(ServiceablePincode.pincode == data.pincode)
        )
        if existing:
            raise HTTPException(status_code=409, detail="Pincode already exists")
        pincode = ServiceablePincode(**data.model_dump())
        self.db.add(pincode)
        self.db.flush()
        return PincodeRead.model_validate(pincode)

    def update(self, pincode_id: int, data: PincodeUpdate) -> PincodeRead:
        pincode = self.db.get(ServiceablePincode, pincode_id)
        if not pincode:
            raise HTTPException(status_code=404, detail="Pincode not found")
        update_data = data.model_dump(exclude_unset=True)
        if "pincode" in update_data:
            existing = self.db.scalar(
                select(ServiceablePincode).where(
                    ServiceablePincode.pincode == update_data["pincode"],
                    ServiceablePincode.id != pincode_id,
                )
            )
            if existing:
                raise HTTPException(status_code=409, detail="Pincode already exists")
        for field, value in update_data.items():
            setattr(pincode, field, value)
        self.db.flush()
        return PincodeRead.model_validate(pincode)

    def delete(self, pincode_id: int) -> bool:
        pincode = self.db.get(ServiceablePincode, pincode_id)
        if not pincode:
            return False
        pincode.is_active = False
        self.db.flush()
        return True
