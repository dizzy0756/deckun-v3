import { api } from "../api.js";

const STATUS_LABELS = {
  placed: "Placed",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const rupee = (amount) => {
  if (amount == null) return "₹0.00";
  return "₹" + Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export async function render() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="section">
      <div class="section-header">
        <h2>Dashboard</h2>
        <p>Today's overview</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <span class="label">Today's Orders</span>
          <span class="value" id="stat-orders">-</span>
        </div>
        <div class="stat-card">
          <span class="label">Pending</span>
          <span class="value" id="stat-pending">-</span>
        </div>
        <div class="stat-card">
          <span class="label">Revenue Today</span>
          <span class="value" id="stat-revenue">-</span>
        </div>
        <div class="stat-card">
          <span class="label">Low Stock</span>
          <span class="value" id="stat-lowstock">-</span>
        </div>
      </div>

      <div class="section-header" style="margin-top:2rem;">
        <h2>Recent Orders</h2>
      </div>
      <ul class="list" id="recent-orders-list">
        <li>Loading…</li>
      </ul>
    </section>
  `;

  try {
    const data = await api.get("/api/admin/dashboard/");

    document.getElementById("stat-orders").textContent = data.today_orders || 0;
    document.getElementById("stat-pending").textContent = data.pending_orders || 0;
    document.getElementById("stat-revenue").textContent = rupee(data.revenue_today || 0);
    document.getElementById("stat-lowstock").textContent = data.low_stock_count || 0;

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