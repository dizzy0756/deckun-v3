import { api } from '../api.js';

const rupee = (amount) =>
  "₹" + Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const escapeHtml = (text) => {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
};

export async function renderHome(app) {
  if (!app) return;

  // Data for the featured slide and the wholesale slide
  let product = null;
  let phone = "+91 90000 00000";

  try {
    let featured = await api.get("/catalogue/products?featured=true&limit=1");
    if (!featured || featured.length === 0) {
      featured = await api.get("/catalogue/products?limit=1");
    }
    product = featured && featured[0] ? featured[0] : null;
  } catch (e) {
    product = null;
  }

  try {
    const content = await api.get("/content/");
    if (content && content["contact.phone"] && content["contact.phone"].text_value) {
      phone = content["contact.phone"].text_value;
    }
  } catch (e) {
    /* keep default */
  }

  const phoneDigits = phone.replace(/[^\d]/g, "");
  const telHref = `tel:+${phoneDigits}`;
  const waHref = phoneDigits ? `https://wa.me/${phoneDigits}` : "https://wa.me/";

  const productImage =
    (product && (product.primary_image_url ||
      (product.images && product.images[0] && product.images[0].url))) ||
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&h=800&fit=crop";

  const productSlide = product
    ? `
      <div class="hero hero-slide" data-slide="1">
        <div class="hero-inner container">
          <div class="hero-content">
            <span class="hero-label">Featured product</span>
            <h1>${escapeHtml(product.name)}</h1>
            <p>${escapeHtml(product.description || "A customer favourite from the Deckun collection.")}</p>
            <div style="display:flex; gap:0.75rem; flex-wrap:wrap; align-items:center;">
              <a href="#products/${escapeHtml(product.slug || "")}" class="btn btn-primary">View product</a>
              <span style="font-size:1.25rem; font-weight:700; color:var(--color-primary);">
                ${rupee(product.base_price != null ? product.base_price : product.price)}
              </span>
            </div>
          </div>
          <div class="hero-image">
            <img src="${escapeHtml(productImage)}" alt="${escapeHtml(product.name)}" loading="lazy" />
          </div>
        </div>
      </div>
    `
    : `
      <div class="hero hero-slide" data-slide="1">
        <div class="hero-inner container">
          <div class="hero-content">
            <span class="hero-label">Featured</span>
            <h1>New gear arriving soon</h1>
            <p>Explore the full Deckun collection of outdoor essentials.</p>
            <a href="#products" class="btn btn-primary">Browse products</a>
          </div>
        </div>
      </div>
    `;

  app.innerHTML = `
    <section class="hero-slider" id="hero-slider">
      <div class="hero hero-slide active" data-slide="0">
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
      </div>

      ${productSlide}

      <div class="hero hero-slide" data-slide="2">
        <div class="hero-inner container">
          <div class="hero-content" style="max-width:720px;">
            <span class="hero-label">Wholesale</span>
            <h1>Order in bulk at wholesale rates</h1>
            <p>
              Planning a large order? We offer special pricing for bulk purchases.
              Contact us on <a href="${telHref}" style="color:var(--color-primary);font-weight:600;">${escapeHtml(phone)}</a>.
            </p>
            <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
              <a href="${telHref}" class="btn btn-primary">Call us</a>
              <a href="${waHref}" target="_blank" rel="noopener noreferrer" class="btn btn-outline">WhatsApp</a>
            </div>
          </div>
        </div>
      </div>

      <button type="button" class="slide-nav prev" id="slide-prev" aria-label="Previous slide">&#8249;</button>
      <button type="button" class="slide-nav next" id="slide-next" aria-label="Next slide">&#8250;</button>
      <div class="slide-dots" id="slide-dots">
        <button type="button" class="slide-dot active" data-index="0" aria-label="Slide 1"></button>
        <button type="button" class="slide-dot" data-index="1" aria-label="Slide 2"></button>
        <button type="button" class="slide-dot" data-index="2" aria-label="Slide 3"></button>
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <h2>Shop the collection</h2>
        <p>Durable outdoor and furniture essentials for everyday adventure</p>
      </div>
      <div style="text-align:center;">
        <a href="#products" class="btn btn-primary">View all products</a>
      </div>
    </section>
  `;

  initSlider(app);
}

function initSlider(app) {
  const slides = Array.from(app.querySelectorAll(".hero-slide"));
  const dots = Array.from(app.querySelectorAll(".slide-dot"));
  const prev = app.querySelector("#slide-prev");
  const next = app.querySelector("#slide-next");
  const slider = app.querySelector("#hero-slider");
  if (slides.length <= 1) return;

  let index = 0;
  let timer = null;

  const show = (i) => {
    index = ((i % slides.length) + slides.length) % slides.length;
    slides.forEach((s, si) => s.classList.toggle("active", si === index));
    dots.forEach((d, di) => d.classList.toggle("active", di === index));
  };

  const restart = () => {
    if (timer) clearInterval(timer);
    timer = setInterval(() => show(index + 1), 7000);
  };

  prev?.addEventListener("click", () => { show(index - 1); restart(); });
  next?.addEventListener("click", () => { show(index + 1); restart(); });
  dots.forEach((dot) => dot.addEventListener("click", () => {
    show(Number(dot.dataset.index));
    restart();
  }));

  slider?.addEventListener("mouseenter", () => { if (timer) clearInterval(timer); });
  slider?.addEventListener("mouseleave", restart);

  let startX = null;
  slider?.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
  slider?.addEventListener("touchend", (e) => {
    if (startX == null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (dx > 50) { show(index - 1); restart(); }
    else if (dx < -50) { show(index + 1); restart(); }
    startX = null;
  });

  show(0);
  restart();
}
