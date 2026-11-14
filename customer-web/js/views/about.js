export async function renderAbout(app) {
  app.innerHTML = `
    <section class="section">
      <div class="container" style="max-width:800px;">
        <h1 style="font-family:var(--font-heading); font-size:2.5rem; margin-bottom:1rem;">About Deckun</h1>
        <p style="color:var(--color-text-secondary); font-size:1.125rem; line-height:1.8;">Deckun is a premium outdoor gear store dedicated to helping you live more outdoors. We offer carefully curated products built for adventure, durability, and comfort.</p>
      </div>
    </section>
  `;
}
