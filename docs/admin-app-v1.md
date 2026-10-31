# Deckun — Admin Application V1

**Spec references:** sections 27–36, 55
**Goal:** a fast, simple, mobile-first HTML/CSS/JS control panel that lets the owner run a full day of operations from a phone.
**Working conventions:** vanilla HTML/CSS/JS (no React/Vue for V1, per `docs/decisions.md`). One source of truth is the FastAPI backend; the admin app is a thin client that calls `/api/admin/*` and `/api/auth/admin/login`.

---

## 1. Tech stack & architecture

| Layer | Choice | Reason |
| --- | --- | --- |
| Runtime | Browser (ES2022) | No build step; deploy as static files |
| Auth | JWT bearer in `localStorage` | Backend issues admin tokens via `/api/auth/admin/login`; token type `admin` |
| HTTP | `fetch` wrapper module | Single `api.js` handles tokens, loading overlays, error toasts |
| Routing | Hash-based SPA (`#dashboard`, `#orders/123`) | No server-side routing needed; works on static hosting |
| Styling | Single `css/style.css` (no framework) | Mobile-first; large touch targets; minimal |
| Templates | String interpolation in JS | No build tool; views rendered into `#app` |
| Deployment | Static files | Cloudflare Pages / similar |

### Token flow
```
login.html → POST /api/auth/admin/login { email, password }
           → { access_token, token_type: "bearer }
           → localStorage.setItem("admin_token", access_token)
           → redirect to index.html#dashboard

index.html → all /api/admin/* requests include
            Authorization: Bearer <admin_token>
            (api.js injects header automatically)
          → 401 → redirect to login.html
```

### Project structure
```
admin-web/
├── login.html          Login page
├── index.html           Shell: nav + content area
├── css/
│   └── style.css        Shared styling (mobile-first)
├── js/
│   ├── api.js           fetch wrapper: auth, loading, errors, toast
│   ├── auth.js          Token get/set, logout, redirect-if-unauthorized
│   ├── app.js           Router, nav rendering, view dispatch
│   └── views/
│       ├── dashboard.js
│       ├── orders.js
│       ├── create-order.js
│       ├── products.js
│       ├── inventory.js
│       ├── reviews.js
│       ├── promotions.js
│       ├── content.js
│       ├── pincodes.js
│       ├── settings.js
│       └── customers.js
```

---

## 2. API surface (admin endpoints)

