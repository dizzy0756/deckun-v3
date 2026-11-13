import { api } from "../api.js";

const fmtDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const fmtDiscount = (p) => {
  const v = Number(p.discount_value || 0);
  return p.discount_type === "percent" ? `${v}%` : `₹${v}`;
};

const isLive = (p) => {
  const now = new Date();
  return p.is_active && new Date(p.starts_at) <= now && new Date(p.ends_at) >= now;
};

export async function render({ id }) {
  if (id === "new" || (id && id !== undefined)) {
    await renderPromoForm(id === "new" ? null : id);
  } else {
    await renderPromoList();
  }
}

async function renderPromoList() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="section">
      <div class="section-header">
        <h2>Promotions</h2>
        <p>Discount codes and campaigns</p>
      </div>
      <div class="section-actions" style="margin-bottom:1rem;">
        <a href="#promotions/new" class="btn btn-primary">+ New Promotion</a>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Discount</th>
              <th>Window</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="promotions-list">
            <tr><td colspan="6">Loading…</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `;

  const body = document.getElementById("promotions-list");
  try {
    const promotions = await api.get("/api/admin/promotions/");
    if (!promotions || promotions.length === 0) {
      body.innerHTML = `<tr><td colspan="6" class="empty-state">No promotions yet.</td></tr>`;
      return;
    }
    body.innerHTML = promotions.map((p) => `
      <tr>
        <td><code>${escapeHtml(p.code || "—")}</code></td>
        <td>${escapeHtml(p.name)}</td>
        <td>${fmtDiscount(p)}</td>
        <td style="font-size:0.8rem;">${fmtDate(p.starts_at)} → ${fmtDate(p.ends_at)}</td>
        <td>
          <span class="badge ${isLive(p) ? "badge-active" : "badge-inactive"}">
            ${isLive(p) ? "Live" : p.is_active ? "Scheduled/Expired" : "Inactive"}
          </span>
        </td>
        <td style="white-space:nowrap;">
          <a href="#promotions/${p.id}" class="btn btn-secondary btn-sm">Edit</a>
          <button class="btn btn-danger btn-sm" onclick="deletePromo('${p.id}', this)">Delete</button>
        </td>
      </tr>
    `).join("");
  } catch (err) {
    body.innerHTML = `<tr><td colspan="6" class="error-text">Failed to load promotions.</td></tr>`;
  }
}

async function renderPromoForm(promoId) {
  const isNew = !promoId;
  const app = document.getElementById("app");

  let promo = null;
  if (!isNew) {
    app.innerHTML = `<div class="loading">Loading promotion…</div>`;
    try {
      promo = await api.get(`/api/admin/promotions/${promoId}`);
    } catch (e) {
      app.innerHTML = `<div class="error-text">Promotion not found.</div><a href="#promotions" class="btn btn-secondary">Back</a>`;
      return;
    }
  }

  const toLocalInput = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  app.innerHTML = `
    <section class="section">
      <div class="detail-header">
        <a href="#promotions" class="back-link">&#8592; Back to Promotions</a>
      </div>
      <div class="section-header">
        <h2>${isNew ? "New Promotion" : "Edit Promotion"}</h2>
      </div>
      <form id="promo-form" style="max-width:700px;">
        <div class="form-group">
          <label>Code (optional)</label>
          <input type="text" name="code" class="form-control" value="${escapeHtml(promo?.code || "")}" placeholder="SAVE10" />
        </div>
        <div class="form-group">
          <label>Name *</label>
          <input type="text" name="name" class="form-control" required value="${escapeHtml(promo?.name || "")}" />
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea name="description" rows="2" class="form-control">${escapeHtml(promo?.description || "")}</textarea>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
          <div class="form-group">
            <label>Discount Type *</label>
            <select name="discount_type" class="form-control">
              <option value="percent" ${promo?.discount_type === "percent" || !promo ? "selected" : ""}>Percent (%)</option>
              <option value="fixed" ${promo?.discount_type === "fixed" ? "selected" : ""}>Fixed (₹)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Discount Value *</label>
            <input type="number" step="0.01" min="0" name="discount_value" class="form-control" required value="${promo ? promo.discount_value : ""}" />
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
          <div class="form-group">
            <label>Starts At *</label>
            <input type="datetime-local" name="starts_at" class="form-control" required value="${toLocalInput(promo?.starts_at)}" />
          </div>
          <div class="form-group">
            <label>Ends At *</label>
            <input type="datetime-local" name="ends_at" class="form-control" required value="${toLocalInput(promo?.ends_at)}" />
          </div>
        </div>
        <div class="form-group">
          <label>Active</label>
          <select name="is_active" class="form-control">
            <option value="false" ${promo && !promo.is_active ? "selected" : ""}>No</option>
            <option value="true" ${promo?.is_active ? "selected" : ""}>Yes</option>
          </select>
        </div>
        <div class="form-group">
          <label>Applied Products (optional)</label>
          <div id="promo-products" style="max-height:200px;overflow:auto;border:1px solid var(--color-border);border-radius:var(--radius);padding:0.5rem;">
            <p style="color:var(--color-text-muted);font-size:0.875rem;">Loading products…</p>
          </div>
          <small style="color:var(--color-text-muted);">Leave all unchecked to apply to all products.</small>
        </div>
        <div style="display:flex;gap:0.5rem;margin-top:1.5rem;">
          <button type="submit" class="btn btn-primary">${isNew ? "Create Promotion" : "Save Changes"}</button>
          <a href="#promotions" class="btn btn-secondary">Cancel</a>
        </div>
      </form>
    </section>
  `;

  // Load products for the multi-select
  const selected = new Set((promo?.product_ids || []).map(String));
  try {
    const products = await api.get("/api/admin/products/?limit=200");
    const box = document.getElementById("promo-products");
    if (!products || products.length === 0) {
      box.innerHTML = `<p style="color:var(--color-text-muted);font-size:0.875rem;">No products.</p>`;
    } else {
      box.innerHTML = products.map((p) => `
        <label style="display:flex;align-items:center;gap:0.5rem;padding:0.25rem 0;font-size:0.875rem;">
          <input type="checkbox" name="product_ids" value="${p.id}" ${selected.has(String(p.id)) ? "checked" : ""} />
          <span>${escapeHtml(p.name)}</span>
        </label>
      `).join("");
    }
  } catch (e) {
    document.getElementById("promo-products").innerHTML =
      `<p class="error-text" style="font-size:0.875rem;">Failed to load products.</p>`;
  }

  const form = document.getElementById("promo-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = isNew ? "Creating…" : "Saving…";

    const productIds = Array.from(form.querySelectorAll('input[name="product_ids"]:checked'))
      .map((el) => el.value);

    const payload = {
      code: form.code.value.trim() || null,
      name: form.name.value.trim(),
      description: form.description.value.trim() || null,
      discount_type: form.discount_type.value,
      discount_value: parseFloat(form.discount_value.value) || 0,
      starts_at: new Date(form.starts_at.value).toISOString(),
      ends_at: new Date(form.ends_at.value).toISOString(),
      is_active: form.is_active.value === "true",
      product_ids: productIds,
    };

    try {
      if (isNew) {
        await api.post("/api/admin/promotions/", payload);
        alert("Promotion created");
      } else {
        await api.patch(`/api/admin/promotions/${promoId}`, payload);
        alert("Promotion updated");
      }
      window.location.hash = "#promotions";
    } catch (err) {
      alert("Failed: " + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = isNew ? "Create Promotion" : "Save Changes";
    }
  });
}

window.deletePromo = async function (id, btn) {
  if (!confirm("Deactivate this promotion?")) return;
  try {
    await api.delete(`/api/admin/promotions/${id}`);
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
