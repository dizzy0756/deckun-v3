import { api } from "../api.js";

export async function render() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="section">
      <div class="section-header">
        <h2>Customers</h2>
        <p>Customer directory</p>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Mobile</th>
              <th>Orders</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="customers-list">
            <li>Loading…</li>
          </tbody>
        </table>
      </div>
    </section>
  `;

  try {
    const customers = await api.get("/api/admin/customers/");
    const list = document.getElementById("customers-list");

    if (!customers || customers.length === 0) {
      list.innerHTML = `<li class="empty-state">No customers.</li>`;
      return;
    }

    list.innerHTML = customers.map((c) => `
      <li>
        <div class="item-name">${c.full_name || c.name || "Customer"}</div>
        <div class="item-qty-price">${c.mobile_number || c.mobile || "-"}</div>
        <div class="item-qty-price">${c.order_count || 0}</div>
        <div>
          <a href="#orders?customer=${c.id}" class="btn btn-secondary btn-sm">Orders</a>
        </div>
      </li>
    `).join("");
  } catch (err) {
    document.getElementById("customers-list").innerHTML =
      `<li class="error-text">Failed to load customers.</li>`;
  }
}