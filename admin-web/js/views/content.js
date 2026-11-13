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
        <input type="text" id="content-search" class="form-control" placeholder="Search key or value…" style="max-width:320px;" />
        <span id="content-count" style="color:var(--color-text-muted);font-size:0.875rem;"></span>
      </div>

      <div id="content-list">
        <div class="loading">Loading…</div>
      </div>
    </section>
  `;

  const wrap = document.getElementById("content-list");
  let items = [];
  try {
    items = await api.get("/api/admin/content/");
  } catch (err) {
    wrap.innerHTML = `<p class="error-text">Failed to load content.</p>`;
    return;
  }

  const paint = (list) => {
    document.getElementById("content-count").textContent = `${list.length} item${list.length === 1 ? "" : "s"}`;
    if (!list || list.length === 0) {
      wrap.innerHTML = `<p class="empty-state">No content items.</p>`;
      return;
    }

    wrap.innerHTML = list.map((c) => {
      const isImage = c.content_type === "image" || (c.image_url && !c.text_value);
      return `
        <div class="card" data-key="${escapeHtml(c.content_key)}">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;margin-bottom:0.75rem;">
            <code style="font-weight:600;">${escapeHtml(c.content_key)}</code>
            <span class="badge ${c.is_active ? "badge-active" : "badge-inactive"}">
              ${c.is_active ? "Visible" : "Hidden"}
            </span>
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

    // Wire up actions
    wrap.querySelectorAll(".card").forEach((card) => {
      const key = card.dataset.key;
      const saveBtn = card.querySelector('[data-action="save"]');
      const toggleBtn = card.querySelector('[data-action="toggle"]');

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
    });
  };

  paint(items);

  document.getElementById("content-search").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) return paint(items);
    paint(items.filter((c) =>
      [c.content_key, c.text_value, c.image_url].some((v) => String(v || "").toLowerCase().includes(q))
    ));
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}
