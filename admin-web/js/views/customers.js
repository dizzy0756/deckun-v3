import { api } from "../api.js";

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export async function render() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="section">
      <div class="section-header">
        <h2>Customers</h2>
        <p>Registered customer accounts</p>
      </div>

      <div style="display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap;align-items:center;">
        <input type="text" id="cust-search" class="form-control" placeholder="Search name, mobile or email…" style="max-width:320px;" />
        <span id="cust-count" style="color:var(--color-text-muted);font-size:0.875rem;"></span>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Mobile</th>
              <th>Email</th>
              <th>Joined</th>
              <th>Orders</th>
            </tr>
          </thead>
          <tbody id="customers-list">
            <tr><td colspan="5">Loading…</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `;

  const body = document.getElementById("customers-list");
  let customers = [];

  try {
    customers = await api.get("/api/admin/customers/");
  } catch (err) {
    body.innerHTML = `<tr><td colspan="5" class="error-text">Failed to load customers.</td></tr>`;
    return;
  }

  const paint = (list) => {
    document.getElementById("cust-count").textContent = `${list.length} customer${list.length === 1 ? "" : "s"}`;

    if (!list || list.length === 0) {
      body.innerHTML = `<tr><td colspan="5" class="empty-state">No customers found.</td></tr>`;
      return;
    }

    body.innerHTML = list.map((c) => `
      <tr>
        <td>
          <div style="font-weight:600;">${escapeHtml(c.full_name || "—")}</div>
        </td>
        <td>${escapeHtml(c.mobile_number || "—")}</td>
        <td>${escapeHtml(c.email || "—")}</td>
        <td>${fmtDate(c.created_at)}</td>
        <td>
          <a href="#orders?customer=${c.id}" class="btn btn-secondary btn-sm">View Orders</a>
        </td>
      </tr>
    `).join("");
  };

  paint(customers);

  document.getElementById("cust-search").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) return paint(customers);
    paint(customers.filter((c) =>
      [c.full_name, c.mobile_number, c.email].some((v) => String(v || "").toLowerCase().includes(q))
    ));
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}
