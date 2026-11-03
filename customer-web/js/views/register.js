export async function renderRegister(app) {
  app.innerHTML = `
    <section class="section">
      <div class="container" style="max-width:400px;">
        <h1 style="font-family:var(--font-heading); font-size:2rem; margin-bottom:0.5rem; text-align:center;">Create Account</h1>
        <p style="color:var(--color-text-muted); text-align:center; margin-bottom:2rem;">Join Deckun for a better experience</p>
        <form id="register-form" style="display:flex; flex-direction:column; gap:1rem;">
          <div>
            <label style="display:block; margin-bottom:0.5rem; font-weight:500;">Full Name</label>
            <input type="text" name="name" required style="width:100%; padding:0.75rem; border:1px solid var(--color-border); border-radius:var(--radius); font-family:inherit;" />
          </div>
          <div>
            <label style="display:block; margin-bottom:0.5rem; font-weight:500;">Email</label>
            <input type="email" name="email" required style="width:100%; padding:0.75rem; border:1px solid var(--color-border); border-radius:var(--radius); font-family:inherit;" />
          </div>
          <div>
            <label style="display:block; margin-bottom:0.5rem; font-weight:500;">Password</label>
            <input type="password" name="password" required style="width:100%; padding:0.75rem; border:1px solid var(--color-border); border-radius:var(--radius); font-family:inherit;" />
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;">Register</button>
        </form>
        <p style="text-align:center; margin-top:1.5rem; color:var(--color-text-muted);">Already have an account? <a href="#login" style="color:var(--color-primary);">Login</a></p>
      </div>
    </section>
  `;

  document.getElementById('register-form').onsubmit = async (e) => {
    e.preventDefault();
    alert('Registration functionality coming soon');
  };
}
