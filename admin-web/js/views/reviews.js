import { api } from "../api.js";

export async function render() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="section">
      <div class="section-header">
        <h2>Reviews</h2>
        <p>Moderate customer reviews</p>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Product</th>
              <th>Rating</th>
              <th>Review</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="reviews-list">
            <li>Loading…</li>
          </tbody>
        </table>
      </div>
    </section>
  `;

  try {
    const reviews = await api.get("/api/admin/reviews/?status=pending");
    const list = document.getElementById("reviews-list");

    if (!reviews || reviews.length === 0) {
      list.innerHTML = `<li class="empty-state">No pending reviews.</li>`;
      return;
    }

    list.innerHTML = reviews.map((r) => `
      <li>
        <div class="item-name">${r.customer_name || "Customer"}</div>
        <div class="item-qty-price">${r.product_name || "Product"}</div>
        <div class="item-qty-price">${"★".repeat(r.rating || 0)}${"☆".repeat(5 - (r.rating || 0))}</div>
        <div class="item-qty-price">${r.comment || ""}</div>
        <div><span class="badge badge-pending">${r.status || "pending"}</span></div>
        <div>
          <button class="btn btn-success btn-sm" onclick="approveReview('${r.id}', this)">Approve</button>
          <button class="btn btn-danger btn-sm" onclick="hideReview('${r.id}', this)">Hide</button>
        </div>
      </li>
    `).join("");
  } catch (err) {
    document.getElementById("reviews-list").innerHTML =
      `<li class="error-text">Failed to load reviews.</li>`;
  }
}

window.approveReview = async function(id, btn) {
  try {
    await api.patch(`/api/admin/reviews/${id}`, { status: "approved" });
    btn.closest("li").remove();
  } catch (e) {
    alert("Failed: " + e.message);
  }
};

window.hideReview = async function(id, btn) {
  try {
    await api.patch(`/api/admin/reviews/${id}`, { status: "hidden" });
    btn.closest("li").remove();
  } catch (e) {
    alert("Failed: " + e.message);
  }
};