import { api } from "../api.js";

export async function render() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="section">
      <div class="section-header">
        <h2>WhatsApp Order</h2>
        <p>Create order from WhatsApp chat</p>
      </div>

      <div style="max-width:500px;">
        <form id="whatsapp-form">
          <div class="form-group">
            <label>Customer Name</label>
            <input type="text" name="full_name" required class="form-control" />
          </div>
          <div class="form-group">
            <label>Mobile Number</label>
            <input type="tel" name="mobile_number" required class="form-control" />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" name="email" class="form-control" />
          </div>
          <div class="form-group">
            <label>Address</label>
            <textarea name="address" rows="3" class="form-control" required></textarea>
          </div>
          <div class="form-group">
            <label>Pincode</label>
            <input type="text" name="pincode" class="form-control" required />
          </div>
          <div class="form-group">
            <label>Product</label>
            <select name="product_id" class="form-control" required>
              <option value="">Select product</option>
            </select>
          </div>
          <div class="form-group">
            <label>Quantity</label>
            <input type="number" name="quantity" value="1" min="1" class="form-control" />
          </div>
          <button type="submit" class="btn btn-primary btn-block" style="margin-top:1rem;">Place Order</button>
        </form>
      </div>
    </section>
  `;

  // Load products for dropdown
  try {
    const products = await api.get("/api/admin/products/?limit=100");
    const select = document.querySelector('select[name="product_id"]');
    if (products && products.length) {
      select.innerHTML = products.map(p => `<option value="${p.id}">${p.name}</option>`).join("");
    }
  } catch (e) {
    /* ignore */
  }

  document.getElementById("whatsapp-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Placing…";

    try {
      const payload = {
        full_name: form.full_name.value,
        mobile_number: form.mobile_number.value,
        email: form.email.value || "",
        address: form.address.value,
        pincode: form.pincode.value,
        product_id: form.product_id.value,
        quantity: parseInt(form.quantity.value, 10) || 1,
      };
      const order = await api.post("/api/admin/orders/whatsapp", payload);
      alert("Order created: " + order.order_number);
      window.location.hash = "#orders";
    } catch (err) {
      /* error shown by api.js */
    } finally {
      btn.disabled = false;
      btn.textContent = "Place Order";
    }
  });
}