All admin endpoints require a bearer token issued by `POST /api/auth/admin/login`.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/admin/login` | `{ email, password }` → `{ access_token }` |
| GET | `/api/admin/dashboard/` | Today's orders, pending, revenue, low stock, recent orders, unread notifications |
| GET | `/api/admin/orders/?status=&skip=&limit=` | List orders (filtered by status) |
| GET | `/api/admin/orders/{id}` | Order detail (items, history, payment, address) |
| POST | `/api/admin/orders/{id}/confirm` | Confirm order, set delivery_fee |
| PATCH | `/api/admin/orders/{id}/status` | Change status with reason |
| POST | `/api/admin/orders/{id}/cancel` | Cancel with reason |
| POST | `/api/admin/orders/whatsapp` | Create WhatsApp order |
| GET | `/api/admin/products/?status=&skip=&limit=` | List products |
| POST | `/api/admin/products/` | Create product (variants, images, specs) |
| GET | `/api/admin/products/{id}` | Product detail (with variants, images, specs) |
| PATCH | `/api/admin/products/{id}` | Update product |
| DELETE | `/api/admin/products/{id}` | Archive product |
| POST | `/api/admin/products/{id}/images` | Add image |
| DELETE | `/api/admin/products/{id}/images/{image_id}` | Delete image |
| GET | `/api/admin/inventory/?low_stock_only=` | List variants with stock |
| PATCH | `/api/admin/inventory/variants/{variant_id}/stock` | Set stock |
| GET | `/api/admin/customers/` | List customers |
| GET | `/api/admin/notifications/?unread_only=` | List notifications |
| PATCH | `/api/admin/notifications/{id}/read` | Mark read |
| GET | `/api/admin/settings/` | List settings |
| PATCH | `/api/admin/settings/{key}` | Update setting value |
| GET | `/api/admin/promotions/` | List promotions |
| POST | `/api/admin/promotions/` | Create promotion |
| GET | `/api/admin/promotions/{id}` | Get promotion |
| PATCH | `/api/admin/promotions/{id}` | Update promotion |
| DELETE | `/api/admin/promotions/{id}` | Deactivate promotion |
| GET | `/api/admin/reviews/?status=` | List reviews |
| PATCH | `/api/admin/reviews/{id}` | Change review status |
| GET | `/api/admin/pincodes/` | List pincodes |
| POST | `/api/admin/pincodes/` | Create pincode |
| PATCH | `/api/admin/pincodes/{id}` | Update pincode |
| DELETE | `/api/admin/pincodes/{id}` | Deactivate pincode |
| GET | `/api/admin/content/` | List website content |
| PATCH | `/api/admin/content/{key}` | Update content |

### Key enums (for UI controls)

| Enum | Values |
| --- | --- |
| `product_status` | `active`, `hidden`, `archived` |
| `order_status` | `placed`, `confirmed`, `preparing`, `out_for_delivery`, `delivered`, `cancelled` |
| `review_status` | `pending`, `approved`, `hidden` |
| `order_source` | `website`, `whatsapp` |

---

## 3. Design rules (mobile-first)

- Large touch targets: buttons minimum 44×44 px
- Bottom or compact navigation (8 items or fewer)
- Status colors: `placed`=gray, `confirmed`=blue, `preparing`=amber, `out_for_delivery`=orange, `delivered`=green, `cancelled`=red
- One primary action per screen
- Confirm dialogs for destructive actions (archive, cancel, delete)

### Navigation (bottom bar, icons + short labels)

| Screen | Label | Build order | Notes |
| --- | --- | --- | --- |
| Dashboard | Home | 1 | Today's orders, pending, revenue, low stock |
| Orders | Orders | 2 | List with status filter → detail → confirm/status/cancel |
| WhatsApp | WA Order | 3 | Create order via WhatsApp |
| Products | Products | 4 | List → create/edit → variants, specs, images |
| Inventory | Inventory | 6 | Stock levels, quick adjust |
| Reviews | Reviews | 7 | Pending queue → approve/hide |
| Promotions | Promos | 8 | List → create/edit/delete |
| Content | Content | 9 | Website content keys |
| PIN Codes | PIN Codes | 10 | CRUD serviceable pincodes |
| Settings | Settings | 10 | Low-stock threshold |
| Customers | Customers | 11 | Read-only list → order history |

---

## 4. Screen-by-screen wireframes

### 4.1 Login (`login.html`)
```
+─────────────────────+
│  [logo]             │
│  Deckun Admin       │
│                     │
│  Email              │
│  [               ]  │
│  Password           │
│  [               ]  │
│                     │
│  [ SIGN IN       ]  │
│  [forgot password]  │
+─────────────────────+
```

### 4.2 Shell (`index.html`)
Top: header with title + user avatar.
Main: `<div id="app">` — views render here.
Bottom: nav bar (scrolls up on scroll-down, shows on scroll-up).
Toast: `<div id="toast">` — transient messages from `api.js`.

### 4.3 Dashboard
```
+─────────────────────+
│  Deckun     ⋮   🔔2 │  (header: title, avatar menu, unread count)
├─────────────────────┤
│  TODAY               │
│  Orders: 3   Pending: 1│
│  Revenue: ₹2,499     │
│  Low stock: 2        │
├─────────────────────┤
│  RECENT ORDERS        │
│  #D-1001 · ₹2,499     │
│  [pending] · 2 items  │
│  #D-1002 · ₹1,250     │
│  [delivered] · 1 item │
│  + View all orders    │
├─────────────────────+
│  [Home][Orders][...+] │  (bottom nav)
+─────────────────────+
```

### 4.4 Orders list
```
+─────────────────────+
│  ← Orders   [filter ▼] │
├─────────────────────┤
│  #D-1003              │
│  Placed · 3 items     │
│  ₹2,499 · 2h ago      │
│  ─                    │
│  #D-1002              │
│  Delivered · 1 item   │
│  ₹1,250 · 1d ago      │
│  ...                  │
├─────────────────────┤
│  Filter: All | Placed │
│  (status chips)      │
└─────────────────────┘
```
Tap an order → detail.

### 4.5 Order detail
```
+─────────────────────+
│  ← #D-1003            │
├─────────────────────┤
│  [pending] badge     │
│  ─                    │
│  Customer: Ramesh    │
│  98765 43210         │
│  123 Main St, BLR    │
│                     │
│  ITEMS               │
│  Alpine Pro Tent      │
│  2-Person / Forest Grn│
│  ×1 · ₹13,499        │
│                     │
│  Total: ₹13,499      │
│  Delivery fee: —     │
│                     │
│  STATUS HISTORY      │
│  placed · 2h ago     │
│                     │
│  [Confirm Order]     │
│  [Change Status ▼]   │
│  [Cancel Order]      │
└─────────────────────┘
```

### 4.6 Confirm order (modal)
```
Confirm Order #D-1003
─────────────────────
Delivery fee (paise):
[    4000            ]

