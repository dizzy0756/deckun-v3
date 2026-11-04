import { api, resolveUrl } from '../api.js';

const rupee = (paise) => {
  if (paise == null) return "₹0.00";
  return "₹" + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
        "price": String((product.base_price || product.price || 0) / 100),
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

    app.innerHTML = `
      <section class="section">
        <div class="container" style="max-width:1000px;">
          <a href="#products" style="color:var(--color-primary); display:inline-flex; align-items:center; gap:0.5rem; margin-bottom:1.5rem;">← Back to Products</a>

          <!-- Image Gallery -->
          <div class="product-gallery">
            <div class="gallery-main" id="gallery-main">
              <img src="${escapeHtml(galleryImages[0])}" alt="${escapeHtml(product.name)}" class="gallery-main-img" />
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
            <div style="color:var(--color-primary); font-size:1.5rem; font-weight:600; margin-bottom:1rem;">${rupee(product.base_price || product.price || 0)}</div>
            <p style="color:var(--color-text-secondary); margin-bottom:1.5rem;">${escapeHtml(product.description || '')}</p>
            <div style="margin-bottom:1rem;">
              <span class="badge badge-${product.status || 'active'}">${product.status || 'active'}</span>
              <span class="badge">${product.category_name || 'Uncategorized'}</span>
              <span class="badge">${product.stock_quantity || 0} in stock</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:0.75rem;">
              <button id="add-cart" class="btn btn-primary" style="width:100%;">Add to Cart</button>
              <a href="https://wa.me/?text=${encodeURIComponent('Hi, I want to buy: ' + product.name + ' - https://deckun.in/#products/' + product.slug)}" target="_blank" class="btn btn-outline" style="width:100%; text-align:center;">Buy via WhatsApp</a>
            </div>
          </div>
        </div>
      </section>
    `;

    // Gallery swipe/tap logic
    let currentIndex = 0;
    const mainImg = document.getElementById('gallery-main-img');
    const prevBtn = document.getElementById('gallery-prev');
    const nextBtn = document.getElementById('gallery-next');
    const dots = document.querySelectorAll('.gallery-dot');
    const thumbs = document.querySelectorAll('.gallery-thumb');

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
    console.error('Render product error:', e);
    app.innerHTML = `<div style="padding:2rem;text-align:center;"><h2>Product not found</h2><p style="color:var(--color-text-muted);">${e.message || 'Product could not be loaded'}</p><a href="#products" style="color:var(--color-primary);">Back to products</a></div>`;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}