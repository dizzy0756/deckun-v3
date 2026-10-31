/**
 * views/orders.js — orders list + detail + status workflow.
 */

import { api, confirmDialog, showToast } from "../api.js";

const STATUS_FILTERS = ["all", "placed", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"];

const STATUS_LABELS = {
  placed: "Placed",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_OPTIONS = [
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const ALLOWED_TRANSITIONS = {
  placed: ["confirmed", "preparing", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered"],
  delivered: [],
  cancelled: [],
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
    <section class="orders-list">
      <div class="list-header">
        <h2 class="card-header">Orders</h2>
      </div>
      <div class="filter-bar" id="filter-bar">
        ${STATUS_FILTERS.map((s) => `
          <button class="filter-chip" data-filter="${s}">
            ${s === "all" ? "All" : STATUS_LABELS[s]}
          </button>
        `).join("")}
      </div>
      <ul class="list" id="orders-list">
        <li>Loading…</li>
      </ul>
    </section>
  `;

  const activeFilter = new URLSearchParams(window.location.hash.split("?")[1] || "").get("status") || "all";
  setActiveFilter(activeFilter);
  await loadOrders(activeFilter);

  document.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const filter = chip.dataset.filter;
      setActiveFilter(filter);
      const url = filter === "all" ? "#orders" : `#orders?status=${filter}`;
      window.location.hash = url;
    });
  });
}

function setActiveFilter(active) {
  document.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.filter === active);
  });
}

async function loadOrders(statusFilter) {
  try {
    const params = { skip: 0, limit: 50 };
    if (statusFilter !== "all") params.status = statusFilter;
    const orders = await api.get("/api/admin/orders/", params);
    const list = document.getElementById("orders-list");

    if (!orders || orders.length === 0) {
      list.innerHTML = `<li class="empty-state">No orders found.</li>`;
      return;
    }

    const rupee = (paise) =>
      "₹" + (paise / 100).toLocaleString("en-IN");

    list.innerHTML = orders.map((order) => {
      const statusClass = `badge-${order.status}`;
      const statusLabel = STATUS_LABELS[order.status] || order.status;
      const created = new Date(order.created_at);
      const timeAgo = created.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      });

      return `
        <li>
          <a href="#orders/${order.id}" class="order-list-link">
            <strong>${order.order_number}</strong>
            <span class="badge ${statusClass}">${statusLabel}</span>
          </a>
          <span class="order-meta">
            ${rupee(order.total_amount)} · ${order.payment_method.toUpperCase()} · ${timeAgo}
          </span>
        </li>
      `;
    }).join("");
  } catch (err) {
    document.getElementById("orders-list").innerHTML =
      `<li class="error-text">Failed to load orders.</li>`;
  }
}

async function renderOrderDetail(orderId) {
  const app = document.getElementById("app");
  app.innerHTML = `<div id="order-detail"><p>Loading order…</p></div>`;

  try {
    const order = await api.get(`/api/admin/orders/${orderId}`);
    renderOrderDetailContent(order);
  } catch (err) {
    app.innerHTML = `<div class="error-text">Order not found or you are not authorized.</div>`;
  }
}

function renderOrderDetailContent(order) {
  const app = document.getElementById("app");
  const rupee = (paise) =>
    "₹" + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const statusClass = `badge-${order.status}`;
  const statusLabel = STATUS_LABELS[order.status] || order.status;

  let statusHistoryHtml = "";
  if (order.status_history && order.status_history.length > 0) {
    statusHistoryHtml = order.status_history.map((h) => `
      <li>
        <span class="badge badge-small ${h.from_status ? `badge-${h.from_status}` : ""}">
          ${h.from_status ? STATUS_LABELS[h.from_status] : "—"}
        </span>
        →
        <span class="badge badge-small badge-${h.to_status}">
          ${STATUS_LABELS[h.to_status] || h.to_status}
        </span>
        <span class="history-meta">${h.changed_by}</span>
        <time>${new Date(h.changed_at).toLocaleString("en-IN")}</time>
      </li>
    `).join("");
  }

  let itemsHtml = "";
  if (order.items && order.items.length > 0) {
    itemsHtml = order.items.map((item) => `
      <li class="order-item">
        <div class="item-name">${item.product_name}
          ${item.variant_name ? `<span class="variant-name">${item.variant_name}</span>` : ""}
        </div>
        <div class="item-qty-price">
          ×${item.quantity} · ${rupee(item.unit_price)}
        </div>
        <div class="item-total">${rupee(item.total_price)}</div>
      </li>
    `).join("");
  }

  const addr = order.shipping_address || {};
  const allowedToCancel = ALLOWED_TRANSITIONS[order.status]?.includes("cancelled");
  const canChangeStatus = order.status !== "cancelled" && order.status !== "delivered";

  app.innerHTML = `
    <section class="order-detail">
      <div class="detail-header">
        <a href="#orders" class="back-link">&#8592; ${order.order_number}</a>
        <span class="badge ${statusClass}">${statusLabel}</span>
      </div>

      <div class="card">
        <div class="card-header">Customer</div>
        <p class="customer-name">${order.user_full_name}</p>
        <p class="customer-mobile">${order.user_mobile}</p>
        <address class="customer-address">
          ${addr.address_line1 || ""}
          ${addr.address_line2 ? `, ${addr.address_line2}` : ""}
          ${addr.city || ""}, ${addr.state || ""} ${addr.pincode || ""}
        </address>
        ${order.customer_note ? `<p class="customer-note"><strong>Note:</strong> ${order.customer_note}</p>` : ""}
      </div>

      <div class="card">
        <div class="card-header">Items</div>
        <ul class="item-list">
          ${itemsHtml}
          <li class="order-totals">
            <div>Subtotal</div><div>${rupee(order.subtotal)}</div>
            ${order.discount_amount > 0 ? `<div>Discount</div><div>-${rupee(order.discount_amount)}</div>` : ""}
            ${order.delivery_fee ? `<div>Delivery Fee</div><div>${rupee(order.delivery_fee)}</div>` : ""}
            <div class="total-row"><strong>Total</strong></div>
            <div class="total-row"><strong>${rupee(order.total_amount)}</strong></div>
          </li>
        </ul>
      </div>

      <div class="card">
        <div class="card-header">Payment</div>
        <p>Method: ${order.payment_method.toUpperCase()}</p>
        <p>Status: ${order.payment_status}</p>
        ${order.payment?.razorpay_payment_id ? `<p>Payment ID: ${order.payment.razorpay_payment_id}</p>` : ""}
      </div>

      ${order.status_history && order.status_history.length > 0 ? `
      <div class="card">
        <div class="card-header">Status History</div>
        <ul class="history-list">
          ${statusHistoryHtml}
        </ul>
      </div>
      ` : ""}

      <div class="order-actions">
        ${order.status === "placed" ? `
          <button class="btn btn-primary" id="confirm-btn"
            data-delivery-fee="${order.delivery_fee || 0}">
            Confirm Order
          </button>
        ` : ""}
        ${canChangeStatus ? `
          <button class="btn btn-ghost" id="change-status-btn">Change Status</button>
        ` : ""}
        ${allowedToCancel ? `
          <button class="btn btn-error" id="cancel-btn">Cancel Order</button>
        ` : ""}
      </div>
    </section>
  `;

  bindOrderDetailButtons(order);
}

