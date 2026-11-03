from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.admin import router as admin_router
from app.api.auth import router as auth_router
from app.api.cart import router as cart_router
from app.api.catalogue import router as catalogue_router
from app.api.content import router as content_router
from app.api.notifications import router as notifications_router
from app.api.orders import router as orders_router
from app.api.pincodes import router as pincodes_router
from app.api.reviews import router as reviews_router
from app.core.config import settings

app = FastAPI(title="Deckun Backend", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(catalogue_router)
app.include_router(cart_router)
app.include_router(orders_router)
app.include_router(reviews_router)
app.include_router(content_router)
app.include_router(pincodes_router)
app.include_router(notifications_router)
app.include_router(admin_router)

# Serve product images
import os
os.makedirs("public/images/products", exist_ok=True)
app.mount("/images", StaticFiles(directory="public/images"), name="images")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Deckun API"}