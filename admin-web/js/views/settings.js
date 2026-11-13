import { api } from "../api.js";

export async function render() {
  const app = document.getElementById("app");

  app.innerHTML = `
    <section class="section">
      <div class="section-header">
        <h2>Settings</h2>
        <p>Store configuration</p>
      </div>
      <div id="settings-form" style="max-width:600px;">
        <div class="loading">Loading…</div>
      </div>
    </section>

    <section class="section" style="border-top:1px solid var(--color-border);">
      <div class="section-header">
        <h2>Change Password</h2>
        <p>Update your admin account password</p>
      </div>
      <form id="change-password-form" style="max-width:400px;">
        <div class="form-group">
          <label>Current Password *</label>
          <input type="password" name="current_password" class="form-control" required autocomplete="current-password" />
        </div>
        <div class="form-group">
          <label>New Password *</label>
          <input type="password" name="new_password" class="form-control" required minlength="6" autocomplete="new-password" />
        </div>
        <div class="form-group">
          <label>Confirm New Password *</label>
          <input type="password" name="confirm_password" class="form-control" required minlength="6" autocomplete="new-password" />
        </div>
        <button type="submit" class="btn btn-primary">Change Password</button>
      </form>
    </section>
  `;

  /* ---------- Store settings ---------- */
  const box = document.getElementById("settings-form");
  try {
    const settings = await api.get("/api/admin/settings/");

    if (!settings || settings.length === 0) {
      box.innerHTML = `<p class="empty-state">No settings configured.</p>`;
    } else {
      box.innerHTML = `
        <form id="settings-inner">
          ${settings.map((s) => `
            <div class="form-group">
              <label>
                ${escapeHtml(s.setting_key)}
                ${s.description ? `<small style="display:block;font-weight:400;color:var(--color-text-muted);">${escapeHtml(s.description)}</small>` : ""}
              </label>
              <input type="text" class="form-control" data-key="${escapeHtml(s.setting_key)}" value="${escapeHtml(s.setting_value)}" />
              <small style="color:var(--color-text-muted);font-size:0.75rem;">type: ${escapeHtml(s.data_type || "string")}</small>
            </div>
          `).join("")}
          <button type="submit" class="btn btn-primary" style="margin-top:0.5rem;">Save Settings</button>
        </form>
      `;

      document.getElementById("settings-inner").addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector("button[type=submit]");
        btn.disabled = true;
        btn.textContent = "Saving…";
        const inputs = e.target.querySelectorAll("input[data-key]");
        const failures = [];
        for (const input of inputs) {
          try {
            await api.patch(`/api/admin/settings/${encodeURIComponent(input.dataset.key)}`, {
              setting_value: input.value,
            });
          } catch (err) {
            failures.push(input.dataset.key);
          }
        }
        btn.disabled = false;
        btn.textContent = "Save Settings";
        if (failures.length) {
          alert("Could not save: " + failures.join(", "));
        } else {
          alert("Settings saved");
        }
      });
    }
  } catch (err) {
    box.innerHTML = `<p class="error-text">Failed to load settings.</p>`;
  }

  /* ---------- Change password ---------- */
  const pwForm = document.getElementById("change-password-form");
  pwForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = pwForm.querySelector("button[type=submit]");

    if (pwForm.new_password.value !== pwForm.confirm_password.value) {
      alert("New passwords do not match");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Changing…";
    try {
      await api.post("/api/auth/admin/change-password", {
        current_password: pwForm.current_password.value,
        new_password: pwForm.new_password.value,
      });
      alert("Password changed successfully");
      pwForm.reset();
    } catch (err) {
      alert("Failed: " + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "Change Password";
    }
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}
