# Deckun V1 — Step-by-Step Build Plan

**Source of truth:** Deckun E-Commerce Platform — Project Specification V1.0 **Purpose:** An ordered, executable plan to take Deckun from the finalized requirements to a live, SEO-safe production store. **Working conventions:** concept first, then code · semantic git commits · Windows + VS Code · secrets never in Git.

---

## 1. How to use this plan

The spec fixes the build order: **Database → Backend → Admin App → Customer Website → Payments → Deployment**. This plan keeps that order, adds a **Phase 0 (Foundations and decisions)** before it and a **Phase 7 (Launch and post-launch)** after it, and breaks every phase into numbered steps with a clear *Done when* checklist.

Rules that apply to every phase:

- **Concept before code.** Before writing each module, write a short note (5–10 lines) on what it does, which business rule from the spec it enforces, and how it will be tested. Then implement.
- **Test inside each phase**, not at the end (spec section 52 and 59).
- **Backend is the source of truth.** Stock, payment status, order locking and authorization are always decided server-side.
- **Never hard-delete business records.** Use Active / Hidden / Archived.
- **Scope changes** are checked against the spec before being built. Anything in the V1 non-goals list (spec section 60) is rejected or parked for V2.
- **Keep it simple.** Fewer than 20 products and usually fewer than 10 orders/day (sometimes 10–50). Be robust, not over-engineered.

### Suggested timeline (solo developer, part-time friendly)

| Phase | Focus | Estimate |
| --- | --- | --- |
| 0 | Foundations, decisions, SEO crawl | 1 week |
| 1 | Database | 1–1.5 weeks |
| 2 | FastAPI backend | 3–4 weeks |
| 3 | Admin application | 2–3 weeks |
| 4 | Customer website | 3 weeks |
| 5 | Payments + WhatsApp | 1.5–2 weeks |
| 6 | Deployment and hardening | 1 week |
| 7 | SEO-safe launch and monitoring | 1 week + ongoing |

Estimates are guidance, not commitments. Adjust after Phase 1.

---

## 2. Phase 0 — Foundations and open decisions

**Goal:** remove every blocker before schema design starts.

### Step 0.1 — Set up the repository and tooling

- Create one Git repository (monorepo) with this layout:

```text
deckun/
  backend/        FastAPI app
  customer-web/   HTML/CSS/JS storefront
  admin-web/      HTML/CSS/JS admin app
  docs/           this plan, schema, API spec, decisions log
  scripts/        seed, migration helpers, SEO tools
```

- Add `.gitignore` (venv, `.env`, `__pycache__`, uploads) and `.env.example` listing variable names only.
- Adopt **semantic commits**: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, e.g. `feat(orders): enforce lock at out-for-delivery`.
- Branching: `main` (production), `develop` (integration), short-lived `feat/...` branches.
- Local environment: Python 3.11+, virtual environment, VS Code, local PostgreSQL (or Docker), Git.

**Done when:** repo exists, a hello-world FastAPI endpoint runs locally, first commit follows the convention.

### Step 0.2 — Resolve the open decisions (spec section 63)

Create `docs/decisions.md` and record each choice with date and reason.

| Decision | What to decide | Recommended approach |
| --- | --- | --- |
| Image storage | Provider for object storage | Pick an S3-compatible service (for example Cloudflare R2) so URLs and metadata are stored in PostgreSQL and the provider can change later |
| WhatsApp provider | Business API provider | Shortlist 2–3 providers; compare approval time, template-message pricing, India support. Start approval early, it can take days |
| Managed PostgreSQL | Hosting provider | Choose one with automated backups and point-in-time recovery (spec section 51) |
| Low-stock threshold | Global number | Store as a setting in the database, default to a small number (for example 3) and let the admin change it |
| Delivery fee entry | How admin enters it | Recommended: admin enters the fee when confirming the order; the total updates; customer sees "delivery fee to be confirmed" before that for COD |
| Customer password recovery | Recovery method | Needs a channel: WhatsApp/SMS OTP or admin-assisted reset. Decide now because it affects the schema |
| Admin password recovery | Method | Secure reset by email link or a manual CLI reset script |

