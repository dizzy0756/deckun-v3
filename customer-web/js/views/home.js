import { api } from '../api.js';

export async function renderHome(app) {
  if (!app) return;
  app.innerHTML = `
    <section class="hero">
      <div class="hero-inner container">
        <div class="hero-content">
          <span class="hero-label">Deckun</span>
          <h1>Experience Premium Outdoor Lifestyle</h1>
          <p>Helping you enjoy nature comfortably with gear built for adventure and designed for durability.</p>
          <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
            <a href="#products" class="btn btn-primary">Browse Products</a>
            <a href="#about" class="btn btn-outline">Learn More</a>
          </div>
        </div>
        <div class="hero-image">
          <img src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&h=800&fit=crop" alt="Outdoor adventure scene" loading="lazy" />
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <h2>Featured Products</h2>
        <p>Our most popular outdoor essentials for your next adventure</p>
      </div>
      <div id="featured-grid" class="product-grid container">
        <div style="grid-column:1/-1;text-align:center;color:var(--color-text-muted);">Loading...</div>
      </div>
      <div style="text-align:center; margin-top:2rem;">
        <a href="#products" class="btn btn-outline">View All Products</a>
      </div>
    </section>
  `;

  try {
    const products = await api.get('/catalogue/products?limit=8');
    const grid = document.getElementById('featured-grid');
    if (products && products.length) {
      grid.innerHTML = products.slice(0, 4).map(p => `
        <a href="#products/${escapeHtml(p.slug || '')}" class="product-card">
          <img src="${escapeHtml(p.primary_image_url || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&h=600&fit=crop')}" alt="${escapeHtml(p.name)}" class="product-image" loading="lazy" />
          <div class="product-info">
            <div class="product-name">${escapeHtml(p.name)}</div>
            <div class="product-price">₹${p.base_price != null ? p.base_price : (p.price != null ? p.price : 0)}</div>
          </div>
        </a>
      `).join('');
    } else {
      grid.innerHTML = '<div style=\"grid-column:1/-1;text-align:center;color:var(--color-text-muted);\">No products available</div>';
    }
  } catch (e) {
    document.getElementById('featured-grid').innerHTML = '<div style=\"grid-column:1/-1;text-align:center;color:var(--color-text-muted);\">Unable to load products</div>';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
