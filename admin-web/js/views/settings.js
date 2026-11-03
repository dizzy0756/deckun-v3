import { api } from "../api.js";

export async function render() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="section">
      <div class="section-header">
        <h2>Settings</h2>
        <p>Configure system settings</p>
      </div>

      <div style="max-width:500px;">
        <form id="settings-form"></div>
      </div>
    </section>
  `;

  try {
    const settings = await api.get("/api/admin/settings/");
    const form = document.getElementById("settings-form");

    if (!settings || settings.length === 0) {
      form.innerHTML = `<li class="empty-state">No settings.</li>`;
      return;
    }

    form.innerHTML = settings.map((s) => `
      <div class="form-group" style="margin-bottom:1.5rem;">
        <label>${s.key || "Setting"}</label>
        <input type="text" id="setting-${s.key || ""}" value="${s.value || ""}" class="form-control" />
      </div>
    `).join("") + `<button type="submit" class="btn btn-primary" style="margin-top:1rem;">Save Changes</button>`;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const inputs = form.querySelectorAll("input");
      try {
        for (const input of inputs) {
          await api.patch(`/api/admin/settings/${input.id.replace("setting-", "")}`, { value: input.value });
        }
        alert("Settings saved");
      } catch (err) {
        alert("Failed: " + err.message);
      }
    });
  } catch (err) {
    document.getElementById("settings-form").innerHTML =
      `<li class="error-text">Failed to load settings.</li>`;
  }
}