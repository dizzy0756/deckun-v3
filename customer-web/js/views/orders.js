export async function renderOrders(app) {
  app.innerHTML = `
    <section class="section">
      <div class="container" style="max-width:800px;">
        <h1 style="font-family:var(--font-heading); font-size:2rem; margin-bottom:1.5rem;">My Orders</h1>
        <p style="color:var(--color-text-muted);">No orders yet. <a href="#products" style="color:var(--color-primary);">Start shopping</a></p>
      </div>
    </section>
  `;
}
