import { api } from "../api.js";

const rupee = (amt) => {
  if (amt == null) return "₹0.00";
  return "₹" + Number(amt).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export async function render() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="section">
      <div class="section-header">
        <h2>Inventory</h2>
        <p>Track and adjust variant stock</p>
      </div>

      <div style="display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap;align-items:center;">
        <button class="filter-chip active" id="filter-all">All</button>
        <button class="filter-chip" id="filter-low">Low Stock Only</button>
        <input type="text" id="inv-search" class="form-control" placeholder="Search product or SKU…" style="max-width:280px;" />
        <span id="inv-count" style="color:var(--color-text-muted);font-size:0.875rem;"></span>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Product / Variant</th>
              <th>SKU</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="inventory-list">
            <tr><td colspan="6">Loading…</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `;

  const body = document.getElementById("inventory-list");
  let items = [];
  let lowOnly = false;

  const load = async () => {
    body.innerHTML = `<tr><td colspan="6">Loading…</td></tr>`;
    try {
      items = await api.get(`/api/admin/inventory/?low_stock_only=${lowOnly}`);
      paint();
    } catch (err) {
      body.innerHTML = `<tr><td colspan="6" class="error-text">Failed to load inventory.</td></tr>`;
    }
  };

  const paint = () => {
    const q = (document.getElementById("inv-search").value || "").trim().toLowerCase();
    const list = q
      ? items.filter((i) =>
          [i.product_name, i.variant_name, i.sku].some((v) => String(v || "").toLowerCase().includes(q))
        )
      : items;

    document.getElementById("inv-count").textContent = `${list.length} variant${list.length === 1 ? "" : "s"}`;

    if (!list || list.length === 0) {
      body.innerHTML = `<tr><td colspan="6" class="empty-state">No inventory items.</td></tr>`;
      return;
    }

    body.innerHTML = list.map((item) => {
      const low = item.stock <= 3;
      return `
        <tr data-variant="${item.variant_id}">
          <td>
            <div style="font-weight:600;">${escapeHtml(item.product_name || "Product")}</div>
            ${item.variant_name ? `<div style="font-size:0.75rem;color:var(--color-text-muted);">${escapeHtml(item.variant_name)}</div>` : ""}
          </td>
          <td><code style="font-size:0.75rem;">${escapeHtml(item.sku || "—")}</code></td>
          <td>${rupee(item.price)}</td>
          <td>
            <input type="number" min="0" class="form-control" data-stock value="${item.stock || 0}" style="width:90px;" />
          </td>
          <td>
            <span class="badge ${low ? "badge-preparing" : "badge-active"}">
              ${item.stock === 0 ? "Out of Stock" : low ? "Low" : "OK"}
            </span>
          </td>
          <td>
            <button class="btn btn-primary btn-sm" data-save>Update</button>
          </td>
        </tr>
      `;
    }).join("");

    body.querySelectorAll("tr[data-variant]").forEach((row) => {
      const variantId = row.dataset.variant;
      const btn = row.querySelector("[data-save]");
      const input = row.querySelector("[data-stock]");

      btn.addEventListener("click", async () => {
        const qty = parseInt(input.value, 10);
        if (isNaN(qty) || qty < 0) {
          alert("Enter a valid stock quantity");
          return;
        }
        btn.disabled = true;
        btn.textContent = "…";
        try {
          await api.patch(`/api/admin/inventory/variants/${variantId}/stock`, { stock: qty });
          btn.textContent = "Saved ✓";
          const badge = row.querySelector(".badge");
          const low = qty <= 3;
          badge.textContent = qty === 0 ? "Out of Stock" : low ? "Low" : "OK";
          badge.className = low ? "badge badge-preparing" : "badge badge-active";
          const item = items.find((i) => String(i.variant_id) === String(variantId));
          if (item) item.stock = qty;
          setTimeout(() => { btn.textContent = "Update"; }, 1500);
        } catch (e) {
          alert("Failed: " + e.message);
          btn.textContent = "Update";
        } finally {
          btn.disabled = false;
        }
      });
    });
  };

  document.getElementById("inv-search").addEventListener("input", paint);

  document.getElementById("filter-all").addEventListener("click", (e) => {
    lowOnly = false;
    e.target.classList.add("active");
    document.getElementById("filter-low").classList.remove("active");
    load();
  });

  document.getElementById("filter-low").addEventListener("click", (e) => {
    lowOnly = true;
    e.target.classList.add("active");
    document.getElementById("filter-all").classList.remove("active");
    load();
  });

  load();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}
