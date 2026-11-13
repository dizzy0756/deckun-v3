import { api } from "../api.js";

const STATUS_LABELS = {
  placed: "Placed",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_FLOW = ["placed", "confirmed", "preparing", "out_for_delivery", "delivered"];

const rupee = (amount) => {
  if (amount == null) return "₹0.00";
  return "₹" + Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export async function render({ id }) {
  if (id) {
    await renderOrderDetail(id);
  } else {
    await renderOrderList();
  }
}

async function renderOrderList() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="section">
      <div class="section-header">
        <h2>Orders</h2>
        <p>Manage customer orders</p>
      </div>
      <div class="filter-bar" id="filter-bar">
        <button class="filter-chip active" data-filter="">All</button>
        ${Object.entries(STATUS_LABELS).map(([k, v]) =>
          `<button class="filter-chip" data-filter="${k}">${v}</button>`
        ).join("")}
      </div>
      <div id="orders-list">
        <div class="loading">Loading…</div>
      </div>
    </section>
  `;

  const wrap = document.getElementById("orders-list");
  let current = "";

  const load = async () => {
    wrap.innerHTML = `<div class="loading">Loading…</div>`;
    try {
      const url = current
        ? `/api/admin/orders/?limit=100&status=${current}`
        : "/api/admin/orders/?limit=100";
      const orders = await api.get(url);

      if (!orders || orders.length === 0) {
        wrap.innerHTML = `<p class="empty-state">No ${current ? STATUS_LABELS[current].toLowerCase() + " " : ""}orders found.</p>`;
        return;
      }

      wrap.innerHTML = `
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Placed</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map((o) => `
                <tr>
                  <td><strong>${escapeHtml(o.order_number)}</strong></td>
                  <td><span class="badge badge-${o.status}">${STATUS_LABELS[o.status] || o.status}</span></td>
                  <td style="font-size:0.8rem;">${escapeHtml(String(o.payment_method).toUpperCase())}<br/>
                    <span style="color:var(--color-text-muted);">${escapeHtml(o.payment_status)}</span>
                  </td>
                  <td>${rupee(o.total_amount)}</td>
                  <td style="font-size:0.8rem;">${new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td><a href="#orders/${o.id}" class="btn btn-secondary btn-sm">View</a></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      wrap.innerHTML = `<p class="error-text">Failed to load orders.</p>`;
    }
  };

  document.getElementById("filter-bar").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-filter]");
    if (!chip) return;
    current = chip.dataset.filter;
    document.querySelectorAll("#filter-bar .filter-chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    load();
  });

  load();
}

async function renderOrderDetail(orderId) {
  const app = document.getElementById("app");
  app.innerHTML = `<div class="loading">Loading order…</div>`;

  let order;
  try {
    order = await api.get(`/api/admin/orders/${orderId}`);
  } catch (err) {
    app.innerHTML = `<div class="error-text">Order not found.</div><a href="#orders" class="btn btn-secondary">Back to Orders</a>`;
    return;
  }

  const statusLabel = STATUS_LABELS[order.status] || order.status;
  const addr = order.shipping_address || {};

  const itemsHtml = (order.items || []).map((item) => `
    <li style="display:flex;justify-content:space-between;gap:1rem;padding:0.75rem 0;border-bottom:1px solid var(--color-border);">
      <div>
        <div style="font-weight:600;">${escapeHtml(item.product_name)}</div>
        ${item.variant_name ? `<div style="font-size:0.8rem;color:var(--color-text-muted);">${escapeHtml(item.variant_name)}</div>` : ""}
        <div style="font-size:0.8rem;color:var(--color-text-muted);">×${item.quantity} · ${rupee(item.unit_price)}</div>
      </div>
      <div style="font-weight:600;">${rupee(item.total_price)}</div>
    </li>
  `).join("");

  // Next-status actions
  const idx = STATUS_FLOW.indexOf(order.status);
  const nextStatus = idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
  const canCancel = !["delivered", "cancelled"].includes(order.status);

  app.innerHTML = `
    <section class="section">
      <div class="detail-header" style="flex-wrap:wrap;">
        <a href="#orders" class="back-link">&#8592; Back to Orders</a>
        <span class="badge badge-${order.status}">${statusLabel}</span>
      </div>

      <div class="card">
        <div class="card-header">Customer</div>
        <p style="font-weight:600;">${escapeHtml(order.user_full_name || "N/A")}</p>
        <p>${escapeHtml(order.user_mobile || "N/A")}</p>
        <address style="font-style:normal;color:var(--color-text-secondary);margin-top:0.5rem;">
          ${escapeHtml(addr.address_line1 || "")}
          ${addr.address_line2 ? ", " + escapeHtml(addr.address_line2) : ""}<br/>
          ${escapeHtml(addr.city || "")}, ${escapeHtml(addr.state || "")} ${escapeHtml(addr.pincode || "")}
          ${addr.landmark ? `<br/>Landmark: ${escapeHtml(addr.landmark)}` : ""}
        </address>
      </div>

      <div class="card">
        <div class="card-header">Items</div>
        <ul style="list-style:none;">
          ${itemsHtml || "<li>No items</li>"}
        </ul>
        <div style="margin-top:1rem;display:grid;gap:0.25rem;font-size:0.9rem;">
          <div style="display:flex;justify-content:space-between;"><span>Subtotal</span><span>${rupee(order.subtotal)}</span></div>
          <div style="display:flex;justify-content:space-between;"><span>Discount</span><span>− ${rupee(order.discount_amount)}</span></div>
          <div style="display:flex;justify-content:space-between;"><span>Delivery</span><span>${order.delivery_fee == null ? "—" : rupee(order.delivery_fee)}</span></div>
          <div style="display:flex;justify-content:space-between;font-weight:700;border-top:1px solid var(--color-border);padding-top:0.5rem;margin-top:0.25rem;">
            <span>Total</span><span>${rupee(order.total_amount)}</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">Payment & Source</div>
        <p>Method: ${escapeHtml(String(order.payment_method).toUpperCase())}</p>
        <p>Status: ${escapeHtml(order.payment_status)}</p>
        <p>Source: ${escapeHtml(order.order_source)}</p>
        ${order.customer_note ? `<p style="margin-top:0.5rem;">Note: ${escapeHtml(order.customer_note)}</p>` : ""}
      </div>

      <div class="card">
        <div class="card-header">Update Status</div>
        <div id="status-actions" style="display:flex;gap:0.5rem;flex-wrap:wrap;">
          ${order.status === "placed" ? `<button class="btn btn-primary" data-action="confirm">Confirm Order</button>` : ""}
          ${nextStatus && order.status !== "placed" ? `<button class="btn btn-primary" data-action="next">Mark ${STATUS_LABELS[nextStatus]}</button>` : ""}
          ${canCancel ? `<button class="btn btn-danger" data-action="cancel">Cancel Order</button>` : ""}
          ${order.status === "delivered" ? `<span style="color:var(--color-text-muted);">Order completed.</span>` : ""}
          ${order.status === "cancelled" ? `<span style="color:var(--color-text-muted);">Order cancelled.</span>` : ""}
        </div>
        <div id="status-error" class="error-text" style="margin-top:0.5rem;"></div>
      </div>
    </section>
  `;

  const errBox = document.getElementById("status-error");

  const doStatus = async (newStatus, reason) => {
    errBox.textContent = "";
    try {
      await api.patch(`/api/admin/orders/${orderId}/status`, { status: newStatus, reason: reason || null });
      await renderOrderDetail(orderId);
    } catch (e) {
      errBox.textContent = "Failed: " + e.message;
    }
  };

  document.getElementById("status-actions").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === "confirm") {
      const fee = prompt("Delivery fee (₹):", "0");
      if (fee === null) return;
      const feeNum = Number(fee);
      if (isNaN(feeNum) || feeNum < 0) {
        errBox.textContent = "Enter a valid delivery fee";
        return;
      }
      btn.disabled = true;
      try {
        await api.post(`/api/admin/orders/${orderId}/confirm`, { delivery_fee: feeNum });
        await renderOrderDetail(orderId);
      } catch (err2) {
        errBox.textContent = "Failed: " + err2.message;
        btn.disabled = false;
      }
    } else if (action === "next") {
      btn.disabled = true;
      await doStatus(nextStatus);
    } else if (action === "cancel") {
      const reason = prompt("Cancellation reason (optional):", "");
      if (reason === null) return;
      btn.disabled = true;
      await doStatus("cancelled", reason);
    }
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}
