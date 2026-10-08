# Content and Asset Inventory

**Source site:** https://deckun.in
**Date captured:** 2026-10-08
**Captured by:** Automated scrape

---

## 1. Products (13 found on listing page)

| # | Name | Category | Price | Image | Description |
|---|------|----------|-------|-------|-------------|
| 1 | Foldable Moon Chair | Seating | ₹849–₹949 | `images/chair.jpg` | High-quality outdoor chair for picnics. Two sizes. |
| 2 | Foldable Table | Tables | ₹1,299–₹2,199 | `images/table.jpg` | Sturdy outdoor table. Three sizes. |
| 3 | Camping Tent | Shelter | ₹3,199–₹4,199 | `images/tent.jpg` | Spacious tent for camping. 2-person & 4-person. |
| 4 | Camping Cookware Set | Camping | ₹1,499–₹1,699 | `images/camping-cookware-set.jpg` | Complete cookware set. *(Not in sitemap)* |
| 5 | Foldable Chair with Armrest | Seating | ₹749–₹799 | `images/Foldable Chair with armrest.jpg` | Armrests + mesh back. Navy Blue & Olive Green. |
| 6 | Hammock with Mosquito Net | Seating | ₹1,699 | `images/Hammock-with-mosquito-net.jpeg` | 360° mosquito net. Holds 150kg. |
| 7 | Foldable Chair with Leg Rest | Seating | ₹1,199–₹1,299 | `images/Foldable Chair with Leg Rest.jpg` | Extendable footrest, carry bag. |
| 8 | Camping Tarp | Shelter | ₹2,599 | `images/Camping-Tarp.jpg` | Heavy-duty ripstop PE. *(503 on crawl)* |
| 9 | Cassette Stove | Cooking | ₹2,599 | `images/Cassete Stove.webp` | Butane canister compatible. Push-button ignition. |
| 10 | Keychain Knife | Accessories | ₹179 | `images/keychain-knife.jpg` | Compact EDC knife. *(Not in sitemap)* |
| 11 | Portable Barbeque Grill | Camping | ₹849 | `images/portable-barbeque-grill.jpeg` | Lightweight grill. *(Not in sitemap)* |
| 12 | Foldable Stool | Camping | ₹349 | `images/foldable-stool.jpeg` | Ultra-lightweight portable stool. |
| 13 | Foldable Chair with Wooden Armrest | Seating | ₹1,399 | `images/foldable-chair-with-wooden-armrest.jpeg` | Wooden armrests. *(Not in sitemap)* |

**Categories:** Seating, Tables, Shelter, Camping, Cooking, Accessories

**Orphaned products** (on listing page but not in sitemap):
- `camping-cookware-set`
- `keychain-knife`
- `portable-barbeque-grill`
- `foldable-chair-with-wooden-armrest`

**Variant note:** Prices show ranges (e.g., ₹849–₹949) but the V1 site appears to use a single product page per variant with no dropdown selector. The range seems tied to size/color. For V2, these should be modeled as product variants.

**Image note:** Images are local (`images/` folder). For V2, these will be stored in Cloudflare R2 (see decisions.md).

---

## 2. Brand assets

- **Logo:** `images/logo.png` (referenced in all pages' `<link rel="icon" href="images/logo.png">`)
- **Hero image:** `images/outdoor.jpg` (used on home, about, contact, reviews OG tags)
- **Brand colors:** Need to extract from `styles.css` (not yet crawled)
- **Fonts:** Playfair Display (700), DM Sans (400/500/600) via Google Fonts

---

## 3. Contact & Social

| Detail | Value |
|--------|-------|
| Email | Contact@deckun.in |
| Phone | +91 70052 86053 |
| Address | Langjing Achouba, Imphal West, Manipur |
| WhatsApp | https://wa.me/917005286053 |
| Instagram | https://www.instagram.com/deckun25 |
| Facebook | https://www.facebook.com/profile.php?id=61584592258046 |

---

## 4. About page content

- **Mission:** To provide high-quality outdoor gear that combines durability, style, and functionality — making every outdoor experience memorable and safe.
- **Vision:** A world where every outdoor enthusiast has access to products that enhance their adventure while caring for the environment and promoting responsible exploration.
- **Story:** Founded in December 2025 as a passion project for outdoor lovers in Manipur. Grown into a trusted name for quality outdoor equipment.

---

## 5. Reviews page

- URL: `reviews.html` → new: `/reviews`
- Has a reviews stats section (total reviews, average rating)
- Review content appears to be dynamically loaded (stars show as placeholders `—`)

---

## 6. Analytics & tracking

| Service | ID |
|---------|----|
| Google Analytics 4 | `G-DC6RVEFR78` |
| Meta Pixel | `865435816065454` |

---

## 7. Missing / to be added in V2

| Item | Current V1 | V2 Plan |
|------|-----------|--------|
| Shopping cart | None (WhatsApp enquire only) | Full server-side cart |
| Checkout | None | COD + online payment |
| Customer accounts | None | Mobile + password auth |
| Serviceable PIN codes | Not present | Admin-managed, public check |
| Order management | WhatsApp-based | Order lifecycle in backend |
| Reviews | Static/limited | Customer reviews post-delivery |
| Ratings | Placeholder stats only | Star ratings, moderation |

---

## 8. Assets to download

Local image files referenced in the site:
- `images/logo.png`
- `images/outdoor.jpg` (hero)
- `images/chair.jpg`
- `images/table.jpg`
- `images/tent.jpg`
- `images/camping-cookware-set.jpg`
- `images/Foldable Chair with armrest.jpg`
- `images/Hammock-with-mosquito-net.jpeg`
- `images/Foldable Chair with Leg Rest.jpg`
- `images/Camping-Tarp.jpg`
- `images/Cassete Stove.webp`
- `images/keychain-knife.jpg`
- `images/portable-barbeque-grill.jpeg`
- `images/foldable-stool.jpeg`
- `images/foldable-chair-with-wooden-armrest.jpeg`

> TODO: Download all images to `docs/seo-baseline/images/` for reference during V2 migration.