**Done when:** every row has a recorded decision (or an explicit "decide by Phase X" date).

### Step 0.3 — Start accounts and approvals that take time

- Razorpay account (KYC can take days) and test-mode keys.
- WhatsApp Business API provider sign-up and template approval for the order-confirmation message.
- Render, Cloudflare, database and storage accounts.
- Domain DNS access for deckun.in.

### Step 0.4 — Crawl and snapshot the existing site (SEO baseline)

Do this now, while the old site is untouched.

1. Crawl every URL of the current site (a crawler tool or a small script) and export: URL, title, meta description, H1/H2s, canonical, status code.
2. Save the current `sitemap.xml` and `robots.txt`.
3. Record the Google Search Console baseline: top queries, top pages, impressions, clicks, average position, indexed page count.
4. Record the existing Google Analytics and Meta Pixel IDs.
5. Build the **URL map** (old to new), for example `/products/foldable-table.html` to `/products/foldable-table`.
6. Decide the final URL scheme once, and keep it stable.

**Done when:** `docs/seo-baseline/` holds the crawl export, URL map, sitemap, robots and Search Console screenshots.

### Step 0.5 — Content and asset inventory

Collect product photos, descriptions, specifications, variant names/prices/stock, category list, About and Contact text, logo, brand colours, social links, WhatsApp number, and the initial list of serviceable PIN codes.

### Step 0.6 — Rendering decision for SEO (important)

The stack is plain HTML/CSS/JS with FastAPI. Product pages must be readable by Google **without depending on late client-side rendering**. Two safe options:

- **A (recommended):** FastAPI renders product and category pages server-side with Jinja2 templates (title, meta, Open Graph, JSON-LD all in the HTML response). Plain JS adds cart and interaction on top.
- **B:** Static pages generated by a build script from the database, served from Cloudflare, rebuilt when products change.

Option A keeps one source of truth and handles live price/availability. Record the choice in `docs/decisions.md`.

---

## 3. Phase 1 — Database (Database Architecture V1)

**Goal:** a production-ready PostgreSQL schema (spec sections 44, 45, 53, 64).

### Step 1.1 — Write the Database Architecture V1 document

Produce `docs/database-architecture-v1.md` containing the 23 items of spec section 64: ER diagram, every table and field with types, keys, unique constraints, indexes, relationships and rules.

### Step 1.2 — Design the tables

Core tables from the spec, plus supporting ones identified below:

- **Identity:** `users`, `addresses`, `admin_users`
- **Catalogue:** `products`, `product_variants`, `product_images`, `product_specifications`, `categories` (fixed, seeded, not admin-managed)
- **Commerce:** `carts`, `cart_items`, `orders`, `order_items`, `payments`
- **Engagement:** `reviews`, `promotions`, `promotion_products`, `notifications`
- **Operations:** `website_content`, `serviceable_pincodes`, `settings` (low-stock threshold etc.)
- **Recommended supporting tables:** `order_status_history` (audit trail), `inventory_movements` (every stock change with reason), `payment_events` (raw webhook log for idempotency)

### Step 1.3 — Key design rules to encode in the schema

- **Money** stored as integer paise (or `NUMERIC(10,2)`), never floats.
- **Order items snapshot** name, variant name, unit price and discount at purchase time, so later edits or archiving never change history.
- **Product status** enum: `active`, `hidden`, `archived`. No hard delete.
- **Variant model:** a product either uses its own price/stock or has variants. Enforce with a clear rule (for example, products with variants always sell through a variant row).
- **Stock** is non-negative (`CHECK (stock >= 0)`).
- **Order status** enum: `placed`, `confirmed`, `preparing`, `out_for_delivery`, `delivered`, `cancelled`; separate `payment_status` and `payment_method` (`cod`, `online`) and `order_source` (`website`, `whatsapp`).
- **Uniqueness:** unique mobile number for users, unique admin email, unique order number, unique Razorpay payment id (idempotency).
- **Reviews:** one review per user per product, linked to a delivered order item.
- **Specifications:** flexible key/value rows per product.
- **Images:** store object-storage URL/key, sort order and alt text only.
- **Timestamps** (`created_at`, `updated_at`) on every table; soft-state fields instead of deletes.
- **Indexes** on slugs, foreign keys, order status, created date, mobile number.