function bindOrderDetailButtons(order) {
  const confirmBtn = document.getElementById("confirm-btn");
  if (confirmBtn) {
    confirmBtn.addEventListener("click", () => showConfirmModal(order));
  }

  const changeBtn = document.getElementById("change-status-btn");
  if (changeBtn) {
    changeBtn.addEventListener("click", () => showStatusModal(order));
  }

  const cancelBtn = document.getElementById("cancel-btn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => showCancelModal(order));
  }
}

async function showConfirmModal(order) {
  const confirmed = await confirmDialog(
    "Confirm Order #" + order.order_number + "\nEnter delivery fee (in paise):",
    "Confirm"
  );
  if (confirmed) {
    const feeStr = prompt("Delivery fee (paise):", "4000");
    if (feeStr === null) return;
    const fee = parseInt(feeStr, 10);
    if (isNaN(fee) || fee < 0) return;
    try {
      await api.post(`/api/admin/orders/${order.id}/confirm`, { delivery_fee: fee });
      showToast("Order confirmed", "info");
      setTimeout(() => (window.location.hash = `#orders/${order.id}`), 1000);
    } catch (err) {
      /* error already shown by api.js */
    }
  }
}

async function showStatusModal(order) {
  const current = order.status;
  const allowed = ALLOWED_TRANSITIONS[current] || [];
  const options = STATUS_OPTIONS.filter((o) => allowed.includes(o.value));

  if (options.length === 0) {
    showToast("No status transitions available", "info");
    return;
  }

  const status = options.map((o) => o.value).join("|");
  const label = options.map((o) => o.label).join(", ");
  const newStatus = await showStatusPicker(status, label);
  if (!newStatus) return;

  const reason = await promptReason();
  if (reason === null) return;

  try {
    await api.patch(`/api/admin/orders/${order.id}/status`, {
      status: newStatus,
      reason: reason || undefined,
    });
    showToast("Status updated", "info");
    setTimeout(() => (window.location.hash = `#orders/${order.id}`), 1000);
  } catch (err) {
    /* error shown by api.js */
  }
}

function showStatusPicker(statuses, labels) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "loading-overlay";
    overlay.innerHTML = `
      <div class="modal-box">
        <h3>Change Status</h3>
        <p>Allowed: ${labels}</p>
        <form id="status-form">
          <select name="status" id="status-select">
            ${statuses.split("|").map((s) => {
              const label = STATUS_LABELS[s] || s;
              return `<option value="${s}">${label}</option>`;
            }).join("")}
          </select>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" data-cancel>Cancel</button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector("[data-cancel]").onclick = () => {
      document.body.removeChild(overlay);
      resolve(null);
    };
    overlay.querySelector("#status-form").onsubmit = (e) => {
      e.preventDefault();
      document.body.removeChild(overlay);
      resolve(e.target.status.value);
    };
  });
}

function promptReason() {
  return prompt("Reason (optional):", "");
}

async function showCancelModal(order) {
  const confirmed = await confirmDialog(
    "Cancel Order #" + order.order_number + "?",
    "Cancel Order"
  );
  if (!confirmed) return;

  const reason = prompt("Reason for cancellation:", "");
  if (reason === null) return;

  try {
    await api.post(`/api/admin/orders/${order.id}/cancel`, {
      reason: reason || undefined,
    });
    showToast("Order cancelled", "info");
    setTimeout(() => (window.location.hash = `#orders/${order.id}`), 1000);
  } catch (err) {
    /* error shown by api.js */
  }
}

export async function handleWhatsAppOrder(payload) {
  try {
    const order = await api.post("/api/admin/orders/whatsapp", payload);
    showToast("WhatsApp order created: " + order.order_number, "info");
    window.location.hash = "#orders";
  } catch (err) {
    /* error shown by api.js */
  }
}
