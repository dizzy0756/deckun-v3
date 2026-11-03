import { renderHome } from './views/home.js';
import { renderProducts } from './views/products.js';
import { renderProductDetail } from './views/product-detail.js';
import { renderCart } from './views/cart.js';
import { renderCheckout } from './views/checkout.js';
import { renderLogin } from './views/login.js';
import { renderRegister } from './views/register.js';
import { renderAccount } from './views/account.js';
import { renderOrders } from './views/orders.js';
import { renderOrderDetail } from './views/order-detail.js';
import { renderAbout } from './views/about.js';
import { renderContact } from './views/contact.js';

const cartBadge = document.getElementById('cart-badge');
const mobileNavLinks = document.querySelectorAll('.mobile-nav a');

// Save default meta tags on page load
const DEFAULT_META = {
  title: document.title,
  description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
  ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '',
  ogDescription: document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '',
  ogType: document.querySelector('meta[property="og:type"]')?.getAttribute('content') || '',
  ogUrl: document.querySelector('meta[property="og:url"]')?.getAttribute('content') || '',
  ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '',
  twitterCard: document.querySelector('meta[name="twitter:card"]')?.getAttribute('content') || '',
  twitterTitle: document.querySelector('meta[name="twitter:title"]')?.getAttribute('content') || '',
  twitterDescription: document.querySelector('meta[name="twitter:description"]')?.getAttribute('content') || '',
  twitterImage: document.querySelector('meta[name="twitter:image"]')?.getAttribute('content') || '',
};

// Restore default meta tags
function restoreDefaultMeta() {
  document.title = DEFAULT_META.title;
  setMeta('description', DEFAULT_META.description, 'name');
  setMeta('og:title', DEFAULT_META.ogTitle, 'property');
  setMeta('og:description', DEFAULT_META.ogDescription, 'property');
  setMeta('og:type', DEFAULT_META.ogType, 'property');
  setMeta('og:url', DEFAULT_META.ogUrl, 'property');
  setMeta('og:image', DEFAULT_META.ogImage, 'property');
  setMeta('twitter:card', DEFAULT_META.twitterCard, 'name');
  setMeta('twitter:title', DEFAULT_META.twitterTitle, 'name');
  setMeta('twitter:description', DEFAULT_META.twitterDescription, 'name');
  setMeta('twitter:image', DEFAULT_META.twitterImage, 'name');

  // Remove product JSON-LD
  const existing = document.querySelector('script[type="application/ld+json"][data-product]');
  if (existing) existing.remove();
}

function setMeta(name, value, attr = 'name') {
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function updateCartBadge() {
  try {
    if (!cartBadge) return;
    const cart = JSON.parse(localStorage.getItem('deckun_cart') || '[]');
    const count = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
    if (count > 0) {
      cartBadge.textContent = count;
      cartBadge.classList.remove('hidden');
    } else {
      cartBadge.classList.add('hidden');
    }
  } catch {
    if (cartBadge) cartBadge.classList.add('hidden');
  }
}

function setActiveNav(hash) {
  try {
    if (!mobileNavLinks || !mobileNavLinks.length) return;
    mobileNavLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;
      const target = href.replace('#', '');
      link.classList.toggle('active', hash.includes(target) || (target === 'home' && (hash === '#home' || hash === '' || hash === '#')));
    });
  } catch (e) {
    // ignore
  }
}