### Step 1.4 — Implement with migrations

- Use **SQLAlchemy 2.x models + Alembic migrations** so the schema is versioned in Git.
- Create the initial migration, run it on a local database, then on a clean second database to prove it reproduces.
- Write a **seed script**: categories, settings (low-stock threshold), a sample admin, 3–5 sample products with variants, sample PIN codes.

### Step 1.5 — Test the schema

- Constraint tests: negative stock rejected, duplicate mobile rejected, invalid status rejected.
- Deletion tests: archived product still joins to historical orders.
- Quick query checks for dashboard-style queries (today's orders, low stock).

**Done when:** migrations run cleanly from zero, seed data loads, constraint tests pass, and the schema doc matches the code. Commit: `feat(db): initial schema and migrations`.

---

## 4. Phase 2 — FastAPI backend

**Goal:** all business logic behind a clean API used by both frontends (spec sections 43, 54).

### Step 2.1 — Project skeleton

- Structure: `app/` with `api/` (routers), `services/` (business logic), `models/`, `schemas/` (Pydantic), `core/` (config, security, db session), `tests/`.
- Config via environment variables (Pydantic settings). Health-check endpoint. Consistent error format. CORS limited to the real frontend origins.
- Rule: routers stay thin; rules live in **services** (for example `OrderService`, `InventoryService`) so customer and admin paths share the same logic.

### Step 2.2 — Write the API specification first

Produce `docs/api-spec-v1.md` (or rely on FastAPI's OpenAPI, reviewed by you) grouping endpoints into: Auth, Catalogue, Cart, Checkout/Orders, Payments, Reviews, Account, Content, Admin.

### Step 2.3 — Authentication and security

1. Customer registration and login (mobile + password), password hashing with a modern algorithm (argon2 or bcrypt), JWT or secure session cookies.
2. Separate admin login (email + password) with its own token audience, so a customer token can never open admin routes.
3. Dependency-based authorization (`get_current_customer`, `get_current_admin`).
4. Rate limiting on login, registration and password recovery.
5. Input validation through Pydantic on every endpoint.
6. Password recovery per the Phase 0 decision.

**Tests:** wrong password, expired token, customer calling admin route, tampered token.

### Step 2.4 — Catalogue APIs

- Public: list active products, product by slug (with variants, images, specs, availability label, approved reviews, active promotion price).
- Availability returns only `in_stock` / `low_stock` / `out_of_stock`, never exact numbers (spec section 11).
- Admin: create/edit/hide/archive products, manage variants, specifications, images, featured flag, product discount, stock.
- Image upload: validate type and size, resize/optimise with Pillow, upload to object storage, save URL and order in the database; delete and reorder endpoints.

### Step 2.5 — Promotions

Product-specific promotions with start/end dates and percentage/value. One pure function computes the **effective price** (base, product discount, active promotion) and is used by catalogue, cart and checkout so prices never disagree.

### Step 2.6 — Cart APIs

Server-side cart for logged-in customers (add, change quantity, remove, with variants). Totals are always recomputed on the server. Decide guest-cart behaviour (recommended: guest cart in browser storage, merged on login).

### Step 2.7 — Serviceable PIN codes and delivery fee

- Admin CRUD for serviceable PIN codes; public endpoint to check a PIN.
- Delivery fee per the Phase 0 decision (admin-entered, stored on the order).

### Step 2.8 — Checkout and orders (the core)

Implement this carefully and test heavily.

1. Validate the cart, the PIN code and each item's availability on the server.
2. Create the order in one **database transaction**: order, order items (price snapshots), order number.
3. **COD flow:** order is `placed`, awaiting admin confirmation. Stock reduces **on admin confirm** (spec section 20).
4. **Online flow:** create the order plus a Razorpay order; stock reduces when payment is verified (Phase 5 completes this).
5. **Order lifecycle rules:** allowed transitions only (`placed` to `confirmed` to `preparing` to `out_for_delivery` to `delivered`; cancel allowed before out-for-delivery). Write every change to `order_status_history`.
6. **Customer edit/cancel lock:** enforced in the service layer; once `out_for_delivery`, customer changes are rejected (spec sections 19, 47).
7. **Cancellation** restores stock if it had been reduced, with an `inventory_movements` record.
8. **Admin-created WhatsApp orders:** same service, `order_source = whatsapp`.

### Step 2.9 — Inventory safety

- Reduce stock with an atomic conditional update (`UPDATE ... SET stock = stock - :qty WHERE id = :id AND stock >= :qty`) or `SELECT ... FOR UPDATE`, inside the order transaction.
- Log each change in `inventory_movements`.
- Test with simultaneous requests for the last unit; exactly one must succeed.
- Decide and document the reservation policy for online payments (for example, a short stock hold of about 10–15 minutes while payment is in progress, released on failure or timeout).

### Step 2.10 — Reviews

Customers may review only products from `delivered` orders. Reviews start `pending`; admin approves, hides or removes. Public API returns approved reviews only.

### Step 2.11 — Website content and notifications

- Predefined content keys (hero heading, description, image, CTA text, about, contact info, WhatsApp number, social links, featured products). Public read, admin edit. Controlled CMS only: no layout editing.
- Notifications table: new order, pending order, low stock, review awaiting moderation. Created by services when events happen.

### Step 2.12 — Admin APIs

Dashboard summary (today's orders, pending orders, revenue, low stock, recent orders, notifications), orders list/detail/status change/cancel, inventory view, customers (read-only, no edit endpoint), settings (low-stock threshold).

### Step 2.13 — Automated tests and quality gates

- `pytest` with a test database. Cover auth, catalogue, price calculation, cart, order lifecycle, lock rule, stock concurrency, reviews, permissions.
- Run linting/formatting (for example Ruff) before commits.

**Done when:** every API in the spec is implemented, the test suite is green, and the OpenAPI docs are reviewed. Commit milestone tag: `v0.2-backend`.

---

## 5. Phase 3 — Admin application

**Goal:** a fast, simple, mobile-first control panel (spec sections 27–36, 55).

### Step 3.1 — Design first

- Sketch each screen at phone width first (low-fidelity wireframes), then desktop.
- Design rules: large touch targets, bottom or compact navigation, minimal typing, clear status colours, one primary action per screen.

### Step 3.2 — Shell and shared pieces

Login screen, token handling, API client wrapper (handles auth errors and loading/error states), navigation, toast messages, confirm dialogs, form components. Keep a small shared CSS file.

### Step 3.3 — Build screens in this order (highest daily value first)

1. **Dashboard** — today's orders, pending, revenue, low stock, recent orders, notifications.
2. **Orders** — list with status filter, order detail, confirm, change status, cancel, delivery fee entry, status history.
3. **Create WhatsApp Order** — pick products/variants, enter customer details, validate through the backend.
4. **Products** — list, create/edit form, variants, specifications, discount, featured, hide/archive.
5. **Images** — upload, delete, reorder, crop/resize (client-side crop helper plus server-side optimisation).
6. **Inventory** — available / low / out of stock, variant stock, quick adjust.
7. **Reviews** — pending queue, approve, hide.
8. **Promotions** — create/edit with products and dates.
9. **Website Content** — form of predefined fields.
10. **Serviceable PIN Codes** and **Settings**.
11. **Customers** — read-only list and detail with order history.

### Step 3.4 — Mobile checks

Test on a real phone, including slow network. Verify image uploads from a phone camera or gallery.

**Done when:** the owner can complete a full day's operations (confirm an order, adjust stock, add a product, approve a review) from a phone without touching code or the database. Tag: `v0.3-admin`.

---

## 6. Phase 4 — Customer website

**Goal:** a premium, mobile-first outdoor-brand storefront with SEO built in (spec sections 5–6, 38, 56).

### Step 4.1 — Design system

Define colours, typography, spacing, button styles and product-card style that feel like outdoor/adventure/premium, not a generic template. Mobile layouts first (about 90% of traffic).

### Step 4.2 — Build pages

`Home`, `Products`, `Product detail`, `Cart`, `Checkout`, `Login`, `Register`, `Account` (profile, saved address), `Orders`, `Order detail`, `About`, `Contact`.

### Step 4.3 — Key behaviours

- Each product shows **Add to Cart** and **Buy via WhatsApp** (pre-filled message with product and variant).
- Variant selector updates price and availability dynamically.
- Availability text only: In Stock / Low Stock / Out of Stock.
- Checkout: name, mobile, address, pincode, landmark; PIN check before payment; COD message "Order placed — awaiting confirmation".
- Order page: edit/cancel buttons shown only before out-for-delivery, with the backend as the real enforcer.
- Reviews: shown for approved ones; review form only for delivered purchases.
- Content (hero, about, contact, WhatsApp number, social links) comes from the website-content API.

### Step 4.4 — SEO implementation (built in, not added later)

- Server-rendered titles, meta descriptions, canonical URLs, Open Graph tags, semantic H1/H2 on every public page.
- Product structured data (`Product`, `Offer`, availability) and `LocalBusiness` structured data.
- Dynamic `sitemap.xml` and `robots.txt`.
- Clean URLs matching the URL map; **301 redirect rules** for every old `.html` URL.
- Lazy-loaded, correctly sized, modern-format images with alt text; fast first paint.
- Reintegrate Google Analytics and Meta Pixel with existing IDs.

### Step 4.5 — Analytics events

Track product view, add to cart, checkout started, purchase, WhatsApp click, plus popular products.

### Step 4.6 — Testing

Browser testing on common Android phones and iOS Safari, Lighthouse mobile audits (performance, SEO, accessibility), keyboard and screen-reader basics.

**Done when:** a customer can browse, register, add to cart and place a COD order end to end on a phone. Tag: `v0.4-storefront`.

---

## 7. Phase 5 — Payments and WhatsApp

**Goal:** safe online payment and the automated order confirmation (spec sections 21, 22, 26, 57).

### Step 5.1 — Razorpay integration

1. Backend creates a Razorpay order with the server-calculated amount.
2. Frontend opens Razorpay Checkout (UPI prominent).
3. On the success callback, the frontend sends the payment details to the backend, which **verifies the signature**. This is not final proof.
4. The **webhook** is the source of truth: verify the webhook signature, store the raw event in `payment_events`, and process each event **idempotently** (duplicate callbacks are safe).
5. On confirmed payment: mark payment paid, confirm the order, reduce stock, send WhatsApp confirmation.

### Step 5.2 — Failure and conflict handling

- Failed or cancelled payment leaves the order unpaid; release any stock hold.
- Payment succeeded but stock gone: flag the order for the admin with a notification; admin contacts the customer; refund is manual through Razorpay (spec section 22).
- Amount or order mismatch is rejected and flagged.

### Step 5.3 — WhatsApp confirmation

Send the initial confirmation (online orders on payment, COD on admin confirm) using the approved template and the chosen provider. Failures must not block the order: log and retry, and show a notification to the admin if sending fails.

### Step 5.4 — Payment test matrix (test mode)

Success, failure, user-cancelled, duplicate callback, duplicate webhook, delayed webhook, signature tampering, amount mismatch, stock conflict, COD flow, and cancel-after-payment.

**Done when:** every row of the matrix passes in Razorpay test mode. Tag: `v0.5-payments`.

---

## 8. Phase 6 — Deployment and hardening

**Goal:** a staging and a production environment that match each other (spec sections 50, 51, 58).

### Step 6.1 — Staging first

- Backend on Render, managed PostgreSQL, object storage, frontends on Cloudflare, all using a **staging** subdomain and test keys.
- Environment variables set in the hosting dashboards (`DATABASE_URL`, Razorpay keys, `JWT_SECRET`, WhatsApp key, storage key).
- Run migrations as part of deploy. Configure CORS for the exact staging origins.
- Note: free-tier backend instances may sleep; use an always-on plan for production so checkout and webhooks respond reliably.

### Step 6.2 — Security review

HTTPS everywhere, secure cookies/tokens, admin routes protected, rate limits active, no secrets in Git history, dependency audit, error responses that leak nothing, webhook endpoint accepts only valid signatures.

### Step 6.3 — Backups and recovery

Enable automated backups with sensible retention, **perform one real restore test** into a scratch database, and write the recovery steps in `docs/runbook.md`.

### Step 6.4 — Monitoring

Error tracking, uptime check on the site and webhook endpoint, and log review for payment events.

### Step 6.5 — Full staging test pass

Run the spec's test categories (section 59): authentication, products, cart, orders, payments, admin, SEO, mobile. Fix everything found.

**Done when:** a full end-to-end rehearsal on staging passes, including a restore drill. Tag: `v0.6-staging-ready`.

---

## 9. Phase 7 — SEO-safe launch and post-launch

**Goal:** switch over without losing the current #1 ranking (spec sections 38–40).

### Step 7.1 — Pre-launch SEO verification

- Test **every old URL** from the URL map: it must return a single 301 to the correct new URL (no chains, no 404s).
- Compare titles, descriptions, headings and canonicals against the baseline crawl; keep or improve wording of high-ranking pages.
- Validate structured data and sitemap; confirm `robots.txt` does not block the site.
- Confirm analytics and Meta Pixel fire.

### Step 7.2 — Production data

Create the real admin account (strong password), load real products, images, variants, PIN codes and content. Switch Razorpay and WhatsApp to live keys; place one small real order to verify the whole flow, then cancel/refund it.

### Step 7.3 — Launch day checklist

1. Final backup of the old site.
2. Lower DNS TTL a day ahead.
3. Point deckun.in to the new deployment; confirm HTTPS.
4. Re-test redirects, product pages, checkout and the admin on a phone.
5. Submit the new sitemap in Search Console.
6. Announce the new site and WhatsApp ordering path to existing customers.

Choose a low-traffic time and avoid launching right before a busy period.

### Step 7.4 — First 30 days

- **Daily (week 1):** Search Console coverage and crawl errors, 404 report, order flow, payment/webhook logs, admin feedback.
- **Weekly:** rankings and impressions against the baseline, Core Web Vitals, backups verified.
- Fix any lost redirects or ranking drops immediately; do not make large URL changes.

### Step 7.5 — Handover

Short owner guide (with screenshots) covering daily tasks: confirm orders, change status, add WhatsApp orders, update stock, add products, moderate reviews. Keep the runbook for you.

---

## 10. Risk register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| SEO ranking drops after launch | High | Phase 0 crawl, URL map, 301 tests, server-rendered metadata, Search Console monitoring |
| Overselling the last unit | High | Atomic stock updates inside transactions, concurrency tests |
| Payment marked paid from browser only | High | Webhook-verified payments, idempotent processing |
| WhatsApp provider approval delays | Medium | Start in Phase 0; ship without automation if needed and add later |
| Admin usability on phone | Medium | Phone-first design, real-device tests, owner feedback in Phase 3 |
| Scope creep | Medium | Compare every request to the spec and non-goals list |
| Backend cold starts or downtime | Medium | Always-on production plan, uptime monitoring |
| Data loss | High | Automated backups plus a tested restore |
| Secrets leaked | High | Environment variables only, `.env` ignored, review Git history |

---

## 11. Master checklist

- [ ] Phase 0 — repo, decisions, accounts, SEO crawl and URL map, content inventory
- [ ] Phase 1 — schema doc, models, migrations, seed data, constraint tests
- [ ] Phase 2 — auth, catalogue, cart, orders, inventory safety, reviews, content, admin APIs, test suite
- [ ] Phase 3 — admin app screens on mobile, owner-tested
- [ ] Phase 4 — storefront pages, SEO markup, analytics, redirects, Lighthouse
- [ ] Phase 5 — Razorpay, webhooks, WhatsApp confirmation, payment test matrix
- [ ] Phase 6 — staging, security review, backups and restore drill, monitoring
- [ ] Phase 7 — redirects verified, live keys, launch, Search Console, 30-day monitoring, handover

---

## 12. Immediate next action

Start **Step 0.1 and Step 0.4** this week (repository and SEO baseline), resolve the Step 0.2 decisions, then begin **Database Architecture V1**, the next stage named in the spec.
