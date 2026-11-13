from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_current_user, get_db
from app.core.security import create_admin_token, create_customer_token
from app.models import User, AdminUser
from app.schemas import (
    AddressCreate,
    AddressRead,
    AddressUpdate,
    AdminLogin,
    PasswordResetConfirm,
    PasswordResetRequest,
    Token,
    UserLogin,
    UserRead,
    UserRegister,
    UserUpdate,
)
from app.services.auth import AuthService

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=Token)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    service = AuthService(db)
    _, token = service.register(
        mobile_number=payload.mobile_number,
        password=payload.password,
        full_name=payload.full_name,
        email=payload.email,
    )
    return Token(access_token=token)


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    service = AuthService(db)
    user = service.authenticate(
        mobile_number=payload.mobile_number, password=payload.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    token = create_customer_token(user.id)
    return Token(access_token=token)


@router.post("/admin/login", response_model=Token)
def admin_login(payload: AdminLogin, db: Session = Depends(get_db)):
    service = AuthService(db)
    admin = service.authenticate_admin(email=payload.email, password=payload.password)
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    token = create_admin_token(admin.id)
    return Token(access_token=token)


@router.post("/admin/change-password")
def change_admin_password(
    payload: dict,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin),
):
    service = AuthService(db)
    try:
        service.change_admin_password(
            admin_id=current_admin.id,
            current_password=payload.get("current_password", ""),
            new_password=payload.get("new_password", ""),
        )
        return {"detail": "Password changed successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/password-reset/request")
def password_reset_request(
    payload: PasswordResetRequest, db: Session = Depends(get_db)
):
    if not payload.email and not payload.mobile_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or mobile number is required",
        )
    service = AuthService(db)
    service.request_password_reset(payload.email or payload.mobile_number)
    return {"detail": "If the account exists, a reset link has been sent"}


@router.post("/password-reset/confirm")
def password_reset_confirm(
    payload: PasswordResetConfirm, db: Session = Depends(get_db)
):
    service = AuthService(db)
    service.reset_password(token=payload.token, new_password=payload.new_password)
    return {"detail": "Password reset successful"}


@router.get("/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserRead)
def update_current_user(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    return service.update_user(user_id=current_user.id, data=payload)


@router.get("/me/addresses", response_model=list[AddressRead])
def list_addresses(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    service = AuthService(db)
    return service.get_addresses(user_id=current_user.id)


@router.post("/me/addresses", response_model=AddressRead)
def create_address(
    payload: AddressCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    return service.create_address(user_id=current_user.id, data=payload)


@router.get("/me/addresses/{address_id}", response_model=AddressRead)
def get_address(
    address_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    addr = service.get_address(user_id=current_user.id, addr_id=address_id)
    if not addr:
        raise HTTPException(status_code=404, detail="Address not found")
    return addr


@router.put("/me/addresses/{address_id}", response_model=AddressRead)
def update_address(
    address_id: UUID,
    payload: AddressUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    return service.update_address(
        user_id=current_user.id, addr_id=address_id, data=payload
    )


@router.put("/me/addresses/{address_id}/default", response_model=AddressRead)
def set_default_address(
    address_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    return service.set_default_address(user_id=current_user.id, addr_id=address_id)


@router.delete("/me/addresses/{address_id}")
def delete_address(
    address_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    deleted = service.delete_address(user_id=current_user.id, addr_id=address_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Address not found")
    return {"detail": "Address deleted"}
