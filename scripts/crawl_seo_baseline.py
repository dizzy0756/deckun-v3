"""
Crawl the existing Deckun site and export SEO metadata.

Outputs:
  docs/seo-baseline/sitemap.xml          raw sitemap
  docs/seo-baseline/robots.txt           raw robots
  docs/seo-baseline/crawl-export.csv     URL, status, title, description, H1, H2s, canonical
  docs/seo-baseline/url-map.md           old-to-new URL mapping
"""
import csv
import os
import re
import sys
import urllib.request
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "https://deckun.in"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "docs", "seo-baseline")
OUTPUT_DIR = os.path.normpath(OUTPUT_DIR)

USER_AGENT = "Deckun-SEO-Bot/1.0 (+https://github.com/deckun)"


def fetch(url: str) -> tuple[int, str]:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": USER_AGENT},
    )
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, str(e)
    except Exception as e:
        return 0, str(e)


class MetaParser(HTMLParser):
    """Extract title, meta description, canonical, og tags, and headings."""

    def __init__(self):
        super().__init__()
        self.title = ""
        self.description = ""
        self.canonical = ""
        self.og_title = ""
        self.og_description = ""
        self.og_image = ""
        self.h1s: list[str] = []
        self.h2s: list[str] = []
        self._in_title = False
        self._in_h1 = False
        self._in_h2 = False

    def handle_starttag(self, tag: str, attrs):
        attrs_d = dict(attrs)
        if tag == "title":
            self._in_title = True
        elif tag == "meta":
            name = attrs_d.get("name", "").lower()
            prop = attrs_d.get("property", "").lower()
            if name == "description":
                self.description = attrs_d.get("content", "")
            elif prop == "og:title":
                self.og_title = attrs_d.get("content", "")
            elif prop == "og:description":
                self.og_description = attrs_d.get("content", "")
            elif prop == "og:image":
                self.og_image = attrs_d.get("content", "")
            elif name == "robots":
                pass
        elif tag == "link" and attrs_d.get("rel") == "canonical":
            self.canonical = attrs_d.get("href", "")
        elif tag == "h1":
            self._in_h1 = True
        elif tag == "h2":
            self._in_h2 = True

    def handle_data(self, data: str):
        if self._in_title:
            self.title += data
        elif self._in_h1:
            self.h1s.append(data.strip())
        elif self._in_h2:
            self.h2s.append(data.strip())

    def handle_endtag(self, tag: str):
        if tag == "title":
            self._in_title = False
        elif tag == "h1":
            self._in_h1 = False
        elif tag == "h2":
            self._in_h2 = False


def extract_urls_from_sitemap(xml: str) -> list[str]:
    urls = re.findall(r"<loc>(.*?)</loc>", xml, re.IGNORECASE)
    return [u.strip() for u in urls if u.strip()]


def crawl() -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 1. Save raw sitemap and robots
    print("Fetching sitemap.xml...")
    status, sitemap_content = fetch(urljoin(BASE_URL, "/sitemap.xml"))
    sitemap_path = os.path.join(OUTPUT_DIR, "sitemap.xml")
    with open(sitemap_path, "w", encoding="utf-8") as f:
        f.write(sitemap_content)
    print(f"  Saved to {sitemap_path} (status {status})")

    print("Fetching robots.txt...")
    status, robots_content = fetch(urljoin(BASE_URL, "/robots.txt"))
    robots_path = os.path.join(OUTPUT_DIR, "robots.txt")
    with open(robots_path, "w", encoding="utf-8") as f:
        f.write(robots_content)
    print(f"  Saved to {robots_path} (status {status})")

    # 2. Crawl each URL from the sitemap
    urls = extract_urls_from_sitemap(sitemap_content)
    print(f"\nCrawling {len(urls)} URLs from sitemap...\n")

    rows: list[dict[str, str]] = []
    for url in urls:
        status, content = fetch(url)
        if status == 200:
            parser = MetaParser()
            try:
                parser.feed(content)
            except Exception as e:
                print(f"  {url} — parse error: {e}")

            h1 = parser.h1s[0] if parser.h1s else ""
            h2s = "; ".join(parser.h2s)

            rows.append({
                "url": url,
                "status": str(status),
                "title": parser.title.strip(),
                "meta_description": parser.description.strip(),
                "og_title": parser.og_title.strip(),
                "og_description": parser.og_description.strip(),
                "og_image": parser.og_image.strip(),
                "h1": h1,
                "h2s": h2s,
                "canonical": parser.canonical.strip(),
            })
            print(f"  [200] {url}")
            if not parser.title.strip():
                print(f"      WARNING: no <title> found")
        else:
            rows.append({
                "url": url,
                "status": str(status),
                "title": "",
                "meta_description": "",
                "og_title": "",
                "og_description": "",
                "og_image": "",
                "h1": "",
                "h2s": "",
                "canonical": "",
            })
            print(f"  [{status}] {url} — ERROR")

    # 3. Save CSV export
    csv_path = os.path.join(OUTPUT_DIR, "crawl-export.csv")
    fieldnames = [
        "url", "status", "title", "meta_description",
        "og_title", "og_description", "og_image",
        "h1", "h2s", "canonical",
    ]
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"\nSaved crawl export to {csv_path}")

    # 4. Save URL map (old -> new)
    url_map_path = os.path.join(OUTPUT_DIR, "url-map.md")
    with open(url_map_path, "w", encoding="utf-8") as f:
        f.write("# URL Map (Old → New)\n\n")
        f.write(f"Source site: {BASE_URL}\n\n")
        f.write("| Old URL | New URL | Notes |\n")
        f.write("| --- | --- | --- |\n")
        for row in rows:
            old = row["url"]
            path = urlparse(urlparse(old).path).path
            # New URL scheme: clean, no .html extension
            if path == "" or path == "/":
                new = "https://deckun.in/"
                note = "Home"
            elif path.endswith(".html"):
                new_slug = path.replace(".html", "").rstrip("/")
                new = f"https://deckun.in{new_slug}"
                note = "Remove .html extension"
            elif path.startswith("/products/"):
                new = old  # already clean
                note = "Already clean URL"
            else:
                new = old
                note = "No change needed"

            f.write(f"| `{old}` | `{new}` | {note} |\n")
    print(f"Saved URL map to {url_map_path}")
    print("\nDone.")


if __name__ == "__main__":
    crawl()
