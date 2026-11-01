export async function renderLogin(app) {
  app.innerHTML = 
    <section class="section">
      <div class="container" style="max-width:400px;">
        <h1 style="font-family:var(--font-heading); font-size:2rem; margin-bottom:0.5rem; text-align:center;">Login</h1>
        <p style="color:var(--color-text-muted); text-align:center; margin-bottom:2rem;">Welcome back to Deckun</p>
        <form id="login-form" style="display:flex; flex-direction:column; gap:1rem;">
          <div>
            <label style="display:block; margin-bottom:0.5rem; font-weight:500;">Email</label>
            <input type="email" name="email" required style="width:100%; padding:0.75rem; border:1px solid var(--color-border); border-radius:var(--radius); font-family:inherit;" />
          </div>
          <div>
            <label style="display:block; margin-bottom:0.5rem; font-weight:500;">Password</label>
            <input type="password" name="password" required style="width:100%; padding:0.75rem; border:1px solid var(--color-border); border-radius:var(--radius); font-family:inherit;" />
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;">Sign In</button>
        </form>
        <p style="text-align:center; margin-top:1.5rem; color:var(--color-text-muted);">Don't have an account? <a href="#register" style="color:var(--color-primary);">Register</a></p>
      </div>
    </section>
  ;

  document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    // Placeholder - would call API
    alert('Login functionality coming soon');
  };
}
