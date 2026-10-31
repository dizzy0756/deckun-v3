from __future__ import annotations

import os
import tempfile

import pytest
from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

_TEST_DB_PATH = os.path.join(tempfile.gettempdir(), "deckun_test.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB_PATH}"

if os.path.exists(_TEST_DB_PATH):
    os.remove(_TEST_DB_PATH)

from app.core.config import settings
from app.models import Base, Setting

settings.DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_engine(
    os.environ["DATABASE_URL"],
    future=True,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@event.listens_for(engine, "connect")
def _enable_sqlite_fks(dbapi_conn, connection_record):
    """Enable foreign-key enforcement for SQLite (off by default)."""
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys = ON")
    cursor.close()


@pytest.fixture(scope="session", autouse=True)
def create_test_db():
    """Create all tables once per test session."""
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield


@pytest.fixture
def db():
    """Provide a session within a transaction that rolls back after each test.

    Tests should use flush() (not commit()) so the outer transaction can
    roll everything back, giving each test a clean slate.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = sessionmaker(bind=connection, future=True)()
    try:
        yield session
    finally:
        session.close()
        if transaction.is_active:
            transaction.rollback()
        connection.close()


@pytest.fixture
def client(db: Session):
    """FastAPI TestClient that shares the test session's connection.

    Both the test thread and the TestClient thread use the same SQLite
    connection (StaticPool + check_same_thread=False), so uncommitted
    data created via the ``db`` fixture is visible to requests.
    """
    from fastapi.testclient import TestClient

    from app.core.database import get_db
    from app.main import app

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Test helpers – create model rows with proper defaults
# ---------------------------------------------------------------------------


def create_user(
    db: Session,
    mobile: str = "9999999999",
    email: str | None = None,
    password: str = "password123",
    full_name: str = "Test User",
):
    from app.core.security import get_password_hash
    from app.models import User

    user = User(
        mobile_number=mobile,
        email=email,
        password_hash=get_password_hash(password),
        full_name=full_name,
    )
    db.add(user)
    db.flush()
    return user


def create_admin(
    db: Session,
    email: str = "admin@test.com",
    password: str = "admin123",
    full_name: str = "Admin User",
):
    from app.core.security import get_password_hash
    from app.models import AdminUser

    admin = AdminUser(
        email=email,
        password_hash=get_password_hash(password),
        full_name=full_name,
    )
    db.add(admin)
    db.flush()
    return admin


def create_category(
    db: Session, name: str = "Outdoor", slug: str = "outdoor"
):
    from app.models import Category

    cat = Category(name=name, slug=slug)
    db.add(cat)
    db.flush()
    return cat


def create_product(
    db: Session,
    slug: str = "test-product",
    category_id: int | None = None,
    name: str = "Test Product",
    description: str = "A test product",
    has_variants: bool = False,
    base_price: int | None = 1000,
    discount_percent: float = 0.0,
    is_featured: bool = False,
    status=None,
):
    from app.models import Product
    from app.models.enums import ProductStatus

    if category_id is None:
        cat = create_category(db)
        category_id = cat.id
    prod = Product(
        category_id=category_id,
        name=name,
        slug=slug,
        description=description,
        has_variants=has_variants,
        base_price=base_price,
        discount_percent=discount_percent,
        is_featured=is_featured,
        status=status or ProductStatus.active,
    )
    db.add(prod)
    db.flush()
    return prod


def create_variant(
    db: Session,
    product_id,
    sku: str = "SKU-001",
    name: str = "Default",
    price: int = 1000,
    stock: int = 10,
    is_active: bool = True,
):
    from app.models import ProductVariant

    v = ProductVariant(
        product_id=product_id,
        sku=sku,
        name=name,
        price=price,
        stock=stock,
        is_active=is_active,
    )
    db.add(v)
    db.flush()
    return v


def create_address(
    db: Session,
    user_id,
    label: str = "Home",
    phone_number: str = "9999999999",
    city: str = "Test City",
    state: str = "Test State",
    pincode: str = "560001",
    is_default: bool = True,
):
    from app.models import Address

    addr = Address(
        user_id=user_id,
        label=label,
        full_name="Test User",
        address_line1="123 Test St",
        city=city,
        state=state,
        pincode=pincode,
        phone_number=phone_number,
        is_default=is_default,
    )
    db.add(addr)
    db.flush()
    return addr


def ensure_low_stock_setting(db: Session) -> None:
    existing = db.scalar(
        select(Setting).where(Setting.setting_key == "low_stock_threshold")
    )
    if not existing:
        db.add(
            Setting(
                setting_key="low_stock_threshold",
                setting_value="5",
                data_type="integer",
                description="Units below which stock is low",
            )
        )
        db.flush()


def get_customer_token(
    client, mobile: str = "9999999999", password: str = "password123"
):
    resp = client.post(
        "/api/auth/login", json={"mobile_number": mobile, "password": password}
    )
    return resp.json()["access_token"]


def get_admin_token(client, email: str = "admin@test.com", password: str = "admin123"):
    resp = client.post(
        "/api/auth/admin/login", json={"email": email, "password": password}
    )
    return resp.json()["access_token"]
