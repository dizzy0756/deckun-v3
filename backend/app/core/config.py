from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///deckun.db"
    SECRET_KEY: str = "dev-secret-change-in-prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ADMIN_TOKEN_EXPIRE_MINUTES: int = 60
    CORS_ORIGINS: list[str] = ["*"]

    # Public base URL of this API (used to build absolute media links).
    # Example: https://api.deckun.in
    PUBLIC_BASE_URL: str = ""

    # Public URL of the storefront (used in emails such as password reset).
    CUSTOMER_SITE_URL: str = "http://127.0.0.1:5500/customer-web"

    # --- Cloudflare R2 storage (S3 compatible) ---
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET: str = ""
    R2_PUBLIC_BASE_URL: str = ""

    # --- Email (SMTP) ---
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    SMTP_USE_TLS: bool = True

    # --- Google Sign-In ---
    GOOGLE_CLIENT_ID: str = ""

    # --- Razorpay ---
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""

    # Customer SMS/WhatsApp notifications.
    # provider: noop (log only) | whatsapp | msg91 | twilio
    MESSAGING_PROVIDER: str = "noop"
    MESSAGING_COUNTRY_CODE: str = "91"
    MESSAGING_TIMEOUT_SECONDS: int = 10

    # WhatsApp Cloud API (Meta)
    WHATSAPP_API_TOKEN: str = ""
    WHATSAPP_PHONE_NUMBER_ID: str = ""
    WHATSAPP_TEMPLATE_NAME: str = ""

    # MSG91 (India SMS)
    MSG91_AUTH_KEY: str = ""
    MSG91_SENDER_ID: str = ""
    MSG91_TEMPLATE_ID: str = ""

    # Twilio
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""

    model_config = {"env_file": ".env"}


settings = Settings()
