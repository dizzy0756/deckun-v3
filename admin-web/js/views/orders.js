import { api, showToast } from "../api.js";

const STATUS_LABELS = {
  placed: "Placed",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const rupee = (paise) => {
  if (paise == null) return "₹0.00";
  return "₹" + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
        <button class="filter-chip" data-filter="all">All</button>
        <button class="filter-chip" data-filter="placed">Placed</button>
        <button class="filter-chip" data-filter="confirmed">Confirmed</button>
        <button class="filter-chip" data-filter="preparing">Preparing</button>
        <button class="filter-chip" data-filter="out_for_delivery">Out for Delivery</button>
        <button class="filter-chip" data-filter="delivered">Delivered</button>
        <button class="filter-chip" data-filter="cancelled">Cancelled</button>
      </div>
      <ul class="list" id="orders-list">
        <li>Loading…</li>
      </ul>
    </section>
  `;

  const params = { skip: 0, limit: 50 };
  try {
    const orders = await api.get("/api/admin/orders/", params);
    const list = document.getElementById("orders-list");

    if (!orders || orders.length === 0) {
      list.innerHTML = `<li class="empty-state">No orders found.</li>`;
      return;
    }

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
  const statusLabel = STATUS_LABELS[order.status] || order.status;

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

  app.innerHTML = `
    <section class="section">
      <div class="detail-header">
        <a href="#orders" class="back-link">&#8592; Back</a>
        <span class="badge badge-${order.status}">${statusLabel}</span>
      </div>

      <div class="card">
        <div class="card-header">Customer</div>
        <p class="customer-name">${order.user_full_name || "N/A"}</p>
        <p class="customer-mobile">${order.user_mobile || "N/A"}</p>
        <address class="customer-address">
          ${addr.address_line1 || ""}
          ${addr.address_line2 ? ", " + addr.address_line2 : ""}
          ${addr.city || ""}, ${addr.state || ""} ${addr.pincode || ""}
        </address>
      </div>

      <div class="card">
        <div class="card-header">Items</div>
        <ul class="item-list">
          ${itemsHtml}
          <li class="order-totals">
            <div>Total</div>
            <div class="total-row"><strong>${rupee(order.total_amount)}</strong></div>
          </li>
        </ul>
      </div>

      <div class="card">
        <div class="card-header">Payment</div>
        <p>Method: ${order.payment_method.toUpperCase()}</p>
        <p>Status: ${order.payment_status}</p>
      </div>

      <div class="order-actions" style="display:flex;gap:0.5rem;margin-top:1rem;">
        <a href="#orders" class="btn btn-secondary">Back to Orders</a>
      </div>
    </section>
  `;
}