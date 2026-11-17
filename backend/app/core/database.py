from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings


def _normalize_database_url(url: str) -> str:
    """Normalize provider URLs for the psycopg2 driver we ship.

    - postgres://            -> postgresql+psycopg2://
    - postgresql://          -> postgresql+psycopg2://
    Without the explicit driver SQLAlchemy may pick psycopg3, which is not
    installed.
    """
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg2://" + url[len("postgresql://") :]
    return url


DATABASE_URL = _normalize_database_url(settings.DATABASE_URL)

_engine_kwargs: dict = {"future": True, "pool_pre_ping": True}

if DATABASE_URL.startswith("sqlite"):
    # SQLite: allow use across FastAPI's threadpool.
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # PostgreSQL / Neon: recycle connections before the provider drops them.
    _engine_kwargs["pool_recycle"] = 300

engine = create_engine(DATABASE_URL, **_engine_kwargs)

SessionLocal = sessionmaker(
    bind=engine, autoflush=False, autocommit=False, class_=Session
)


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
