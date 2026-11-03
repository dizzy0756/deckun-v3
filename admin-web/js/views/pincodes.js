import { api } from "../api.js";

export async function render() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="section">
      <div class="section-header">
        <h2>PIN Codes</h2>
        <p>Manage serviceable pincodes</p>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Pincode</th>
              <th>City</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="pincodes-list">
            <li>Loading…</li>
          </tbody>
        </table>
      </div>
    </section>
  `;

  try {
    const pincodes = await api.get("/api/admin/pincodes/");
    const list = document.getElementById("pincodes-list");

    if (!pincodes || pincodes.length === 0) {
      list.innerHTML = `<li class="empty-state">No pincodes.</li>`;
      return;
    }

    list.innerHTML = pincodes.map((p) => `
      <li>
        <div class="item-name">${p.code || p.pincode || "-"}</div>
        <div class="item-qty-price">${p.city || "-"}</div>
        <div><span class="badge ${p.is_active !== false ? "badge-active" : "badge-inactive"}">${p.is_active !== false ? "Active" : "Inactive"}</span></div>
        <div>
          <button class="btn btn-secondary btn-sm" onclick="togglePincode('${p.id || p.code || p.pincode}', this)">
            ${p.is_active !== false ? "Deactivate" : "Activate"}
          </button>
        </div>
      </li>
    `).join("");
  } catch (err) {
    document.getElementById("pincodes-list").innerHTML =
      `<li class="error-text">Failed to load pincodes.</li>`;
  }
}

window.togglePincode = async function(id, btn) {
  const current = btn.textContent === "Deactivate";
  try {
    await api.patch(`/api/admin/pincodes/${id}`, { is_active: !current });
    btn.textContent = current ? "Activate" : "Deactivate";
    btn.closest("li").querySelector(".badge").textContent = current ? "Inactive" : "Active";
    btn.closest("li").querySelector(".badge").className = current ? "badge-inactive" : "badge-active";
  } catch (e) {
    alert("Failed: " + e.message);
  }
};