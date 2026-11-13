import { api } from "../api.js";

const FILTERS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "hidden", label: "Hidden" },
  { key: "all", label: "All" },
];

const stars = (rating) => {
  const n = Math.max(0, Math.min(5, Number(rating) || 0));
  return "★".repeat(n) + "☆".repeat(5 - n);
};

export async function render() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="section">
      <div class="section-header">
        <h2>Reviews</h2>
        <p>Moderate customer product reviews</p>
      </div>

      <div class="filter-bar" id="review-filters">
        ${FILTERS.map((f, i) => `
          <button class="filter-chip ${i === 0 ? "active" : ""}" data-status="${f.key}">${f.label}</button>
        `).join("")}
      </div>

      <div id="reviews-list">
        <div class="loading">Loading…</div>
      </div>
    </section>
  `;

  const wrap = document.getElementById("reviews-list");
  let currentStatus = "pending";

  const load = async () => {
    wrap.innerHTML = `<div class="loading">Loading…</div>`;
    try {
      const url = currentStatus === "all"
        ? "/api/admin/reviews/"
        : `/api/admin/reviews/?status=${currentStatus}`;
      const reviews = await api.get(url);

      if (!reviews || reviews.length === 0) {
        wrap.innerHTML = `<p class="empty-state">No ${currentStatus === "all" ? "" : currentStatus + " "}reviews.</p>`;
        return;
      }

      wrap.innerHTML = reviews.map((r) => `
        <div class="card" data-review="${r.id}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.75rem;flex-wrap:wrap;">
            <div>
              <div style="font-weight:600;">${escapeHtml(r.user_full_name || "Customer")}</div>
              <div style="font-size:0.8rem;color:var(--color-text-muted);">
                on ${escapeHtml(r.product_name || "Product")}
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <span style="color:#f59e0b;letter-spacing:1px;">${stars(r.rating)}</span>
              <span class="badge badge-${r.status === "approved" ? "active" : r.status === "hidden" ? "inactive" : "pending"}">
                ${escapeHtml(r.status)}
              </span>
            </div>
          </div>

          ${r.title ? `<div style="font-weight:600;margin-top:0.75rem;">${escapeHtml(r.title)}</div>` : ""}
          <p style="color:var(--color-text-secondary);margin-top:0.5rem;">${escapeHtml(r.comment || "")}</p>

          <div style="display:flex;gap:0.5rem;margin-top:0.75rem;flex-wrap:wrap;">
            ${r.status !== "approved" ? `<button class="btn btn-primary btn-sm" data-action="approve">Approve</button>` : ""}
            ${r.status !== "hidden" ? `<button class="btn btn-secondary btn-sm" data-action="hide">Hide</button>` : ""}
            ${r.status !== "pending" ? `<button class="btn btn-secondary btn-sm" data-action="pending">Back to Pending</button>` : ""}
          </div>
        </div>
      `).join("");

      wrap.querySelectorAll("[data-review]").forEach((card) => {
        const id = card.dataset.review;
        card.querySelectorAll("[data-action]").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const statusMap = { approve: "approved", hide: "hidden", pending: "pending" };
            const newStatus = statusMap[btn.dataset.action];
            btn.disabled = true;
            try {
              await api.patch(`/api/admin/reviews/${id}`, { status: newStatus });
              card.remove();
              if (!wrap.querySelector("[data-review]")) {
                wrap.innerHTML = `<p class="empty-state">No ${currentStatus === "all" ? "" : currentStatus + " "}reviews.</p>`;
              }
            } catch (e) {
              alert("Failed: " + e.message);
              btn.disabled = false;
            }
          });
        });
      });
    } catch (err) {
      wrap.innerHTML = `<p class="error-text">Failed to load reviews.</p>`;
    }
  };

  document.getElementById("review-filters").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-status]");
    if (!chip) return;
    currentStatus = chip.dataset.status;
    document.querySelectorAll("#review-filters .filter-chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    load();
  });

  load();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}
