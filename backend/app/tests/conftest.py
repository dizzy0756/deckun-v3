import os
import tempfile

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

_TEST_DB_PATH = os.path.join(tempfile.gettempdir(), "deckun_test.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB_PATH}"

if os.path.exists(_TEST_DB_PATH):
    os.remove(_TEST_DB_PATH)

from app.core.config import settings
from app.models import Base

settings.DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_engine(os.environ["DATABASE_URL"], future=True)


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
