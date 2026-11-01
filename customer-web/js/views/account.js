export async function renderAccount(app) {
  app.innerHTML = 
    <section class="section">
      <div class="container" style="max-width:600px;">
        <h1 style="font-family:var(--font-heading); font-size:2rem; margin-bottom:1.5rem;">My Account</h1>
        <div style="display:flex; flex-direction:column; gap:0.75rem;">
          <a href="#orders" class="btn" style="border:1px solid var(--color-border); justify-content:flex-start; padding:1rem;">My Orders</a>
          <a href="#login" class="btn" style="border:1px solid var(--color-border); justify-content:flex-start; padding:1rem;">Login / Register</a>
        </div>
      </div>
    </section>
  ;
}
