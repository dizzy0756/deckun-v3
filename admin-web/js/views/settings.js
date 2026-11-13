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

  // Change Password section
  app.innerHTML += `
    <section class="section" style="margin-top:2rem;">
      <div class="section-header">
        <h2>Change Password</h2>
        <p>Change your account password</p>
      </div>
      <div style="max-width:400px;">
        <form id="change-password-form">
          <div class="form-group" style="margin-bottom:1rem;">
            <label>Current Password</label>
            <input type="password" id="current-password" class="form-control" required />
          </div>
          <div class="form-group" style="margin-bottom:1rem;">
            <label>New Password</label>
            <input type="password" id="new-password" class="form-control" required />
          </div>
          <div class="form-group" style="margin-bottom:1rem;">
            <label>Confirm New Password</label>
            <input type="password" id="confirm-password" class="form-control" required />
          </div>
          <button type="submit" class="btn btn-primary">Change Password</button>
        </form>
      </div>
    </section>
  `;

  document.getElementById("change-password-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Changing...";

    try {
      await api.post("/api/admin/auth/change-password", {
        current_password: form.current_password.value,
        new_password: form.new_password.value,
      });
      alert("Password changed successfully");
      form.reset();
    } catch (err) {
      alert("Failed: " + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "Change Password";
    }
  });
}