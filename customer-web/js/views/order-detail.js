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

export async function renderOrderDetail(app, id) {
  if (!isLoggedIn()) {
    sessionStorage.setItem('post_login_redirect', `#orders/${id}`);
    app.innerHTML = `<section class="section"><div class="container" style="max-width:800px;text-align:center;">
      <p>Sign in to view this order.</p>
      <a href="#login" class="btn btn-primary" style="margin-top:1rem;">Sign In</a>
    </div></section>`;
    return;
  }

  app.innerHTML = `<section class="section"><div class="container" style="max-width:800px;"><div class="loading">Loading order…</div></div></section>`;

  let order;
  try {
    order = await api.get(`/orders/${id}`);
  } catch (e) {
    app.innerHTML = `<section class="section"><div class="container" style="max-width:800px;">
      <a href="#orders" style="color:var(--color-primary);">← Back to Orders</a>
      <p class="error-text" style="margin-top:1rem;">Could not load order: ${escapeHtml(e.message)}</p>
    </div></section>`;
    return;
  }

  const addr = order.shipping_address || {};
  const statusLabel = STATUS_LABELS[order.status] || order.status;
  const canCancel = ["placed", "confirmed", "preparing"].includes(order.status);

  const itemsHtml = (order.items || []).map((item) => `
    <div style="display:flex;justify-content:space-between;gap:1rem;padding:0.75rem 0;border-bottom:1px solid var(--color-border);">
      <div>
        <div style="font-weight:600;">${escapeHtml(item.product_name)}</div>
        ${item.variant_name ? `<div style="font-size:0.8rem;color:var(--color-text-muted);">${escapeHtml(item.variant_name)}</div>` : ""}
        <div style="font-size:0.8rem;color:var(--color-text-muted);">×${item.quantity} · ${rupee(item.unit_price)}</div>
      </div>
      <div style="font-weight:600;">${rupee(item.total_price)}</div>
    </div>
  `).join("");

  const historyHtml = (order.status_history || []).map((h) => `
    <li style="display:flex;gap:0.75rem;align-items:flex-start;padding:0.4rem 0;">
      <span style="color:var(--color-primary);">•</span>
      <span style="font-size:0.85rem;">
        <strong>${STATUS_LABELS[h.to_status] || h.to_status}</strong>
        <span style="color:var(--color-text-muted);">
          — ${new Date(h.changed_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </span>
        ${h.reason ? `<br/><span style="color:var(--color-text-muted);font-size:0.8rem;">${escapeHtml(h.reason)}</span>` : ""}
      </span>
    </li>
  `).join("");

  app.innerHTML = `
    <section class="section">
      <div class="container" style="max-width:800px;">
        <a href="#orders" style="color:var(--color-primary); display:inline-flex; align-items:center; gap:0.5rem; margin-bottom:1.5rem;">← Back to Orders</a>

        <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;">
          <h1 style="font-family:var(--font-heading); font-size:1.75rem; margin:0;">${escapeHtml(order.order_number)}</h1>
          <span class="badge badge-${order.status}">${statusLabel}</span>
        </div>

        <div class="card" style="margin-top:1rem;">
          <div class="card-header">Delivery Address</div>
          <p style="font-weight:600;">${escapeHtml(addr.full_name || order.user_full_name || "")}</p>
          <p style="color:var(--color-text-muted);font-size:0.875rem;">
            ${escapeHtml(addr.address_line1 || "")}${addr.address_line2 ? ", " + escapeHtml(addr.address_line2) : ""}<br/>
            ${escapeHtml(addr.city || "")}, ${escapeHtml(addr.state || "")} ${escapeHtml(addr.pincode || "")}
            ${addr.landmark ? `<br/>Landmark: ${escapeHtml(addr.landmark)}` : ""}
            ${addr.phone_number ? `<br/>Phone: ${escapeHtml(addr.phone_number)}` : ""}
          </p>
        </div>

        <div class="card">
          <div class="card-header">Items</div>
          ${itemsHtml || "<p>No items</p>"}
          <div style="margin-top:1rem;display:grid;gap:0.25rem;font-size:0.9rem;">
            <div style="display:flex;justify-content:space-between;"><span>Subtotal</span><span>${rupee(order.subtotal)}</span></div>
            <div style="display:flex;justify-content:space-between;color:var(--color-success);"><span>Discount</span><span>− ${rupee(order.discount_amount)}</span></div>
            <div style="display:flex;justify-content:space-between;"><span>Delivery</span><span>${order.delivery_fee == null ? "To be added" : rupee(order.delivery_fee)}</span></div>
            <div style="display:flex;justify-content:space-between;font-weight:700;border-top:1px solid var(--color-border);padding-top:0.5rem;margin-top:0.25rem;">
              <span>Total</span><span>${rupee(order.total_amount)}</span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">Status Timeline</div>
          <ul style="list-style:none;">${historyHtml || "<li>—</li>"}</ul>
        </div>

        ${canCancel ? `<button id="cancel-order" class="btn btn-danger" style="margin-top:1rem;">Cancel Order</button>` : ""}
        <div id="cancel-error" class="error-text" style="margin-top:0.5rem;"></div>
      </div>
    </section>
  `;

  if (canCancel) {
    document.getElementById('cancel-order').onclick = async () => {
      const reason = prompt('Reason for cancelling (optional):', '');
      if (reason === null) return;
      const btn = document.getElementById('cancel-order');
      btn.disabled = true;
      try {
        await api.post(`/orders/${id}/cancel`, { reason: reason || null });
        await renderOrderDetail(app, id);
      } catch (e) {
        document.getElementById('cancel-error').textContent = 'Failed: ' + e.message;
        btn.disabled = false;
      }
    };
  }
}
