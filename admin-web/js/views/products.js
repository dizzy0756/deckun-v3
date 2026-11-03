import { api } from "../api.js";

const rupee = (paise) => {
  if (paise == null) return "₹0.00";
  return "₹" + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
      <div class="section-actions">
        <a href="#products/edit/new" class="btn btn-primary">+ Add Product</a>
      </div>
      <div class="product-grid" id="products-grid">
        <li>Loading…</li>
      </div>
    </section>
  `;

  try {
    const products = await api.get("/api/admin/products/?limit=100");
    const grid = document.getElementById("products-grid");

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
        <a href="#products/edit/${p.id}" class="btn btn-secondary btn-sm" style="margin-top:0.5rem;">Edit</a>
      </li>
    `).join("");
  } catch (err) {
    document.getElementById("products-grid").innerHTML =
      `<li class="error-text">Failed to load products.</li>`;
  }
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
  const rupee = (paise) => {
    if (paise == null) return "₹0.00";
    return "₹" + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const imageUrl = product.primary_image_url || (product.images && product.images[0] ? product.images[0].url : 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&h=600&fit=crop');

  app.innerHTML = `
    <section class="section">
      <div class="detail-header">
        <a href="#products" class="back-link">&#8592; Back to Products</a>
        <a href="#products/edit/${product.id}" class="btn btn-primary">Edit Product</a>
      </div>

      <div class="product-detail-grid">
        <div>
          <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name)}" style="width:100%; border-radius:var(--radius); box-shadow:var(--shadow);" loading="lazy" />
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
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}