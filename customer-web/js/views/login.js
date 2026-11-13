import { api, setToken } from '../api.js';

export async function renderLogin(app) {
  app.innerHTML = `
    <section class="section">
      <div class="container" style="max-width:400px;">
        <h1 style="font-family:var(--font-heading); font-size:2rem; margin-bottom:0.5rem; text-align:center;">Login</h1>
        <p style="color:var(--color-text-muted); text-align:center; margin-bottom:2rem;">Welcome back to Deckun</p>
        <form id="login-form" style="display:flex; flex-direction:column; gap:1rem;">
          <div>
            <label style="display:block; margin-bottom:0.5rem; font-weight:500;">Mobile Number</label>
            <input type="tel" name="mobile_number" required autocomplete="username"
                   style="width:100%; padding:0.75rem; border:1px solid var(--color-border); border-radius:var(--radius); font-family:inherit;" />
          </div>
          <div>
            <label style="display:block; margin-bottom:0.5rem; font-weight:500;">Password</label>
            <input type="password" name="password" required autocomplete="current-password"
                   style="width:100%; padding:0.75rem; border:1px solid var(--color-border); border-radius:var(--radius); font-family:inherit;" />
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;">Sign In</button>
          <div id="login-error" style="color:var(--color-error); font-size:0.875rem; min-height:1.1rem;"></div>
        </form>
        <p style="text-align:center; margin-top:1.5rem; color:var(--color-text-muted);">
          Don't have an account?
          <a href="#register" style="color:var(--color-primary);">Register</a>
        </p>
      </div>
    </section>
  `;

  const form = document.getElementById('login-form');
  const errBox = document.getElementById('login-error');

  form.onsubmit = async (e) => {
    e.preventDefault();
    errBox.textContent = '';
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Signing in…';

    try {
      const res = await api.post('/auth/login', {
        mobile_number: form.mobile_number.value.trim(),
        password: form.password.value,
      });
      setToken(res.access_token);

      const redirect = sessionStorage.getItem('post_login_redirect');
      sessionStorage.removeItem('post_login_redirect');
      window.location.hash = redirect || '#account';
    } catch (err) {
      errBox.textContent = err.message || 'Invalid credentials';
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  };
}
