# Analytics & Tracking IDs

**Date captured:** 2026-10-08
**Source:** Homepage HTML at https://deckun.in/

---

## Google Analytics 4

- **Measurement ID:** `G-DC6RVEFR78`
- **Property type:** GA4 (global site tag `gtag`)
- **Tracking snippet:** Present in `<head>` of all pages via inline script

The ID is loaded via:
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-DC6RVEFR78"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', 'G-DC6RVEFR78');
</script>
```

## Meta Pixel (Facebook / Meta Conversions)

- **Pixel ID:** `865435816065454`
- **Integration:** Facebook Pixel base code via `fbq('init', '865435816065454')`

The Pixel is loaded via:
```html
<script>
  !function(f,b,e,v,n,t,s) { ... }
  (window, document, 'script', 'https://connect.facebook.net/.../fbevents.js');
  fbq('init', '865435816065454');
  fbq('track', 'PageView');
</script>
<noscript><img ... src="https://www.facebook.com/tr?id=865435816065454&ev=PageView&noscript=1" /></noscript>
```

## Action required

These IDs must be preserved in the new site's `<head>` to maintain analytics continuity during the SEO-safe launch (Phase 7).
