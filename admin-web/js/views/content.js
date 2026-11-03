import { api } from "../api.js";

export async function render({ id }) {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="section">
      <div class="section-header">
        <h2>Website Content</h2>
        <p>Edit website text content</p>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Key</th>
              <th>Value</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="content-list">
            <li>Loading…</li>
          </tbody>
        </table>
      </div>
    </section>
  `;

  try {
    const content = await api.get("/api/admin/content/");
    const list = document.getElementById("content-list");

    if (!content || content.length === 0) {
      list.innerHTML = `<li class="empty-state">No content items.</li>`;
      return;
    }

    list.innerHTML = content.map((c) => `
      <li>
        <div class="item-name"><code>${c.key || ""}</code></div>
        <div class="item-qty-price">${c.value || ""}</div>
        <div>
          <button class="btn btn-secondary btn-sm" onclick="editContent('${c.key || ""}', this)">Edit</button>
        </div>
      </li>
    `).join("");
  } catch (err) {
    document.getElementById("content-list").innerHTML =
      `<li class="error-text">Failed to load content.</li>`;
  }
}

window.editContent = async function(key, btn) {
  const newValue = prompt("New value for " + key + ":", btn.closest("li").querySelector("div:nth-child(2)").textContent);
  if (newValue !== null) {
    try {
      await api.patch(`/api/admin/content/${key}`, { value: newValue });
      alert("Updated");
      location.reload();
    } catch (e) {
      alert("Failed: " + e.message);
    }
  }
};