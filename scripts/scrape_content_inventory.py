"""Extract product details, listing, and content inventory from deckun.in."""
import re
import sys
import urllib.request

BASE = "https://deckun.in"
HEADERS = {"User-Agent": "Deckun-SEO-Bot/1.0"}

sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def fetch(url):
    req = urllib.request.Request(url, headers=HEADERS)
    resp = urllib.request.urlopen(req, timeout=15)
    return resp.read().decode("utf-8", errors="replace")


def get_body(html):
    body_match = re.search(r"<body>(.*?)</body>", html, re.DOTALL | re.IGNORECASE)
    return body_match.group(1) if body_match else html


output_lines = []

# --- Product listing page ---
html = fetch(BASE + "/products.html")
body = get_body(html)
# Extract product card links
card_links = re.findall(r'<a href="(/products/[^\"]+)"', body)
output_lines.append(f"=== Products listing page ===")
output_lines.append(f"Found {len(card_links)} product links:")
for link in card_links:
    output_lines.append(f"  {link}")
output_lines.append("")

# --- Product pages ---
product_paths = [
    "/products/foldable-moon-chair",
    "/products/foldable-table",
    "/products/camping-tent",
    "/products/foldable-stool",
    "/products/foldable-chair-armrest",
    "/products/hammock-mosquito-net",
    "/products/foldable-chair-leg-rest",
    "/products/camping-tarp",
    "/products/cassette-stove",
]

output_lines.append("=== Product page details ===")
for path in product_paths:
    try:
        html = fetch(BASE + path)
        body = get_body(html)

        h1_match = re.search(r"<h1>(.*?)</h1>", body, re.DOTALL | re.IGNORECASE)
        prices = re.findall(r"₹\s*([0-9,]+)", body)
        desc_match = re.search(r"<p[^>]*>(.*?)</p>", body, re.DOTALL | re.IGNORECASE)
        variants = re.findall(r"<option[^>]*>(.*?)</option>", body, re.DOTALL | re.IGNORECASE)
        img_match = re.findall(r'<img[^>]+src="([^"]+)"', body, re.IGNORECASE)

        h1_text = h1_match.group(1).strip() if h1_match else "N/A"
        price_text = ", ".join(prices) if prices else "N/A"
        desc_text = re.sub(r"\s+", " ", desc_match.group(1).strip()) if desc_match else "N/A"
        variants_text = ", ".join(v.strip() for v in variants) if variants else "None"
        imgs = ", ".join(img for img in img_match if "logo" not in img.lower())

        output_lines.append(f"\n{path}")
        output_lines.append(f"  Title H1: {h1_text}")
        output_lines.append(f"  Price(s): ₹ {price_text}")
        output_lines.append(f"  Description: {desc_text[:300]}")
        output_lines.append(f"  Variants/Options: {variants_text}")
        output_lines.append(f"  Images: {imgs}")
    except Exception as e:
        output_lines.append(f"\n{path}")
        output_lines.append(f"  ERROR: {e}")

# Write results
result = "\n".join(output_lines)
print(result)

with open("docs/seo-baseline/content-inventory.csv", "w", encoding="utf-8") as f:
    f.write(result)
print("\nSaved to docs/seo-baseline/content-inventory.csv")
