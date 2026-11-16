import { api } from "../api.js";

const rupee = (amount) => {
  if (amount == null) return "₹0.00";
  return "₹" + Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export async function render({ id }) {
  if (id) {
    await renderProductDetail(id);
  } else {
    await renderProductList();
  }
}

async function renderProductList() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="section">
      <div class="section-header">
        <h2>Products</h2>
        <p>Manage your catalogue</p>
      </div>
      <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-bottom:1rem;">
        <a href="#products/edit/new" class="btn btn-primary">+ Add Product</a>
        <button class="filter-chip active" id="chip-catalog">Catalog</button>
        <button class="filter-chip" id="chip-archived">Archived</button>
        <span id="products-count" style="color:var(--color-text-muted);font-size:0.875rem;"></span>
      </div>
      <div class="product-grid" id="products-grid">
        <li class="loading">Loading...</li>
      </div>
    </section>
  `;

  const grid = document.getElementById("products-grid");
  const countEl = document.getElementById("products-count");
  const chipCatalog = document.getElementById("chip-catalog");
  const chipArchived = document.getElementById("chip-archived");

  const load = async (includeArchived) => {
    grid.innerHTML = `<li class="loading">Loading...</li>`;
    try {
      const url = includeArchived
        ? "/api/admin/products/?limit=100&include_archived=true"
        : "/api/admin/products/?limit=100";
      const products = await api.get(url);

      countEl.textContent = `${products.length} product${products.length === 1 ? "" : "s"}`;

      if (!products || products.length === 0) {
        grid.innerHTML = `<li class="empty-state">No products found.</li>`;
        return;
      }

      grid.innerHTML = products.map((p) => `
        <li class="product-card">
          <a href="#products/${p.id}" class="product-card-link">
            <div class="product-image">
              <img src="${escapeHtml(p.primary_image_url || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&h=600&fit=crop')}" alt="${escapeHtml(p.name)}" loading="lazy" />
            </div>
            <div class="product-info">
              <div class="product-name">${escapeHtml(p.name)}</div>
              <div class="product-price">${rupee(p.base_price || p.price || 0)}</div>
            </div>
          </a>
          <a href="#products/edit/${p.id}" class="btn btn-secondary btn-sm">Edit</a>
        </li>
      `).join("");
    } catch (err) {
      grid.innerHTML = `<li class="error-text">Failed to load products.</li>`;
    }
  };

  chipCatalog.onclick = () => {
    chipCatalog.classList.add("active");
    chipArchived.classList.remove("active");
    load(false);
  };
  chipArchived.onclick = () => {
    chipArchived.classList.add("active");
    chipCatalog.classList.remove("active");
    load(true);
  };

  load(false);
}

async function renderProductDetail(productId) {
  const app = document.getElementById("app");
  app.innerHTML = `<div class="loading">Loading product…</div>`;

  try {
    const product = await api.get(`/api/admin/products/${productId}`);
    renderProductDetailContent(product);
  } catch (err) {
    app.innerHTML = `<div class="error-text">Product not found.</div>`;
  }
}

function renderProductDetailContent(product) {
  const app = document.getElementById("app");
  const rupee = (amount) => {
    if (amount == null) return "₹0.00";
    return "₹" + Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const placeholder = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&h=600&fit=crop';
  const images = [];
  if (product.images && product.images.length) {
    images.push(...product.images.map((img) => img.url));
  }
  if (product.primary_image_url && !images.includes(product.primary_image_url)) {
    images.unshift(product.primary_image_url);
  }
  if (!images.length) images.push(placeholder);
  const galleryImages = images.filter(Boolean).slice(0, 3);

  app.innerHTML = `
    <section class="section">
      <div class="detail-header">
        <a href="#products" class="back-link">&#8592; Back to Products</a>
        <a href="#products/edit/${product.id}" class="btn btn-primary">Edit Product</a>
      </div>

      <div class="product-detail-grid">
        <div>
          <div class="product-gallery">
            <div class="gallery-main">
              <img src="${escapeHtml(galleryImages[0])}" alt="${escapeHtml(product.name)}" id="gallery-main-img" class="gallery-main-img" />
              <div class="gallery-nav">
                <button type="button" class="gallery-nav-btn" id="gallery-prev" aria-label="Previous image">&#8249;</button>
                <button type="button" class="gallery-nav-btn" id="gallery-next" aria-label="Next image">&#8250;</button>
              </div>
              <div class="gallery-dots">
                ${galleryImages.map((_, i) => `<span class="gallery-dot${i === 0 ? ' active' : ''}" data-index="${i}"></span>`).join("")}
              </div>
            </div>
            <div class="gallery-thumbs">
              ${galleryImages.map((img, i) => `
                <img src="${escapeHtml(img)}" alt="${escapeHtml(product.name)} image ${i + 1}"
                     class="gallery-thumb${i === 0 ? ' active' : ''}" data-index="${i}" loading="lazy" />
              `).join("")}
            </div>
          </div>
        </div>
        <div>
          <h1 style="font-family:var(--font-heading); font-size:2rem; margin-bottom:0.5rem;">${escapeHtml(product.name)}</h1>
          <div style="color:var(--color-primary); font-size:1.5rem; font-weight:600; margin-bottom:1rem;">${rupee(product.base_price || product.price || 0)}</div>
          <p style="color:var(--color-text-secondary); margin-bottom:1.5rem;">${escapeHtml(product.description || '')}</p>
          <div style="margin-bottom:1rem;">
            <span class="badge badge-active">${product.status || 'active'}</span>
            <span class="badge">${product.category_name || 'Uncategorized'}</span>
            <span class="badge">${product.stock_quantity || 0} in stock</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:0.75rem;">
            <button id="add-cart" class="btn btn-primary" style="width:100%;">Add to Cart</button>
            <a href="https://wa.me/?text=${encodeURIComponent('Hi, I want to buy: ' + product.name + ' - https://deckun.in/#products/' + product.slug)}" target="_blank" class="btn btn-outline" style="width:100%; text-align:center;">Buy via WhatsApp</a>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:2rem;">
        <div class="card-header">Specifications</div>
        <ul class="list">
          ${(product.specifications || []).map(s => `
            <li><strong>${escapeHtml(s.field_label)}:</strong> ${escapeHtml(s.field_value)}</li>
          `).join('') || '<li>No specifications.</li>'}
        </ul>
      </div>

      <div class="card" style="margin-top:2rem;">
        <div class="card-header">Variants</div>
        <ul class="list">
          ${(product.variants || []).map(v => `
            <li>
              <strong>${escapeHtml(v.name)}</strong> - ${rupee(v.price)} - Stock: ${v.stock}
              ${v.sku ? ` (SKU: ${escapeHtml(v.sku)})` : ''}
            </li>
          `).join('') || '<li>No variants.</li>'}
        </ul>
      </div>

      <div class="order-actions" style="margin-top:1rem;">
        <a href="#products" class="btn btn-secondary">Back to Products</a>
      </div>
    </section>
  `;

  // Gallery navigation (arrows, dots, thumbnails, touch swipe)
  const mainImg = app.querySelector("#gallery-main-img");
  const prevBtn = app.querySelector("#gallery-prev");
  const nextBtn = app.querySelector("#gallery-next");
  const dots = app.querySelectorAll(".gallery-dot");
  const thumbs = app.querySelectorAll(".gallery-thumb");
  let index = 0;

  const show = (i) => {
    index = ((i % galleryImages.length) + galleryImages.length) % galleryImages.length;
    if (mainImg) mainImg.src = galleryImages[index];
    dots.forEach((d, di) => d.classList.toggle("active", di === index));
    thumbs.forEach((t, ti) => t.classList.toggle("active", ti === index));
  };

  prevBtn?.addEventListener("click", () => show(index - 1));
  nextBtn?.addEventListener("click", () => show(index + 1));
  dots.forEach((d) => d.addEventListener("click", () => show(Number(d.dataset.index))));
  thumbs.forEach((t) => t.addEventListener("click", () => show(Number(t.dataset.index))));

  let startX = null;
  mainImg?.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; });
  mainImg?.addEventListener("touchend", (e) => {
    if (startX == null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (dx > 50) show(index - 1);
    else if (dx < -50) show(index + 1);
    startX = null;
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}