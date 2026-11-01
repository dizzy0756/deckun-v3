import { api } from '../api.js';

export async function renderProductDetail(app, slug) {
  app.innerHTML = '<div style=\"padding:2rem;text-align:center;\">Loading...</div>';
  
  try {
    const product = await api.get('/catalogue/products/' + encodeURIComponent(slug));
    app.innerHTML = `
      <section class="section">
        <div class="container" style="max-width:1000px;">
          <a href="#products" style="color:var(--color-primary); display:inline-flex; align-items:center; gap:0.5rem; margin-bottom:1.5rem;">← Back to Products</a>
          <div style="display:grid; grid-template-columns:1fr; gap:2rem;" class="product-detail-grid">
            <div>
              <img src="${escapeHtml(product.primary_image_url || (product.images && product.images[0] ? product.images[0].url : 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&h=600&fit=crop'))}" alt="${escapeHtml(product.name)}" style="width:100%; border-radius:var(--radius); box-shadow:var(--shadow);" loading="lazy" />
            </div>
            <div>
              <h1 style="font-family:var(--font-heading); font-size:2rem; margin-bottom:0.5rem;">${escapeHtml(product.name)}</h1>
              <div style="color:var(--color-primary); font-size:1.5rem; font-weight:600; margin-bottom:1rem;">₹${product.price || product.base_price || 0}</div>
              <p style="color:var(--color-text-secondary); margin-bottom:1.5rem;">${escapeHtml(product.description || '')}</p>
              <div style="display:flex; flex-direction:column; gap:0.75rem;">
                <button id="add-cart" class="btn btn-primary" style="width:100%;">Add to Cart</button>
                <a href="https://wa.me/?text=${encodeURIComponent('Hi, I want to buy: ' + product.name + ' - https://deckun.in/#products/' + product.slug)}" target="_blank" class="btn btn-outline" style="width:100%; text-align:center;">Buy via WhatsApp</a>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;

    document.getElementById('add-cart').onclick = () => {
      const cart = JSON.parse(localStorage.getItem('deckun_cart') || '[]');
      const existing = cart.find(item => item.product_id === product.id && !item.variant_id);
      if (existing) {
        existing.quantity += 1;
      } else {
        cart.push({ product_id: product.id, slug: product.slug, name: product.name, price: product.price || product.base_price, image: product.primary_image_url || (product.images && product.images[0] ? product.images[0].url : ''), quantity: 1 });
      }
      localStorage.setItem('deckun_cart', JSON.stringify(cart));
      document.dispatchEvent(new Event('cart-updated'));
      alert('Added to cart');
    };
  } catch (e) {
    app.innerHTML = '<div style=\"padding:2rem;text-align:center;\"><h2>Product not found</h2><a href=\"#products\" style=\"color:var(--color-primary);\">Back to products</a></div>';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}