[Cancel]  [Confirm]
```

### 4.7 Change status (modal)
```
Change Status
─────────────────────
[ ] confirmed
[•] preparing
[ ] out_for_delivery
[ ] delivered
[ ] cancelled

Reason (optional):
[                   ]

[Cancel] [Save]
```
Disabled transitions: cannot set back from a future state; cannot cancel after `out_for_delivery`.

### 4.8 WhatsApp order
```
+─────────────────────+
│  ← WhatsApp Order   │
├─────────────────────┤
│  Customer           │
│  Name  [         ]  │
│  Mobile [         ] │
│  Email  [         ] │
│                     │
│  Address            │
│  Line 1 [         ] │
│  City   [         ] │
│  State  [         ] │
│  Pincode [        ] │
│  Phone  [         ] │
│                     │
│  ADD ITEMS           │
│  [Product ▼] [qty 1] │
│  Alpine Pro Tent     │
│  ₹14,999 × 1         │
│  [+] Add another]   │
│                     │
│  Payment: [COD ●]   │
│  [Place Order]      │
└─────────────────────┘
```

### 4.9 Products list / detail / edit

List: card per product (image, name, price, variant count, stock summary, status chip). FAB `[+]`.

Detail: all fields, variants table (sku, name, price, stock, active), images gallery (reorder/drag, delete), specifications list, meta fields. `[Edit]`, `[Archive]`.

Edit form: same layout, inputs in edit mode. `[Save]`, `[Discard]`.

### 4.10 Inventory
```
+─────────────────────+
│  ← Inventory  [low] │
├─────────────────────┤
│  Alpine Pro Tent     │
│  2-Person / Forest Grn│
│  SKU: ALP-PRO-TENT... │
│  Stock: [ 12    ] [✓]│
│  ─                    │
│  Summit Poles        │
│  Stock: [ 5     ] [✓]│
└─────────────────────┘
```

### 4.11 Reviews
```
+─────────────────────+
│  ← Reviews  [pending]│
├─────────────────────┤
│  ★★★★☆ Ramesh K      │
│  Alpine Pro Tent     │
│  "Great tent!"       │
│  pending · 2h ago    │
│  [Approve] [Hide]    │
└─────────────────────┘
```

### 4.12 Promotions
List: promo card (name, discount, dates, active toggle). FAB `[+]`.

Create/edit: `{ code, name, description, discount_type: percent|fixed, discount_value, starts_at, ends_at, is_active, product_ids[] }`. Product picker: search/select from active products.

### 4.13 Website content
```
+─────────────────────+
│  ← Website Content  │
├─────────────────────┤
│  hero_title         │
│  [Premium Outdoor.. ]│
│                     │
│  about_text         │
│  [We are Deckun...] │
│                     │
│  contact_whatsapp   │
│  [+91-98765-43210] │
└─────────────────────┘
```

### 4.14 PIN codes
```
+─────────────────────+
│  ← PIN Codes        │
├─────────────────────┤
│  560001  Bangalore  │
│  [✓] active          │
│  ─                    │
│  110001  Delhi       │
│  [ ] deactivated      │
│  [+] Add PIN code    │
└─────────────────────┘
```

### 4.15 Settings
```
+─────────────────────+
│  ← Settings         │
├─────────────────────┤
│  low_stock_threshold │
│  [ 3             ]  │
│  (integer)          │
└─────────────────────┘
```

### 4.16 Customers
```
+─────────────────────+
│  ← Customers        │
├─────────────────────┤
│  Ramesh Kumar       │
│  98765 43210        │
│  3 orders            │
│  ─                    │
│  Priya Sharma        │
│  91234 56789        │
│  1 order             │
└─────────────────────┘
```

---

## 5. Money formatting

- Backend stores all amounts in **integer paise**.
- Admin app converts to rupees for display: `₹` + `(paise / 100).toFixed(2)`.
- On input (delivery fee, stock), send integers back.

---

## 6. Done checklist

- [ ] Login → admin token stored in `localStorage`
- [ ] Dashboard renders summary cards + recent orders
- [ ] Orders list with status filter → detail view
- [ ] Confirm order (delivery fee), change status, cancel
- [ ] WhatsApp order creation
- [ ] Products list → detail → edit (variants, images, specs)
- [ ] Inventory list with quick stock adjust
- [ ] Reviews pending queue → approve/hide
- [ ] Promotions list → create/edit/delete
- [ ] Website content edit
- [ ] PIN codes CRUD
- [ ] Settings edit
- [ ] Customers read-only list
- [ ] 401 → auto-redirect to login
- [ ] Loading overlay + toast messages
- [ ] Mobile touch-target audit

**Tag:** `v0.3-admin`
