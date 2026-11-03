import { api } from "../api.js";

export async function render() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="section">
      <div class="section-header">
        <h2>Promotions</h2>
        <p>Manage discount codes</p>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Discount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="promotions-list">
            <li>Loading…</li>
          </tbody>
        </table>
      </div>
    </section>
  `;

  try {
    const promotions = await api.get("/api/admin/promotions/");
    const list = document.getElementById("promotions-list");

    if (!promotions || promotions.length === 0) {
      list.innerHTML = `<li class="empty-state">No promotions.</li>`;
      return;
    }

    list.innerHTML = promotions.map((p) => `
      <li>
        <div class="item-name"><code>${p.code || "-"}</code></div>
        <div class="item-qty-price">${p.name || "Untitled"}</div>
        <div class="item-qty-price">${p.discount_percent || 0}%</div>
        <div><span class="badge ${p.is_active ? "badge-active" : "badge-inactive"}">${p.is_active ? "Active" : "Inactive"}</span></div>
      </li>
    `).join("");
  } catch (err) {
    document.getElementById("promotions-list").innerHTML =
      `<li class="error-text">Failed to load promotions.</li>`;
  }
}