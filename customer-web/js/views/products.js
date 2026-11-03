import { api } from '../api.js';

export async function renderProducts(app) {
  app.innerHTML = `
    <section class="section">
      <div class="container">
        <div class="section-header" style="text-align:left; max-width:none;">
          <h1 style="font-family:var(--font-heading); font-size:2.25rem;">All Products</h1>
          <p>Premium outdoor gear for every adventure</p>
        </div>
        <div id="products-grid" class="product-grid">
          <div style="grid-column:1/-1;text-align:center;color:var(--color-text-muted);">Loading...</div>
        </div>
      </div>
    </section>
  `;

  try {
    const products = await api.get('/catalogue/products?limit=100');
    const grid = document.getElementById('products-grid');
    if (products && products.length) {
      grid.innerHTML = products.map(p => `
        <a href="#products/${escapeHtml(p.slug || '')}" target="_blank" rel="noopener noreferrer" class="product-card">
          <img src="${escapeHtml(p.primary_image_url || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&h=600&fit=crop')}" alt="${escapeHtml(p.name)}" class="product-image" loading="lazy" />
          <div class="product-info">
            <div class="product-name">${escapeHtml(p.name)}</div>
            <div class="product-price">₹${p.base_price != null ? p.base_price : 0}</div>
          </div>
        </a>
      `).join('');
    } else {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--color-text-muted);">No products found</div>';
    }
  } catch (e) {
    document.getElementById('products-grid').innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--color-text-muted);">Unable to load products</div>';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}