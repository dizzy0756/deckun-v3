import { api } from "../api.js";

export async function render({ id }) {
  if (id === "new") {
    await renderPincodeForm(null);
  } else if (id) {
    await renderPincodeForm(id);
  } else {
    await renderPincodeList();
  }
}

async function renderPincodeList() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="section">
      <div class="section-header">
        <h2>PIN Codes</h2>
        <p>Manage serviceable delivery pincodes</p>
      </div>

      <div style="display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap;align-items:center;">
        <input type="text" id="pincode-search" class="form-control" placeholder="Search pincode, city or state…" style="max-width:320px;" />
        <a href="#pincodes/new" class="btn btn-primary">+ Add PIN Code</a>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Pincode</th>
              <th>City</th>
              <th>State</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="pincodes-list">
            <tr><td colspan="5">Loading…</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `;

  const body = document.getElementById("pincodes-list");
  let pincodes = [];
  try {
    pincodes = await api.get("/api/admin/pincodes/");
  } catch (err) {
    body.innerHTML = `<tr><td colspan="5" class="error-text">Failed to load pincodes.</td></tr>`;
    return;
  }

  const paint = (list) => {
    if (!list || list.length === 0) {
      body.innerHTML = `<tr><td colspan="5" class="empty-state">No pincodes found.</td></tr>`;
      return;
    }
    body.innerHTML = list.map((p) => `
      <tr>
        <td><strong>${escapeHtml(p.pincode)}</strong></td>
        <td>${escapeHtml(p.city)}</td>
        <td>${escapeHtml(p.state)}</td>
        <td>
          <span class="badge ${p.is_active ? "badge-active" : "badge-inactive"}">
            ${p.is_active ? "Active" : "Inactive"}
          </span>
        </td>
        <td style="white-space:nowrap;">
          <a href="#pincodes/${p.id}" class="btn btn-secondary btn-sm">Edit</a>
          <button class="btn btn-secondary btn-sm" onclick="togglePincode(${p.id}, this)">
            ${p.is_active ? "Deactivate" : "Activate"}
          </button>
          <button class="btn btn-danger btn-sm" onclick="deletePincode(${p.id}, this)">Delete</button>
        </td>
      </tr>
    `).join("");
  };

  paint(pincodes);

  document.getElementById("pincode-search").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) return paint(pincodes);
    paint(pincodes.filter((p) =>
      [p.pincode, p.city, p.state].some((v) => String(v || "").toLowerCase().includes(q))
    ));
  });
}

async function renderPincodeForm(pincodeId) {
  const isNew = !pincodeId;
  const app = document.getElementById("app");

  let pin = null;
  if (!isNew) {
    app.innerHTML = `<div class="loading">Loading pincode…</div>`;
    try {
      const all = await api.get("/api/admin/pincodes/");
      pin = (all || []).find((p) => String(p.id) === String(pincodeId));
      if (!pin) throw new Error("Not found");
    } catch (e) {
      app.innerHTML = `<div class="error-text">Pincode not found.</div><a href="#pincodes" class="btn btn-secondary">Back</a>`;
      return;
    }
  }

  app.innerHTML = `
    <section class="section">
      <div class="detail-header">
        <a href="#pincodes" class="back-link">&#8592; Back to PIN Codes</a>
      </div>
      <div class="section-header">
        <h2>${isNew ? "Add PIN Code" : "Edit PIN Code"}</h2>
      </div>
      <form id="pincode-form" style="max-width:500px;">
        <div class="form-group">
          <label>Pincode *</label>
          <input type="text" name="pincode" class="form-control" required value="${escapeHtml(pin?.pincode || "")}" placeholder="781001" />
        </div>
        <div class="form-group">
          <label>City *</label>
          <input type="text" name="city" class="form-control" required value="${escapeHtml(pin?.city || "")}" />
        </div>
        <div class="form-group">
          <label>State *</label>
          <input type="text" name="state" class="form-control" required value="${escapeHtml(pin?.state || "")}" />
        </div>
        <div class="form-group">
          <label>Status</label>
          <select name="is_active" class="form-control">
            <option value="true" ${!pin || pin.is_active ? "selected" : ""}>Active</option>
            <option value="false" ${pin && !pin.is_active ? "selected" : ""}>Inactive</option>
          </select>
        </div>
        <div style="display:flex;gap:0.5rem;margin-top:1.5rem;">
          <button type="submit" class="btn btn-primary">${isNew ? "Add PIN Code" : "Save Changes"}</button>
          <a href="#pincodes" class="btn btn-secondary">Cancel</a>
        </div>
      </form>
    </section>
  `;

  const form = document.getElementById("pincode-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = isNew ? "Adding…" : "Saving…";

    const payload = {
      pincode: form.pincode.value.trim(),
      city: form.city.value.trim(),
      state: form.state.value.trim(),
      is_active: form.is_active.value === "true",
    };

    try {
      if (isNew) {
        await api.post("/api/admin/pincodes/", payload);
        alert("PIN code added");
      } else {
        await api.patch(`/api/admin/pincodes/${pincodeId}`, payload);
        alert("PIN code updated");
      }
      window.location.hash = "#pincodes";
    } catch (err) {
      alert("Failed: " + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = isNew ? "Add PIN Code" : "Save Changes";
    }
  });
}

window.togglePincode = async function (id, btn) {
  const deactivating = btn.textContent.trim() === "Deactivate";
  try {
    await api.patch(`/api/admin/pincodes/${id}`, { is_active: !deactivating });
    btn.textContent = deactivating ? "Activate" : "Deactivate";
    const badge = btn.closest("tr").querySelector(".badge");
    badge.textContent = deactivating ? "Inactive" : "Active";
    badge.className = deactivating ? "badge badge-inactive" : "badge badge-active";
  } catch (e) {
    alert("Failed: " + e.message);
  }
};

window.deletePincode = async function (id, btn) {
  if (!confirm("Delete this pincode?")) return;
  try {
    await api.delete(`/api/admin/pincodes/${id}`);
    const row = btn.closest("tr");
    if (row) row.remove();
  } catch (e) {
    alert("Failed: " + e.message);
  }
};

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}
