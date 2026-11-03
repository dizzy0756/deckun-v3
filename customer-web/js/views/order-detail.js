export async function renderOrderDetail(app, id) {
  app.innerHTML = `
    <section class="section">
      <div class="container" style="max-width:800px;">
        <a href="#orders" style="color:var(--color-primary); display:inline-flex; align-items:center; gap:0.5rem; margin-bottom:1.5rem;">← Back to Orders</a>
        <h1 style="font-family:var(--font-heading); font-size:2rem; margin-bottom:1rem;">Order #</h1>
        <p style="color:var(--color-text-muted);">Order details will appear here</p>
      </div>
    </section>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}
