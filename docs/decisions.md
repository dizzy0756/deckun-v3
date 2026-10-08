# Decision Log

## Phase 0 — Open Decisions (spec section 63)

All decisions recorded with date and rationale. Format: **Decision → Choice (Date)**.

---

### Image storage
**Decision → Cloudflare R2 (S3-compatible object storage)**  
**Date:** 2026-10-08  
**Reason:** The plan (Step 0.2) recommends an S3-compatible service so URLs/metadata live in PostgreSQL and the provider can change later. Cloudflare R2 offers S3-compatible API, good global CDN, and pay-as-you-go pricing that suits a small store. The `STORAGE_*` variables are already listed in `.env.example`.

---

### WhatsApp provider
**Decision → Twilio WhatsApp Business API (primary), Gupshup (fallback)**  
**Date:** 2026-10-08  
**Reason:** Starting approval early is critical (plan Step 0.3). Twilio has clear India support, well-documented API, and reliable message delivery. Gupshup is a strong fallback with competitive per-message pricing for high volumes. Both support template-based order confirmations. Recommendation: start Twilio approval now, sign up for Gupup as backup in parallel.

---

### Managed PostgreSQL
**Decision → AWS RDS for PostgreSQL (with automated backups + PITR)**  
**Date:** 2026-10-08  
**Reason:** The plan (Step 0.2 / spec section 51) requires automated backups and point-in-time recovery. AWS RDS is a mature, well-documented managed PostgreSQL offering that satisfies these requirements. Alternatives: Google Cloud SQL, Azure Database for PostgreSQL, or Supabase. Will revisit cost optimization during Phase 6 (Deployment) if usage is low.

---

### Low-stock threshold
**Decision → Database setting, default = 3, admin-editable**  
**Date:** 2026-10-08  
**Reason:** The plan recommends storing this in a `settings` table with a default value (~3) that the admin can change. Keeping it in the database (not hardcoded) lets the owner adjust without a code deploy. The seed script will set this value (Step 1.4).

---

### Delivery fee entry
**Decision → Admin-entered at order confirmation time**  
**Date:** 2026-10-08  
**Reason:** The plan (Step 0.2) recommends the admin enters the delivery fee when confirming the order, and the total updates accordingly. For COD orders, the customer sees "delivery fee to be confirmed" before admin confirmation. The fee is stored on the `orders` table as `delivery_fee` at confirmation time, preserving the value at that point in history.

---

### Customer password recovery
**Decision → Mobile/email OTP via Twilio SendGrid (email) or AWS SNS (SMS)**  
**Date:** 2026-10-08  
**Reason:** The plan notes this affects the schema (spec section 63). Decision: send a one-time password (OTP) via email using SendGrid (already common on AWS/RDS stacks) or SMS via AWS SNS for customers who registered with mobile-only. The OTP expires after 15 minutes. This requires a `password_resets` table with `token`, `expires_at`, and `used_at` fields. Admin-assisted reset remains a fallback for support.

---

### Admin password recovery
**Decision → Email link reset with secure token, plus CLI reset script**  
**Date:** 2026-10-08  
**Reason:** The plan recommends a secure reset by email link or a manual CLI reset script. Both are implemented: the admin receives an email with a time-limited reset link (JWT-based token), and a `scripts/reset_admin_password.py` script allows manual CLI reset for emergencies. Admin email uniqueness is enforced at the database level.

---

### SEO rendering approach (also Step 0.6)
**Decision → Option A: Server-side rendering with Jinja2 templates**  
**Date:** 2026-10-08  
**Reason:** The plan (Step 0.6) offers two options for SEO-safe rendering. Option A (Jinja2 server-side rendering in FastAPI) is recommended because it keeps one source of truth (FastAPI), handles live price/availability, and ensures Google can read product pages without client-side JS. Product/category pages render with full metadata (title, meta description, Open Graph, JSON-LD) in the HTML response. Plain JavaScript adds cart and interactive behavior on top.

---

### Frontend framework
**Decision → Vanilla HTML/CSS/JS (no React/Vue for V1)**
**Date:** 2026-10-08  
**Reason:** The spec describes a stack of "plain HTML/CSS/JS with FastAPI." With Jinja2 server-side rendering for SEO-critical pages and lightweight client-side JS for interactivity, a full frontend framework adds unnecessary complexity for V1 (spec section 60: non-goals). Keeping it simple aligns with the "Keep it simple" rule in the plan.

---

### Notes / Deferred

- **WhatsApp approval lead time:** Starting this now (Step 0.3). If approval is delayed, launch without automated WhatsApp confirmation (flagged as risk in spec section 60/V2).
- **Hosting provider cost optimization:** Revisit during Phase 6. If traffic is low, consider Render or a single VPS instead of AWS.
- **Local database:** Docker and PostgreSQL are not available on the local machine. Using SQLite (`sqlite:///deckun.db`) for local development/testing via SQLAlchemy. For production, `DATABASE_URL` will point to managed PostgreSQL. Models use cross-database-compatible types. PostgreSQL will be required for production (Phase 6).
