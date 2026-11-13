import { api } from "../api.js";

export async function render() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="section">
      <div class="section-header">
        <h2>WhatsApp Order</h2>
        <p>Create an order placed over a WhatsApp chat</p>
      </div>

      <form id="whatsapp-form" style="max-width:720px;">
        <div class="card">
          <div class="card-header">Customer</div>
          <div class="form-group">
            <label>Full Name *</label>
            <input type="text" name="full_name" class="form-control" required />
          </div>
          <div class="form-group">
            <label>Mobile Number *</label>
            <input type="tel" name="mobile_number" class="form-control" required placeholder="9000000000" />
          </div>
          <div class="form-group">
            <label>Email (optional)</label>
            <input type="email" name="email" class="form-control" />
          </div>
        </div>

        <div class="card">
          <div class="card-header">Shipping Address</div>
          <div class="form-group">
            <label>Address Line 1 *</label>
            <input type="text" name="address_line1" class="form-control" required />
          </div>
          <div class="form-group">
            <label>Address Line 2 (optional)</label>
            <input type="text" name="address_line2" class="form-control" />
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <div class="form-group">
              <label>City *</label>
              <input type="text" name="city" class="form-control" required />
            </div>
            <div class="form-group">
              <label>State *</label>
              <input type="text" name="state" class="form-control" required />
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <div class="form-group">
              <label>PIN Code *</label>
              <input type="text" name="pincode" class="form-control" required />
            </div>
            <div class="form-group">
              <label>Landmark (optional)</label>
              <input type="text" name="landmark" class="form-control" />
            </div>
          </div>
          <div class="form-group">
            <label>Contact Phone for Delivery *</label>
            <input type="tel" name="phone_number" class="form-control" required placeholder="9000000000" />
          </div>
        </div>

        <div class="card">
          <div class="card-header">Items</div>
          <div class="form-group">
            <label>Product *</label>
            <select name="product_id" class="form-control" id="product-select" required>
              <option value="">Loading products…</option>
            </select>
          </div>
          <div class="form-group" id="variant-group" style="display:none;">
            <label>Variant *</label>
            <select name="variant_id" class="form-control" id="variant-select"></select>
          </div>
          <div class="form-group">
            <label>Quantity *</label>
            <input type="number" name="quantity" class="form-control" value="1" min="1" required />
          </div>
          <div class="form-group">
            <label>Payment Method</label>
            <select name="payment_method" class="form-control">
              <option value="cod">Cash on Delivery</option>
              <option value="whatsapp">WhatsApp / Direct</option>
            </select>
          </div>
          <div class="form-group">
            <label>Customer Note (optional)</label>
            <textarea name="customer_note" rows="2" class="form-control"></textarea>
          </div>
        </div>

        <button type="submit" class="btn btn-primary" style="margin-top:1rem;">Create Order</button>
        <div id="wa-error" class="error-text" style="margin-top:0.75rem;"></div>
      </form>
    </section>
  `;

  const productSelect = document.getElementById("product-select");
  const variantGroup = document.getElementById("variant-group");
  const variantSelect = document.getElementById("variant-select");
  const errBox = document.getElementById("wa-error");

  // Load products
  let products = [];
  try {
    products = await api.get("/api/admin/products/?limit=200");
    productSelect.innerHTML = `<option value="">Select a product…</option>` +
      products.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("");
  } catch (e) {
    productSelect.innerHTML = `<option value="">Failed to load products</option>`;
  }

  productSelect.addEventListener("change", async () => {
    const id = productSelect.value;
    variantGroup.style.display = "none";
    variantSelect.innerHTML = "";
    if (!id) return;

    const summary = products.find((p) => String(p.id) === String(id));
    if (!summary?.has_variants) return;

    try {
      const detail = await api.get(`/api/admin/products/${id}`);
      const variants = detail.variants || [];
      if (variants.length) {
        variantSelect.innerHTML = variants.map((v) =>
          `<option value="${v.id}">${escapeHtml(v.name)} — ${escapeHtml(v.sku)}</option>`
        ).join("");
        variantGroup.style.display = "block";
      }
    } catch (e) {
      errBox.textContent = "Could not load variants for this product.";
    }
  });

  const form = document.getElementById("whatsapp-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errBox.textContent = "";
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Creating…";

    const payload = {
      full_name: form.full_name.value.trim(),
      mobile_number: form.mobile_number.value.trim(),
      email: form.email.value.trim() || null,
      address: {
        label: "WhatsApp",
        full_name: form.full_name.value.trim(),
        address_line1: form.address_line1.value.trim(),
        address_line2: form.address_line2.value.trim() || null,
        city: form.city.value.trim(),
        state: form.state.value.trim(),
        pincode: form.pincode.value.trim(),
        landmark: form.landmark.value.trim() || null,
        phone_number: form.phone_number.value.trim(),
        is_default: false,
      },
      items: [{
        product_id: form.product_id.value,
        variant_id: form.variant_id.value || null,
        quantity: parseInt(form.quantity.value, 10) || 1,
      }],
      payment_method: form.payment_method.value,
      customer_note: form.customer_note.value.trim() || null,
    };

    try {
      const order = await api.post("/api/admin/orders/whatsapp", payload);
      alert("Order created: " + order.order_number);
      window.location.hash = `#orders/${order.id}`;
    } catch (err) {
      errBox.textContent = "Failed: " + err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = "Create Order";
    }
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}
