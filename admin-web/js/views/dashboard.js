/**
 * views/dashboard.js — dashboard summary + recent orders.
 */

import { api } from "../api.js";

const STATUS_LABELS = {
  placed: "Placed",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export async function render() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="dashboard-summary">
      <h2 class="card-header">Today</h2>
      <div class="stats-grid" id="stats-grid">
        <div class="stat-card">Loading…</div>
      </div>
    </section>
    <section class="recent-orders">
      <div class="recent-header">
        <h2 class="card-header">Recent Orders</h2>
        <a href="#orders" class="link-btn">View all</a>
      </div>
      <ul class="list" id="recent-orders-list">
        <li>Loading…</li>
      </ul>
    </section>
  `;

  try {
    const data = await api.get("/api/admin/dashboard/");

    const rupee = (paise) =>
      "₹" + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    document.getElementById("stats-grid").innerHTML = `
      <div class="stat-card">
        <span class="stat-value">${data.today_orders || 0}</span>
        <span class="stat-label">Today's Orders</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${data.pending_orders || 0}</span>
        <span class="stat-label">Pending</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${rupee(data.revenue_today || 0)}</span>
        <span class="stat-label">Revenue Today</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${data.low_stock_count || 0}</span>
        <span class="stat-label">Low Stock</span>
      </div>
    `;

    const list = document.getElementById("recent-orders-list");
    if (!data.recent_orders || data.recent_orders.length === 0) {
      list.innerHTML = `<li class="empty-state">No orders today.</li>`;
    } else {
      list.innerHTML = data.recent_orders.map((order) => {
        const statusClass = `badge-${order.status}`;
        const statusLabel = STATUS_LABELS[order.status] || order.status;
        const time = new Date(order.created_at).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const rupee = (paise) =>
          "₹" + (paise / 100).toLocaleString("en-IN", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          });
        return `
          <li>
            <a href="#orders/${order.order_number}" class="order-link">
              <strong>${order.order_number}</strong>
              <span class="badge ${statusClass}">${statusLabel}</span>
            </a>
            <span class="order-meta">${rupee(order.total_amount)} · ${time}</span>
          </li>
        `;
      }).join("");
    }
  } catch (err) {
    document.getElementById("stats-grid").innerHTML =
      `<p class="error-text">Failed to load dashboard.</p>`;
  }
}
