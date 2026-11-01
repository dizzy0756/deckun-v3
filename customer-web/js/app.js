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
      await renderHome(appEl);
    } else if (hash.startsWith('#products/') && hash.split('/').length > 2) {
      const parts = hash.split('/');
      const slug = parts[2];
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
    } else if (hash.startsWith('#orders/') && hash.split('/').length > 2) {
      const id = hash.split('/')[2];
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
          } else if (hash.startsWith('#products/') && hash.split('/').length > 2) {
            const parts = hash.split('/');
            const slug = parts[2];
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
          } else if (hash.startsWith('#orders/') && hash.split('/').length > 2) {
            const id = hash.split('/')[2];
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
function router() { run(); }
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
export { run, router, init };
export { run, router, init };
export { run, router, init };
