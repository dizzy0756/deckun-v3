import { api, setToken } from '../api.js';

export async function renderRegister(app) {
  app.innerHTML = `
    <section class="section">
      <div class="container" style="max-width:420px;">
        <h1 style="font-family:var(--font-heading); font-size:2rem; margin-bottom:0.5rem; text-align:center;">Create Account</h1>
        <p style="color:var(--color-text-muted); text-align:center; margin-bottom:2rem;">Join Deckun for a better experience</p>
        <form id="register-form" style="display:flex; flex-direction:column; gap:1rem;">
          <div>
            <label style="display:block; margin-bottom:0.5rem; font-weight:500;">Full Name</label>
            <input type="text" name="full_name" required
                   style="width:100%; padding:0.75rem; border:1px solid var(--color-border); border-radius:var(--radius); font-family:inherit;" />
          </div>
          <div>
            <label style="display:block; margin-bottom:0.5rem; font-weight:500;">Mobile Number</label>
            <input type="tel" name="mobile_number" required autocomplete="username"
                   style="width:100%; padding:0.75rem; border:1px solid var(--color-border); border-radius:var(--radius); font-family:inherit;" />
          </div>
          <div>
            <label style="display:block; margin-bottom:0.5rem; font-weight:500;">Email (optional)</label>
            <input type="email" name="email"
                   style="width:100%; padding:0.75rem; border:1px solid var(--color-border); border-radius:var(--radius); font-family:inherit;" />
          </div>
          <div>
            <label style="display:block; margin-bottom:0.5rem; font-weight:500;">Password</label>
            <input type="password" name="password" required minlength="8" autocomplete="new-password"
                   style="width:100%; padding:0.75rem; border:1px solid var(--color-border); border-radius:var(--radius); font-family:inherit;" />
            <small style="color:var(--color-text-muted);">At least 8 characters</small>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;">Create Account</button>
          <div id="register-error" style="color:var(--color-error); font-size:0.875rem; min-height:1.1rem;"></div>
        </form>
        <p style="text-align:center; margin-top:1.5rem; color:var(--color-text-muted);">
          Already have an account?
          <a href="#login" style="color:var(--color-primary);">Login</a>
        </p>
      </div>
    </section>
  `;

  const form = document.getElementById('register-form');
  const errBox = document.getElementById('register-error');

  form.onsubmit = async (e) => {
    e.preventDefault();
    errBox.textContent = '';
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Creating…';

    try {
      const res = await api.post('/auth/register', {
        full_name: form.full_name.value.trim(),
        mobile_number: form.mobile_number.value.trim(),
        email: form.email.value.trim() || null,
        password: form.password.value,
      });
      setToken(res.access_token);

      const redirect = sessionStorage.getItem('post_login_redirect');
      sessionStorage.removeItem('post_login_redirect');
      window.location.hash = redirect || '#account';
    } catch (err) {
      errBox.textContent = err.message || 'Registration failed';
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  };
}