async function router() {
  const hash = window.location.hash || '#home';
  updateCartBadge();
  setActiveNav(hash);
  const appEl = document.getElementById('app');
  if (!appEl) {
    console.error('App element not found');
    return;
  }
  appEl.innerHTML = '<div class="loading">Loading...</div>';
  
  try {
    if (hash.startsWith('#home') || hash === '#' || hash === '') {
      restoreDefaultMeta();
      await renderHome(appEl);
    } else if (hash.startsWith('#products/') && hash.split('/').length > 1) {
      const parts = hash.split('/');
      const slug = parts[1];
      await renderProductDetail(appEl, slug);
    } else if (hash.startsWith('#products')) {
      restoreDefaultMeta();
      await renderProducts(appEl);
    } else if (hash.startsWith('#cart')) {
      restoreDefaultMeta();
      await renderCart(appEl);
    } else if (hash.startsWith('#checkout')) {
      restoreDefaultMeta();
      await renderCheckout(appEl);
    } else if (hash.startsWith('#login')) {
      restoreDefaultMeta();
      await renderLogin(appEl);
    } else if (hash.startsWith('#register')) {
      restoreDefaultMeta();
      await renderRegister(appEl);
    } else if (hash.startsWith('#account')) {
      restoreDefaultMeta();
      await renderAccount(appEl);
    } else if (hash.startsWith('#orders/') && hash.split('/').length > 1) {
      restoreDefaultMeta();
      const id = hash.split('/')[1];
      await renderOrderDetail(appEl, id);
    } else if (hash.startsWith('#orders')) {
      restoreDefaultMeta();
      await renderOrders(appEl);
    } else if (hash.startsWith('#about')) {
      restoreDefaultMeta();
      await renderAbout(appEl);
    } else if (hash.startsWith('#contact')) {
      restoreDefaultMeta();
      await renderContact(appEl);
    } else {
      restoreDefaultMeta();
      await renderHome(appEl);
    }
  } catch (e) {
    console.error(e);
    if (appEl) {
      appEl.innerHTML = `<div style="padding:2rem;text-align:center;"><h2>Something went wrong</h2><p style="color:var(--color-text-muted);">${e.message || ''}</p></div>`;
    }
  }
}

// Initialize
function init() {
  try {
    updateCartBadge();
    if (mobileNavLinks && mobileNavLinks.length) {
      mobileNavLinks.forEach(link => {
        link.addEventListener('click', () => {
          setTimeout(() => router(), 10);
        });
      });
    }
    document.addEventListener('click', (e) => {
      const target = e.target.closest('a[href^="#"]');
      if (target) {
        setTimeout(() => router(), 10);
      }
    });
  } catch (e) {
    console.error('Init error:', e);
  }
}

function run() {
  try {
    init();
    // Run router immediately
    const hash = window.location.hash || '#home';
    updateCartBadge();
    setActiveNav(hash);
    const appEl = document.getElementById('app');
    if (appEl) {
      appEl.innerHTML = '<div class="loading">Loading...</div>';
      // Call router logic inline
      (async () => {
        try {
          if (hash.startsWith('#home') || hash === '#' || hash === '') {
            await renderHome(appEl);
          } else if (hash.startsWith('#products/') && hash.split('/').length > 1) {
            const parts = hash.split('/');
            const slug = parts[1];
            await renderProductDetail(appEl, slug);
          } else if (hash.startsWith('#products')) {
            await renderProducts(appEl);
          } else if (hash.startsWith('#cart')) {
            await renderCart(appEl);
          } else if (hash.startsWith('#checkout')) {
            await renderCheckout(appEl);
          } else if (hash.startsWith('#login')) {
            await renderLogin(appEl);
          } else if (hash.startsWith('#register')) {
            await renderRegister(appEl);
          } else if (hash.startsWith('#account')) {
            await renderAccount(appEl);
          } else if (hash.startsWith('#orders/') && hash.split('/').length > 1) {
            const id = hash.split('/')[1];
            await renderOrderDetail(appEl, id);
          } else if (hash.startsWith('#orders')) {
            await renderOrders(appEl);
          } else if (hash.startsWith('#about')) {
            await renderAbout(appEl);
          } else if (hash.startsWith('#contact')) {
            await renderContact(appEl);
          } else {
            await renderHome(appEl);
          }
        } catch (e) {
          console.error(e);
          if (appEl) {
            appEl.innerHTML = `<div style="padding:2rem;text-align:center;"><h2>Something went wrong</h2><p style="color:var(--color-text-muted);">${e.message || ''}</p></div>`;
          }
        }
      })();
    }
  } catch (e) {
    console.error('Run error:', e);
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', run);
} else {
  run();
}
window.addEventListener('hashchange', router);
try {
  if (typeof window !== 'undefined') {
    window.addEventListener('cart-updated', updateCartBadge);
  }
} catch (e) {}
export { run, router, init }
