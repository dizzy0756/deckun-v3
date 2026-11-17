import { api, resolveUrl, isLoggedIn } from '../api.js';

const rupee = (price) => {
  if (price == null) return "₹0.00";
  return "₹" + price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Helper: set or create a meta tag
function setMeta(name, value, attr = 'name') {
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

// Helper: set JSON-LD structured data
function setJsonLd(data) {
  let existing = document.querySelector('script[type="application/ld+json"][data-product]');
  if (existing) existing.remove();
  const script = document.createElement('script');
  script.setAttribute('type', 'application/ld+json');
  script.setAttribute('data-product', 'true');
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

export async function renderProductDetail(app, slug) {
  app.innerHTML = '<div style="padding:2rem;text-align:center;">Loading...</div>';

  try {
    console.log('Fetching product:', slug); // Debug
    const product = await api.get('/catalogue/products/' + encodeURIComponent(slug));
    console.log('Product data:', product); // Debug

    if (!product || !product.name) {
      throw new Error('Product not found');
    }

    // --- Set dynamic meta tags ---
    document.title = product.meta_title || product.name;
    setMeta('description', product.meta_description || product.name);
    setMeta('og:title', product.meta_title || product.name, 'property');
    setMeta('og:description', product.meta_description || product.name, 'property');
    setMeta('og:type', 'product', 'property');
    setMeta('og:url', window.location.href, 'property');
    const mainImage = resolveUrl(product.primary_image_url || (product.images && product.images[0] ? product.images[0].url : 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&h=630&fit=crop'));
    setMeta('og:image', mainImage, 'property');
    setMeta('og:image:width', '1200', 'property');
    setMeta('og:image:height', '630', 'property');
    setMeta('twitter:card', 'summary_large_image', 'name');
    setMeta('twitter:title', product.meta_title || product.name, 'name');
    setMeta('twitter:description', product.meta_description || product.name, 'name');
    setMeta('twitter:image', mainImage, 'name');

    // --- JSON-LD Product structured data ---
    setJsonLd({
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.name,
      "slug": product.slug,
      "description": product.meta_description || product.description || '',
      "image": mainImage,
      "offers": {
        "@type": "Offer",
        "price": String((product.base_price || product.price || 0)),
        "priceCurrency": "INR",
        "availability": product.stock_quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
      },
      "category": product.category_name || ''
    });

    // Build image gallery (up to 3 images)
    const images = [];
    if (product.images && product.images.length) {
      images.push(...product.images.map(img => resolveUrl(img.url)));
    }
    if (product.primary_image_url && !images.includes(product.primary_image_url)) {
      images.unshift(resolveUrl(product.primary_image_url));
    }
    // Fallback placeholder
    if (images.length === 0) {
      images.push('https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&h=630&fit=crop');
    }
    // Limit to 3 images for swiper
    const galleryImages = images.slice(0, 3);

    const variants = product.variants || [];
    const useVariants = !!product.has_variants && variants.length > 0;
    const variantColors = [...new Set(variants.map((v) => v.color).filter(Boolean))];
    const variantSizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];
    const firstVariant = variants[0] || null;
    const shownPrice = useVariants && firstVariant
      ? firstVariant.price
      : (product.base_price || product.price || 0);

    app.innerHTML = `
      <section class="section">
        <div class="container" style="max-width:1000px;">
          <a href="#products" style="color:var(--color-primary); display:inline-flex; align-items:center; gap:0.5rem; margin-bottom:1.5rem;">← Back to Products</a>

          <!-- Image Gallery -->
          <div class="product-gallery">
            <div class="gallery-main" id="gallery-main">
              <img src="${escapeHtml(galleryImages[0])}" alt="${escapeHtml(product.name)}" id="gallery-main-img" class="gallery-main-img" />
              <div class="gallery-nav">
                <button class="gallery-nav-btn prev" id="gallery-prev">&#8249;</button>
                <button class="gallery-nav-btn next" id="gallery-next">&#8250;</button>
              </div>
              <div class="gallery-dots" id="gallery-dots">
                ${galleryImages.map((_, i) => `<span class="gallery-dot${i === 0 ? ' active' : ''}" data-index="${i}"></span>`).join('')}
              </div>
            </div>
            <div class="gallery-thumbs" id="gallery-thumbs">
              ${galleryImages.map((img, i) => `
                <img src="${escapeHtml(img)}" alt="${escapeHtml(product.name)}" class="gallery-thumb${i === 0 ? ' active' : ''}" data-index="${i}" />
              `).join('')}
            </div>
          </div>

          <div class="product-info">
            <h1 style="font-family:var(--font-heading); font-size:2rem; margin-bottom:0.5rem;">${escapeHtml(product.name)}</h1>
            <div id="product-price" style="color:var(--color-primary); font-size:1.5rem; font-weight:600; margin-bottom:1rem;">${rupee(shownPrice)}</div>
            <p style="color:var(--color-text-secondary); margin-bottom:1.5rem;">${escapeHtml(product.description || '')}</p>

            ${useVariants ? `
            <div style="display:flex; gap:0.75rem; flex-wrap:wrap; margin-bottom:1rem;">
              ${variantColors.length ? `
                <div style="flex:1; min-width:120px;">
                  <label style="display:block; margin-bottom:0.35rem; font-weight:600; font-size:0.85rem;">Colour</label>
                  <select id="variant-color" class="form-control" style="width:100%; padding:0.6rem; border:1px solid var(--color-border); border-radius:var(--radius); font-family:inherit;">
                    ${variantColors.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
                  </select>
                </div>` : ''}
              ${variantSizes.length ? `
                <div style="flex:1; min-width:120px;">
                  <label style="display:block; margin-bottom:0.35rem; font-weight:600; font-size:0.85rem;">Size</label>
                  <select id="variant-size" class="form-control" style="width:100%; padding:0.6rem; border:1px solid var(--color-border); border-radius:var(--radius); font-family:inherit;">
                    ${variantSizes.map((sz) => `<option value="${escapeHtml(sz)}">${escapeHtml(sz)}</option>`).join('')}
                  </select>
                </div>` : ''}
            </div>` : ''}

            <div style="margin-bottom:1rem;">
              <span class="badge badge-${product.status || 'active'}">${product.status || 'active'}</span>
              <span class="badge">${product.category_name || 'Uncategorized'}</span>
              <span class="badge" id="product-stock">${useVariants ? "Select options" : (product.stock_quantity || 0) + " in stock"}</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:0.75rem;">
              <button id="add-cart" class="btn btn-primary" style="width:100%;">Add to Cart</button>
              <a href="https://wa.me/?text=${encodeURIComponent('Hi, I want to buy: ' + product.name + ' - https://deckun.in/#products/' + product.slug)}" target="_blank" class="btn btn-outline" style="width:100%; text-align:center;">Buy via WhatsApp</a>
            </div>
          </div>
        </div>
      </section>

      <section class="section" style="padding-top:0;">
        <div class="container" style="max-width:1000px;">
          <div id="reviews-mount">
            <div class="loading">Loading reviews…</div>
          </div>
        </div>
      </section>
    `;

    // Gallery swipe/tap logic
    let currentIndex = 0;
    const appEl = app;
    const mainImg = appEl.querySelector('#gallery-main-img');
    const prevBtn = appEl.querySelector('#gallery-prev');
    const nextBtn = appEl.querySelector('#gallery-next');
    const dots = appEl.querySelectorAll('.gallery-dot');
    const thumbs = appEl.querySelectorAll('.gallery-thumb');

    function updateGallery(index) {
      currentIndex = ((index % galleryImages.length) + galleryImages.length) % galleryImages.length;
      mainImg.src = galleryImages[currentIndex];
      mainImg.style.opacity = '0';
      setTimeout(() => { mainImg.style.opacity = '1'; }, 150);
      dots.forEach((d, i) => d.classList.toggle('active', i === currentIndex));
      thumbs.forEach((t, i) => t.classList.toggle('active', i === currentIndex));
    }

    prevBtn.addEventListener('click', () => updateGallery(currentIndex - 1));
    nextBtn.addEventListener('click', () => updateGallery(currentIndex + 1));
    dots.forEach(dot => dot.addEventListener('click', () => updateGallery(parseInt(dot.dataset.index))));
    thumbs.forEach(thumb => thumb.addEventListener('click', () => updateGallery(parseInt(thumb.dataset.index))));

    // Touch swipe support
    let startX = 0;
    mainImg.addEventListener('touchstart', (e) => startX = e.touches[0].clientX);
    mainImg.addEventListener('touchend', (e) => {
      const endX = e.changedTouches[0].clientX;
      if (startX - endX > 50) updateGallery(currentIndex + 1);
      if (endX - startX > 50) updateGallery(currentIndex - 1);
    });

    // Variant selection
    let selectedVariant = useVariants ? firstVariant : null;
    const addCartBtn = app.querySelector('#add-cart');

    if (useVariants) {
      const colorSelect = app.querySelector('#variant-color');
      const sizeSelect = app.querySelector('#variant-size');
      const priceEl = app.querySelector('#product-price');
      const stockEl = app.querySelector('#product-stock');

      const syncVariant = () => {
        const color = colorSelect ? colorSelect.value : null;
        const size = sizeSelect ? sizeSelect.value : null;
        selectedVariant =
          variants.find((v) => (!color || v.color === color) && (!size || v.size === size)) || null;

        if (!selectedVariant) {
          priceEl.textContent = 'Unavailable';
          stockEl.textContent = 'Out of stock';
          if (addCartBtn) addCartBtn.disabled = true;
          return;
        }

        priceEl.textContent = rupee(selectedVariant.price);
        const availability = selectedVariant.availability;
        stockEl.textContent =
          availability === 'out_of_stock'
            ? 'Out of stock'
            : availability === 'low_stock'
              ? 'Low stock'
              : 'In stock';
        if (addCartBtn) addCartBtn.disabled = availability === 'out_of_stock';
      };

      colorSelect?.addEventListener('change', syncVariant);
      sizeSelect?.addEventListener('change', syncVariant);
      syncVariant();
    }

    // Add to cart (variant-aware)
    if (addCartBtn) {
      addCartBtn.onclick = () => {
        if (useVariants && !selectedVariant) {
          alert('Please choose an available option.');
          return;
        }

        const price = selectedVariant ? selectedVariant.price : (product.price || product.base_price);
        const variantSku = selectedVariant ? selectedVariant.sku : null;
        const variantLabel = selectedVariant && selectedVariant.name && selectedVariant.name !== 'Default'
          ? selectedVariant.name
          : '';

        const cart = JSON.parse(localStorage.getItem('deckun_cart') || '[]');
        const existing = cart.find(
          (item) => item.product_id === product.id && (item.variant_sku || null) === variantSku
        );

        if (existing) {
          existing.quantity += 1;
        } else {
          cart.push({
            product_id: product.id,
            slug: product.slug,
            name: product.name,
            price,
            variant_sku: variantSku,
            variant_label: variantLabel,
            image: product.primary_image_url || (product.images && product.images[0] ? product.images[0].url : ''),
            quantity: 1,
          });
        }

        localStorage.setItem('deckun_cart', JSON.stringify(cart));
        document.dispatchEvent(new Event('cart-updated'));
        alert('Added to cart');
      };
    }

    await initReviews(app, product);
  } catch (e) {
    console.error('Render product error:', e);
    app.innerHTML = `<div style="padding:2rem;text-align:center;"><h2>Product not found</h2><p style="color:var(--color-text-muted);">${e.message || 'Product could not be loaded'}</p><a href="#products" style="color:var(--color-primary);">Back to products</a></div>`;
  }
}

function starRow(value) {
  const v = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  return "★".repeat(v) + "☆".repeat(5 - v);
}

async function initReviews(app, product) {
  const mount = app.querySelector("#reviews-mount");
  if (!mount) return;

  let reviews = [];
  try {
    reviews = await api.get(`/reviews/product/${product.id}`);
  } catch (e) {
    reviews = [];
  }

  const count = reviews.length;
  const avg = count ? (reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / count) : 0;

  const listHtml = count === 0
    ? `<p style="color:var(--color-text-muted);">No reviews yet. Be the first to review this product.</p>`
    : reviews.map((r) => `
        <div class="review-card">
          <div class="review-head">
            <div class="review-avatar">${escapeHtml((r.user_full_name || 'C').trim().charAt(0).toUpperCase())}</div>
            <div style="flex:1;min-width:0;">
              <div class="review-author">${escapeHtml(r.user_full_name || 'Customer')}</div>
              <div class="review-stars" aria-label="${Number(r.rating)} out of 5">${starRow(r.rating)}</div>
            </div>
            <div class="review-date">${new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
          </div>
          ${r.title ? `<div class="review-title">${escapeHtml(r.title)}</div>` : ""}
          <p class="review-body">${escapeHtml(r.comment)}</p>
          ${r.image_url ? `<img class="review-photo" src="${escapeHtml(resolveUrl(r.image_url))}" alt="Customer review photo" loading="lazy" />` : ""}
        </div>
      `).join("");

  mount.innerHTML = `
    <div class="review-summary">
      <div>
        <h2 style="font-family:var(--font-heading); font-size:1.5rem; margin-bottom:0.25rem;">Customer Reviews</h2>
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <span class="review-stars" style="font-size:1.1rem;">${starRow(avg)}</span>
          <span style="color:var(--color-text-muted);font-size:0.9rem;">
            ${count ? `${avg.toFixed(1)} · ${count} review${count === 1 ? "" : "s"}` : "No ratings yet"}
          </span>
        </div>
      </div>
    </div>
    <div class="review-list">${listHtml}</div>
    <div id="review-form-mount" style="margin-top:1.5rem;">
      <div class="loading" style="padding:1rem;text-align:left;color:var(--color-text-muted);">Checking review eligibility…</div>
    </div>
  `;

  await renderReviewForm(app, product, mount);
}

async function renderReviewForm(app, product, mount) {
  const formMount = mount.querySelector("#review-form-mount");
  if (!formMount) return;

  if (!isLoggedIn()) {
    formMount.innerHTML = `
      <div class="review-cta">
        <p style="margin-bottom:0.75rem;">Sign in to share your experience with this product.</p>
        <button class="btn btn-primary btn-sm" id="review-login">Sign in to review</button>
      </div>
    `;
    formMount.querySelector("#review-login")?.addEventListener("click", () => {
      sessionStorage.setItem("post_login_redirect", window.location.hash);
      window.location.hash = "#login";
    });
    return;
  }

  let eligibility = { can_review: false, reason: "You cannot review this product yet" };
  try {
    eligibility = await api.get(`/reviews/can-review/${product.id}`);
  } catch (e) {
    /* ignore */
  }

  if (!eligibility.can_review) {
    formMount.innerHTML = `
      <div class="review-cta">
        <p style="color:var(--color-text-muted);">${escapeHtml(eligibility.reason || "You cannot review this product yet.")}</p>
      </div>
    `;
    return;
  }

  formMount.innerHTML = `
    <form id="review-form" class="review-form">
      <h3 style="font-family:var(--font-heading); font-size:1.15rem; margin-bottom:0.75rem;">Write a review</h3>

      <div class="form-group">
        <label style="display:block;margin-bottom:0.35rem;font-weight:600;font-size:0.875rem;">Your rating *</label>
        <div id="rating-input" class="rating-input" role="radiogroup" aria-label="Rating">
          ${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="rating-star" data-rating="${n}" aria-label="${n} star${n === 1 ? "" : "s"}">★</button>`).join("")}
        </div>
      </div>

      <div class="form-group">
        <label style="display:block;margin-bottom:0.35rem;font-weight:600;font-size:0.875rem;">Title (optional)</label>
        <input type="text" id="review-title" maxlength="255"
               style="width:100%;padding:0.75rem;border:1px solid var(--color-border);border-radius:var(--radius);font-family:inherit;" />
      </div>

      <div class="form-group">
        <label style="display:block;margin-bottom:0.35rem;font-weight:600;font-size:0.875rem;">Your review *</label>
        <textarea id="review-comment" rows="4" required
                  style="width:100%;padding:0.75rem;border:1px solid var(--color-border);border-radius:var(--radius);font-family:inherit;resize:vertical;"></textarea>
      </div>

      <div class="form-group">
        <label style="display:block;margin-bottom:0.35rem;font-weight:600;font-size:0.875rem;">Add a photo (optional)</label>
        <input type="file" id="review-photo" accept="image/*" />
        <div id="review-photo-preview" style="margin-top:0.5rem;"></div>
      </div>

      <button type="submit" class="btn btn-primary">Submit review</button>
      <div id="review-error" style="color:var(--color-error);font-size:0.875rem;margin-top:0.5rem;min-height:1.1rem;"></div>
    </form>
  `;

  let rating = 0;
  const stars = formMount.querySelectorAll(".rating-star");
  const paintStars = () => {
    stars.forEach((s) => {
      s.classList.toggle("active", Number(s.dataset.rating) <= rating);
    });
  };
  stars.forEach((s) => {
    s.addEventListener("click", () => {
      rating = Number(s.dataset.rating);
      paintStars();
    });
  });

  const photoInput = formMount.querySelector("#review-photo");
  const preview = formMount.querySelector("#review-photo-preview");
  photoInput.addEventListener("change", () => {
    preview.innerHTML = "";
    const file = photoInput.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      preview.innerHTML = `<span style="color:var(--color-error);font-size:0.8rem;">Image must be 5MB or smaller.</span>`;
      photoInput.value = "";
      return;
    }
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.style.cssText = "max-height:120px;border-radius:var(--radius);";
    preview.appendChild(img);
  });

  const form = formMount.querySelector("#review-form");
  const errBox = formMount.querySelector("#review-error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errBox.textContent = "";

    if (!rating) {
      errBox.textContent = "Please select a rating.";
      return;
    }
    const comment = formMount.querySelector("#review-comment").value.trim();
    if (!comment) {
      errBox.textContent = "Please write a short review.";
      return;
    }

    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Submitting…";

    try {
      let imageUrl = null;
      const file = photoInput.files?.[0];
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const uploaded = await api.post("/reviews/upload", fd);
        imageUrl = uploaded?.url || null;
      }

      await api.post("/reviews/", {
        product_id: product.id,
        order_item_id: eligibility.order_item_id,
        rating,
        title: formMount.querySelector("#review-title").value.trim() || null,
        comment,
        image_url: imageUrl,
      });

      formMount.innerHTML = `
        <div class="review-cta">
          <p style="color:var(--color-success);font-weight:600;margin-bottom:0.35rem;">Thanks for your review!</p>
          <p style="color:var(--color-text-muted);font-size:0.9rem;">It will appear here once our team approves it.</p>
        </div>
      `;
    } catch (err) {
      errBox.textContent = err.message || "Could not submit review.";
      btn.disabled = false;
      btn.textContent = "Submit review";
    }
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}