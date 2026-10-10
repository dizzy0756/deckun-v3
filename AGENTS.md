# AGENTS.md

## Backend Commands (from `backend/`)

| Task | Command |
| --- | --- |
| Lint | `ruff check app/ scripts/` |
| Format | `ruff format app/ scripts/` |
| Run tests | `python -m pytest app/tests/ -v` |
| Migration check | `alembic check` |
| Apply migrations | `alembic upgrade head` |
| Seed database | `PYTHONPATH=. python scripts/seed_db.py` |
| Generate migration | `alembic revision --autogenerate -m "description"` |

## Project Structure

```
backend/
├── app/
│   ├── core/          # config.py, database.py (SQLAlchemy engine, session)
│   ├── models/        # SQLAlchemy 2.x ORM models (Base, enums, identity, catalogue, commerce, engagement, operations)
│   ├── schemas/       # Pydantic models (to be built next phase)
│   ├── api/           # FastAPI routers (to be built)
│   ├── services/      # Business logic (to be built)
│   └── tests/         # pytest schema tests
├── alembic/           # Migrations
├── scripts/           # seed_db.py, utility scripts
├── alembic.ini        # Alembic config
├── pytest.ini         # pytest config
└── requirements.txt   # Dependencies
```

## Notes

- Local dev uses SQLite (`sqlite:///deckun.db`); production uses PostgreSQL via `DATABASE_URL`.
- All monetary values stored as integer paise (never floats).
- Enums use `native_enum=False` with explicit `CHECK` constraints for cross-database compatibility.
- SQLite FK enforcement is enabled in test conftest via `PRAGMA foreign_keys = ON`.
- UUID columns store hex strings (32 chars, no dashes) on SQLite; use `.hex` for raw SQL.
