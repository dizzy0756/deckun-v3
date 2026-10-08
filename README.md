# Deckun

E-commerce platform for a premium outdoor gear store.

## Structure

```
deckun/
  backend/          FastAPI app
  customer-web/     HTML/CSS/JS storefront
  admin-web/        HTML/CSS/JS admin app
  docs/             plan, schema, API spec, decisions log
  scripts/          seed, migration, SEO tools
```

## Getting started

```bash
cd deckun/backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python -m uvicorn app.main:app --reload
```

See `docs/` for the build plan and architecture documents.
