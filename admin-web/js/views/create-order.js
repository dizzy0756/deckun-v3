export async function render() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="whatsapp-order">
      <h2 class="card-header">WhatsApp Order</h2>
      <p class="empty-state">Form coming soon.</p>
    </section>
  `;
}
