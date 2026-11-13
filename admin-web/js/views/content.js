import { api } from "../api.js";

export async function render() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="section">
      <div class="section-header">
        <h2>Website Content</h2>
        <p>Edit storefront text and image content</p>
      </div>

      <div style="display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap;align-items:center;">
        <input type="text" id="content-search" class="form-control" placeholder="Search key or value…" style="max-width:300px;" />
        <button class="btn btn-primary" id="new-content-btn">+ New Content</button>
        <span id="content-count" style="color:var(--color-text-muted);font-size:0.875rem;"></span>
      </div>

      <div id="new-content-panel" class="card" style="display:none;">
        <div class="card-header">New Content Item</div>
        <form id="new-content-form">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <div class="form-group">
              <label>Key *</label>
              <input type="text" name="content_key" class="form-control" required placeholder="home.hero.title" />
            </div>
            <div class="form-group">
              <label>Type *</label>
              <select name="content_type" class="form-control" id="new-content-type">
                <option value="text">Text</option>
                <option value="image">Image</option>
              </select>
            </div>
          </div>
          <div class="form-group" id="new-text-group">
            <label>Text Value</label>
            <textarea name="text_value" rows="2" class="form-control"></textarea>
          </div>
          <div class="form-group" id="new-image-group" style="display:none;">
            <label>Image URL</label>
            <input type="url" name="image_url" class="form-control" placeholder="https://…" />
          </div>
          <div style="display:flex;gap:0.5rem;">
            <button type="submit" class="btn btn-primary">Create</button>
            <button type="button" class="btn btn-secondary" id="cancel-new-content">Cancel</button>
          </div>
          <div id="new-content-error" class="error-text" style="margin-top:0.5rem;"></div>
        </form>
      </div>

      <div id="content-list">
        <div class="loading">Loading…</div>
      </div>
    </section>
  `;

  const wrap = document.getElementById("content-list");
  const countEl = document.getElementById("content-count");
  let items = [];

  const paint = (list) => {
    countEl.textContent = `${list.length} item${list.length === 1 ? "" : "s"}`;
    if (!list || list.length === 0) {
      wrap.innerHTML = `<p class="empty-state">No content items.</p>`;
      return;
    }

    wrap.innerHTML = list.map((c) => {
      const isImage = c.content_type === "image" || (c.image_url && !c.text_value);
      return `
        <div class="card" data-key="${escapeHtml(c.content_key)}">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;margin-bottom:0.75rem;flex-wrap:wrap;">
            <code style="font-weight:600;">${escapeHtml(c.content_key)}</code>
            <div style="display:flex;gap:0.5rem;align-items:center;">
              <span class="badge ${c.is_active ? "badge-active" : "badge-inactive"}">
                ${c.is_active ? "Visible" : "Hidden"}
              </span>
              <button class="btn btn-danger btn-sm" data-action="delete">Delete</button>
            </div>
          </div>

          ${isImage ? `
            <div class="form-group">
              <label>Image URL</label>
              <input type="url" class="form-control" data-field="image_url" value="${escapeHtml(c.image_url || "")}" placeholder="https://…" />
            </div>
            ${c.image_url ? `<img src="${escapeHtml(c.image_url)}" alt="${escapeHtml(c.content_key)}" style="max-height:120px;border-radius:var(--radius);margin-bottom:0.75rem;" onerror="this.style.display='none'" />` : ""}
          ` : `
            <div class="form-group">
              <label>Text Value</label>
              <textarea class="form-control" data-field="text_value" rows="3">${escapeHtml(c.text_value || "")}</textarea>
            </div>
          `}

          <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
            <button class="btn btn-primary btn-sm" data-action="save">Save</button>
            <button class="btn btn-secondary btn-sm" data-action="toggle">
              ${c.is_active ? "Hide" : "Show"}
            </button>
          </div>
        </div>
      `;
    }).join("");

    wrap.querySelectorAll(".card").forEach((card) => {
      const key = card.dataset.key;
      const saveBtn = card.querySelector('[data-action="save"]');
      const toggleBtn = card.querySelector('[data-action="toggle"]');
      const deleteBtn = card.querySelector('[data-action="delete"]');

      saveBtn.addEventListener("click", async () => {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving…";
        const payload = {};
        card.querySelectorAll("[data-field]").forEach((el) => {
          payload[el.dataset.field] = el.value.trim() || null;
        });
        try {
          await api.patch(`/api/admin/content/${encodeURIComponent(key)}`, payload);
          saveBtn.textContent = "Saved ✓";
          setTimeout(() => { saveBtn.textContent = "Save"; }, 1500);
        } catch (e) {
          alert("Failed: " + e.message);
          saveBtn.textContent = "Save";
        } finally {
          saveBtn.disabled = false;
        }
      });

      toggleBtn.addEventListener("click", async () => {
        const hide = toggleBtn.textContent.trim() === "Hide";
        toggleBtn.disabled = true;
        try {
          const updated = await api.patch(`/api/admin/content/${encodeURIComponent(key)}`, { is_active: !hide });
          const badge = card.querySelector(".badge");
          badge.textContent = updated.is_active ? "Visible" : "Hidden";
          badge.className = updated.is_active ? "badge badge-active" : "badge badge-inactive";
          toggleBtn.textContent = updated.is_active ? "Hide" : "Show";
        } catch (e) {
          alert("Failed: " + e.message);
        } finally {
          toggleBtn.disabled = false;
        }
      });

      deleteBtn.addEventListener("click", async () => {
        if (!confirm(`Delete content "${key}"?`)) return;
        deleteBtn.disabled = true;
        try {
          await api.delete(`/api/admin/content/${encodeURIComponent(key)}`);
          items = items.filter((i) => i.content_key !== key);
          paint(items);
        } catch (e) {
          alert("Failed: " + e.message);
          deleteBtn.disabled = false;
        }
      });
    });
  };

  const load = async () => {
    wrap.innerHTML = `<div class="loading">Loading…</div>`;
    try {
      items = await api.get("/api/admin/content/");
      paint(items);
    } catch (err) {
      wrap.innerHTML = `<p class="error-text">Failed to load content.</p>`;
    }
  };

  document.getElementById("content-search").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) return paint(items);
    paint(items.filter((c) =>
      [c.content_key, c.text_value, c.image_url].some((v) => String(v || "").toLowerCase().includes(q))
    ));
  });

  /* ---- New content panel ---- */
  const panel = document.getElementById("new-content-panel");
  const newForm = document.getElementById("new-content-form");
  const typeSelect = document.getElementById("new-content-type");
  const textGroup = document.getElementById("new-text-group");
  const imageGroup = document.getElementById("new-image-group");
  const newError = document.getElementById("new-content-error");

  document.getElementById("new-content-btn").addEventListener("click", () => {
    panel.style.display = panel.style.display === "none" ? "block" : "none";
    newForm.reset();
    textGroup.style.display = "block";
    imageGroup.style.display = "none";
    newError.textContent = "";
  });

  document.getElementById("cancel-new-content").addEventListener("click", () => {
    panel.style.display = "none";
  });

  typeSelect.addEventListener("change", () => {
    const isImage = typeSelect.value === "image";
    textGroup.style.display = isImage ? "none" : "block";
    imageGroup.style.display = isImage ? "block" : "none";
  });

  newForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    newError.textContent = "";
    const isImage = typeSelect.value === "image";

    const payload = {
      content_key: newForm.content_key.value.trim(),
      content_type: typeSelect.value,
      text_value: isImage ? null : (newForm.text_value.value.trim() || null),
      image_url: isImage ? (newForm.image_url.value.trim() || null) : null,
      is_active: true,
    };

    const btn = newForm.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Creating…";
    try {
      await api.post("/api/admin/content/", payload);
      panel.style.display = "none";
      await load();
    } catch (err) {
      newError.textContent = "Failed: " + err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = "Create";
    }
  });

  load();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}
