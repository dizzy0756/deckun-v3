import { api } from '../api.js';

export async function renderForgotPassword(app) {
  app.innerHTML = `
    <section class="section">
      <div class="container" style="max-width:420px;">
        <h1 style="font-family:var(--font-heading); font-size:2rem; margin-bottom:0.5rem; text-align:center;">Reset your password</h1>
        <p style="color:var(--color-text-muted); text-align:center; margin-bottom:2rem;">
          Enter your email or mobile number and we'll send a reset link.
        </p>
        <form id="forgot-form" style="display:flex; flex-direction:column; gap:1rem;">
          <div>
            <label style="display:block; margin-bottom:0.5rem; font-weight:500;">Email or mobile number</label>
            <input type="text" name="identifier" required
                   style="width:100%; padding:0.75rem; border:1px solid var(--color-border); border-radius:var(--radius); font-family:inherit;" />
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;">Send reset link</button>
          <div id="forgot-msg" style="font-size:0.875rem; min-height:1.1rem;"></div>
        </form>
        <p style="text-align:center; margin-top:1.5rem;">
          <a href="#login" style="color:var(--color-primary);">Back to sign in</a>
        </p>
      </div>
    </section>
  `;

  const form = document.getElementById('forgot-form');
  const msg = document.getElementById('forgot-msg');

  form.onsubmit = async (e) => {
    e.preventDefault();
    msg.style.color = 'var(--color-text-muted)';
    msg.textContent = 'Sending…';
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;

    const identifier = form.identifier.value.trim();
    const payload = identifier.includes('@')
      ? { email: identifier }
      : { mobile_number: identifier };

    try {
      await api.post('/auth/password-reset/request', payload);
      msg.style.color = 'var(--color-success)';
      msg.textContent = 'If an account exists, a reset link has been sent. Check your inbox.';
      form.reset();
    } catch (err) {
      msg.style.color = 'var(--color-error)';
      msg.textContent = err.message || 'Could not send reset link.';
    } finally {
      btn.disabled = false;
    }
  };
}
