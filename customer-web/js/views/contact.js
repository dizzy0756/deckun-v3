export async function renderContact(app) {
  app.innerHTML = `
    <section class="section">
      <div class="container" style="max-width:800px;">
        <h1 style="font-family:var(--font-heading); font-size:2.5rem; margin-bottom:1rem;">Contact</h1>
        <p style="color:var(--color-text-secondary); font-size:1.125rem; line-height:1.8;">Reach us for orders, support, and inquiries. WhatsApp ordering available.</p>
        <div style="margin-top:2rem; padding:1.5rem; background:var(--color-surface-alt); border-radius:var(--radius);">
          <p style="margin-bottom:0.5rem;"><strong>WhatsApp:</strong> <a href="https://wa.me/" style="color:var(--color-primary);">Contact via WhatsApp</a></p>
          <p><strong>Email:</strong> support@deckun.in</p>
        </div>
      </div>
    </section>
  `;
}
