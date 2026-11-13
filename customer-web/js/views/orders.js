import { api, isLoggedIn } from '../api.js';

const STATUS_LABELS = {
  placed: "Placed",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const rupee = (amount) => "₹" + Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
};

export async function renderOrders(app) {
  if (!isLoggedIn()) {
    sessionStorage.setItem('post_login_redirect', '#orders');
    app.innerHTML = `
      <section class="section">
        <div class="container" style="max-width:800px; text-align:center;">
          <h1 style="font-family:var(--font-heading); font-size:2rem; margin-bottom:0.5rem;">My Orders</h1>
          <p style="color:var(--color-text-muted); margin-bottom:1.5rem;">Sign in to see your orders.</p>
          <a href="#login" class="btn btn-primary">Sign In</a>
        </div>
      </section>
    `;
    return;
  }

  app.innerHTML = `<section class="section"><div class="container" style="max-width:800px;"><div class="loading">Loading orders…</div></div></section>`;

  let orders = [];
  try {
    orders = await api.get('/orders/');
  } catch (e) {
    app.innerHTML = `<section class="section"><div class="container" style="max-width:800px;">
      <h1 style="font-family:var(--font-heading); font-size:2rem; margin-bottom:1.5rem;">My Orders</h1>
      <p class="error-text">Could not load orders: ${escapeHtml(e.message)}</p>
    </div></section>`;
    return;
  }

  app.innerHTML = `
    <section class="section">
      <div class="container" style="max-width:800px;">
        <h1 style="font-family:var(--font-heading); font-size:2rem; margin-bottom:1.5rem;">My Orders</h1>
        ${orders.length === 0
          ? `<p style="color:var(--color-text-muted);">No orders yet.
               <a href="#products" style="color:var(--color-primary);">Start shopping</a></p>`
          : `<div style="display:flex;flex-direction:column;gap:0.75rem;">
              ${orders.map((o) => `
                <a href="#orders/${o.id}" class="card" style="display:flex;justify-content:space-between;gap:1rem;align-items:center;flex-wrap:wrap;">
                  <div>
                    <div style="font-weight:600;">${escapeHtml(o.order_number)}</div>
                    <div style="font-size:0.8rem;color:var(--color-text-muted);">
                      ${new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      · ${escapeHtml(String(o.payment_method).toUpperCase())}
                    </div>
                  </div>
                  <div style="display:flex;align-items:center;gap:0.75rem;">
                    <span class="badge badge-${o.status}">${STATUS_LABELS[o.status] || o.status}</span>
                    <strong>${rupee(o.total_amount)}</strong>
                  </div>
                </a>
              `).join("")}
            </div>`}
      </div>
    </section>
  `;
}
