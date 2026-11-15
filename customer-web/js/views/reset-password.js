import { api } from '../api.js';

function readToken() {
  const query = (window.location.hash.split('?')[1] || '');
  return new URLSearchParams(query).get('token') || '';
}

export async function renderResetPassword(app) {
  const token = readToken();

  app.innerHTML = `
    <section class="section">
      <div class="container" style="max-width:420px;">
        <h1 style="font-family:var(--font-heading); font-size:2rem; margin-bottom:0.5rem; text-align:center;">Choose a new password</h1>
        <p style="color:var(--color-text-muted); text-align:center; margin-bottom:2rem;">
          Your reset link contains a one-time code. It expires in 15 minutes.
        </p>
        <form id="reset-form" style="display:flex; flex-direction:column; gap:1rem;">
          <div>
            <label style="display:block; margin-bottom:0.5rem; font-weight:500;">Reset code</label>
            <input type="text" name="token" required value="${token}"
                   style="width:100%; padding:0.75rem; border:1px solid var(--color-border); border-radius:var(--radius); font-family:inherit;" />
          </div>
          <div>
            <label style="display:block; margin-bottom:0.5rem; font-weight:500;">New password</label>
            <input type="password" name="password" required minlength="8" autocomplete="new-password"
                   style="width:100%; padding:0.75rem; border:1px solid var(--color-border); border-radius:var(--radius); font-family:inherit;" />
            <small style="color:var(--color-text-muted);">At least 8 characters</small>
          </div>
          <div>
            <label style="display:block; margin-bottom:0.5rem; font-weight:500;">Confirm new password</label>
            <input type="password" name="confirm" required minlength="8" autocomplete="new-password"
                   style="width:100%; padding:0.75rem; border:1px solid var(--color-border); border-radius:var(--radius); font-family:inherit;" />
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;">Update password</button>
          <div id="reset-msg" style="font-size:0.875rem; min-height:1.1rem;"></div>
        </form>
        <p style="text-align:center; margin-top:1.5rem;">
          <a href="#login" style="color:var(--color-primary);">Back to sign in</a>
        </p>
      </div>
    </section>
  `;

  const form = document.getElementById('reset-form');
  const msg = document.getElementById('reset-msg');

  form.onsubmit = async (e) => {
    e.preventDefault();
    msg.textContent = '';

    if (form.password.value !== form.confirm.value) {
      msg.style.color = 'var(--color-error)';
      msg.textContent = 'Passwords do not match.';
      return;
    }

    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Updating…';

    try {
      await api.post('/auth/password-reset/confirm', {
        token: form.token.value.trim(),
        new_password: form.password.value,
      });
      msg.style.color = 'var(--color-success)';
      msg.textContent = 'Password updated. Redirecting to sign in…';
      setTimeout(() => { window.location.hash = '#login'; }, 1200);
    } catch (err) {
      msg.style.color = 'var(--color-error)';
      msg.textContent = err.message || 'Could not reset password.';
      btn.disabled = false;
      btn.textContent = 'Update password';
    }
  };
}
