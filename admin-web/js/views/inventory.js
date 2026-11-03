import { api } from "../api.js";

const rupee = (paise) => {
  if (paise == null) return "₹0.00";
  return "₹" + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export async function render() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="section">
      <div class="section-header">
        <h2>Inventory</h2>
        <p>Manage stock levels</p>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Product / Variant</th>
              <th>SKU</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="inventory-list">
            <li>Loading…</li>
          </tbody>
        </table>
      </div>
    </section>
  `;

  try {
    const inventory = await api.get("/api/admin/inventory/?low_stock_only=false");
    const list = document.getElementById("inventory-list");

    if (!inventory || inventory.length === 0) {
      list.innerHTML = `<li class="empty-state">No inventory items.</li>`;
      return;
    }

    list.innerHTML = inventory.map((item) => `
      <li>
        <div class="item-name">${item.product_name || "Product"}
          ${item.variant_name ? ` <span class="variant-name">${item.variant_name}</span>` : ""}
        </div>
        <div class="item-qty-price">${item.sku || "-"}</div>
        <div class="item-total">
          <input type="number" id="stock-${item.id || item.variant_id}" value="${item.stock_quantity || 0}" class="form-control" style="width:80px;" />
        </div>
        <div><span class="badge ${item.stock_quantity <= 5 ? "badge-preparing" : "badge-active"}">${item.stock_quantity <= 5 ? "Low" : "OK"}</span></div>
        <div>
          <button class="btn btn-primary btn-sm" onclick="updateStock('${item.id || item.variant_id}')">Update</button>
        </div>
      </li>
    `).join("");
  } catch (err) {
    document.getElementById("inventory-list").innerHTML =
      `<li class="error-text">Failed to load inventory.</li>`;
  }
}

window.updateStock = async function(id) {
  const input = document.getElementById("stock-" + id);
  const qty = parseInt(input.value, 10);
  try {
    await api.patch(`/api/admin/inventory/variants/${id}/stock`, { stock_quantity: qty });
    alert("Stock updated");
  } catch (e) {
    alert("Failed to update: " + e.message);
  }
};