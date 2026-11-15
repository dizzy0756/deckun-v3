import { api, getToken, isLoggedIn } from '../api.js';

const rupee = (amount) => "₹" + Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
};

export async function renderCheckout(app) {
  const cart = JSON.parse(localStorage.getItem('deckun_cart') || '[]');

  if (cart.length === 0) {
    app.innerHTML = `<section class="section"><div class="container" style="max-width:600px;">
      <p>Your cart is empty</p>
      <a href="#products" class="btn btn-primary" style="margin-top:1rem;">Shop Now</a>
    </div></section>`;
    return;
  }

  if (!isLoggedIn()) {
    sessionStorage.setItem('post_login_redirect', '#checkout');
    app.innerHTML = `
      <section class="section">
        <div class="container" style="max-width:600px; text-align:center;">
          <h1 style="font-family:var(--font-heading); font-size:2rem; margin-bottom:0.5rem;">Sign in to Checkout</h1>
          <p style="color:var(--color-text-muted); margin-bottom:1.5rem;">You need an account to place an order.</p>
          <div style="display:flex; gap:0.75rem; justify-content:center; flex-wrap:wrap;">
            <a href="#login" class="btn btn-primary">Sign In</a>
            <a href="#register" class="btn btn-secondary">Create Account</a>
          </div>
        </div>
      </section>
    `;
    return;
  }

  const subtotal = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
  let appliedCode = null;
  let discount = 0;
  let addresses = [];

  app.innerHTML = `<section class="section"><div class="container" style="max-width:680px;"><div class="loading">Loading checkout…</div></div></section>`;

  try {
    addresses = await api.get('/auth/me/addresses');
  } catch (e) {
    app.innerHTML = `<section class="section"><div class="container" style="max-width:680px;">
      <p class="error-text">Could not load your addresses: ${escapeHtml(e.message)}</p>
    </div></section>`;
    return;
  }

  const defaultAddr = addresses.find((a) => a.is_default) || addresses[0] || null;

  app.innerHTML = `
    <section class="section">
      <div class="container" style="max-width:680px;">
        <h1 style="font-family:var(--font-heading); font-size:2rem; margin-bottom:1.5rem;">Checkout</h1>

        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap;">
            <div class="card-header" style="margin:0;">Delivery Address</div>
            <a href="#account" class="btn btn-secondary btn-sm">Manage Addresses</a>
          </div>
          <div id="address-picker" style="margin-top:0.75rem;">
            ${addresses.length === 0
              ? `<p style="color:var(--color-text-muted);font-size:0.875rem;">No saved address. Add one below.</p>`
              : addresses.map((a) => `
                <label style="display:flex;gap:0.75rem;align-items:flex-start;padding:0.75rem;border:1px solid var(--color-border);border-radius:var(--radius);margin-bottom:0.5rem;cursor:pointer;">
                  <input type="radio" name="address_id" value="${a.id}" ${defaultAddr && a.id === defaultAddr.id ? 'checked' : ''} style="margin-top:0.25rem;" />
                  <span style="font-size:0.875rem;">
                    <strong>${escapeHtml(a.full_name)}</strong> · ${escapeHtml(a.phone_number)}
                    ${a.is_default ? '<span class="badge badge-active" style="margin-left:0.35rem;">Default</span>' : ''}<br/>
                    ${escapeHtml(a.address_line1)}${a.address_line2 ? ', ' + escapeHtml(a.address_line2) : ''}<br/>
                    ${escapeHtml(a.city)}, ${escapeHtml(a.state)} ${escapeHtml(a.pincode)}
                  </span>
                </label>
              `).join("")}
          </div>
          <button type="button" id="toggle-new-addr" class="btn btn-secondary btn-sm" style="margin-top:0.5rem;">
            + Add a new address
          </button>
        </div>

        <div class="card" id="new-addr-card" style="display:none;">
          <div class="card-header">New Address</div>
          <form id="new-addr-form">
            <div class="form-group">
              <label>Full Name *</label>
              <input type="text" name="full_name" class="form-control" required />
            </div>
            <div class="form-group">
              <label>Address Line 1 *</label>
              <input type="text" name="address_line1" class="form-control" required />
            </div>
            <div class="form-group">
              <label>Address Line 2</label>
              <input type="text" name="address_line2" class="form-control" />
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">
              <div class="form-group"><label>City *</label><input type="text" name="city" class="form-control" required /></div>
              <div class="form-group"><label>State *</label><input type="text" name="state" class="form-control" required /></div>
              <div class="form-group"><label>PIN *</label><input type="text" name="pincode" class="form-control" required /></div>
            </div>
            <div class="form-group">
              <label>Phone Number *</label>
              <input type="tel" name="phone_number" class="form-control" required />
            </div>
            <div class="form-group">
              <label>Landmark</label>
              <input type="text" name="landmark" class="form-control" />
            </div>
            <div style="display:flex;gap:0.5rem;">
              <button type="submit" class="btn btn-primary btn-sm">Save Address</button>
              <button type="button" id="cancel-new-addr" class="btn btn-secondary btn-sm">Cancel</button>
            </div>
            <div id="new-addr-error" class="error-text" style="margin-top:0.5rem;"></div>
          </form>
        </div>

        <div class="card">
          <div class="card-header">Order Summary</div>
          <div id="summary-lines" style="font-size:0.875rem;color:var(--color-text-muted);margin-bottom:0.5rem;">
            ${cart.map((i) => `<div style="display:flex;justify-content:space-between;"><span>${escapeHtml(i.name)} ×${i.quantity}</span><span>${rupee(Number(i.price) * i.quantity)}</span></div>`).join("")}
          </div>
          <div class="form-group" id="paymethod-group" style="display:none;">
            <label>Payment method</label>
            <label style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem;">
              <input type="radio" name="paymethod" value="cod" checked /> Cash on Delivery
            </label>
            <label style="display:flex;align-items:center;gap:0.5rem;">
              <input type="radio" name="paymethod" value="online" /> Pay online (UPI / Card)
            </label>
          </div>
          <div class="form-group">
            <label>Promo Code</label>
            <div style="display:flex;gap:0.5rem;">
              <input type="text" id="promo-code" class="form-control" placeholder="Enter code" style="text-transform:uppercase;" />
              <button type="button" id="apply-promo" class="btn btn-secondary">Apply</button>
            </div>
            <div id="promo-msg" style="font-size:0.875rem;margin-top:0.375rem;min-height:1.1rem;"></div>
          </div>
          <div style="display:grid;gap:0.35rem;">
            <div style="display:flex;justify-content:space-between;"><span>Subtotal</span><span>${rupee(subtotal)}</span></div>
            <div id="discount-row" style="display:none;justify-content:space-between;color:var(--color-success);">
              <span>Discount</span><span id="discount-value"></span>
            </div>
            <div style="display:flex;justify-content:space-between;font-weight:700;border-top:1px solid var(--color-border);padding-top:0.5rem;">
              <span>Payable (COD)</span><span id="payable">${rupee(subtotal)}</span>
            </div>
          </div>
        </div>

        <button id="place-order" class="btn btn-primary" style="width:100%; margin-top:1rem;">Place Order</button>
        <div id="checkout-error" class="error-text" style="margin-top:0.75rem;"></div>
      </div>
    </section>
  `;

  // Restore selection of an address that was just created
  const preselected = sessionStorage.getItem('checkout_select_address');
  if (preselected) {
    const radio = document.querySelector(`input[name="address_id"][value="${preselected}"]`);
    if (radio) radio.checked = true;
    sessionStorage.removeItem('checkout_select_address');
  }

  const promoInput = document.getElementById('promo-code');
  const applyBtn = document.getElementById('apply-promo');  const promoMsg = document.getElementById('promo-msg');
  const discountRow = document.getElementById('discount-row');
  const discountValue = document.getElementById('discount-value');
  const payableEl = document.getElementById('payable');
  const errBox = document.getElementById('checkout-error');

  const refreshTotals = () => {
    payableEl.textContent = rupee(Math.max(0, subtotal - discount));
    if (discount > 0) {
      discountRow.style.display = 'flex';
      discountValue.textContent = '− ' + rupee(discount);
    } else {
      discountRow.style.display = 'none';
    }
  };

  applyBtn.onclick = async () => {
    const code = promoInput.value.trim();
    if (!code) {
      promoMsg.style.color = 'var(--color-error)';
      promoMsg.textContent = 'Enter a promo code';
      return;
    }
    applyBtn.disabled = true;
    applyBtn.textContent = '…';
    try {
      const result = await api.post('/promotions/validate', { code, subtotal });
      if (result?.valid) {
        appliedCode = result.code;
        discount = Number(result.discount_amount) || 0;
        promoMsg.style.color = 'var(--color-success)';
        promoMsg.textContent = `${result.message} — you save ${rupee(discount)}`;
        promoInput.value = result.code;
      } else {
        appliedCode = null;
        discount = 0;
        promoMsg.style.color = 'var(--color-error)';
        promoMsg.textContent = result?.message || 'Invalid code';
      }
    } catch (e) {
      appliedCode = null;
      discount = 0;
      promoMsg.style.color = 'var(--color-error)';
      promoMsg.textContent = 'Could not validate code';
    } finally {
      refreshTotals();
      applyBtn.disabled = false;
      applyBtn.textContent = 'Apply';
    }
  };

  /* New address form */
  const newCard = document.getElementById('new-addr-card');
  const newForm = document.getElementById('new-addr-form');
  const newErr = document.getElementById('new-addr-error');

  document.getElementById('toggle-new-addr').onclick = () => {
    newCard.style.display = newCard.style.display === 'none' ? 'block' : 'none';
  };
  document.getElementById('cancel-new-addr').onclick = () => { newCard.style.display = 'none'; };

  newForm.onsubmit = async (e) => {
    e.preventDefault();
    newErr.textContent = '';
    const btn = newForm.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      const created = await api.post('/auth/me/addresses', {
        label: 'Home',
        full_name: newForm.full_name.value.trim(),
        address_line1: newForm.address_line1.value.trim(),
        address_line2: newForm.address_line2.value.trim() || null,
        city: newForm.city.value.trim(),
        state: newForm.state.value.trim(),
        pincode: newForm.pincode.value.trim(),
        landmark: newForm.landmark.value.trim() || null,
        phone_number: newForm.phone_number.value.trim(),
        is_default: false,
      });
      // Re-render so the new address appears and is selected
      sessionStorage.setItem('checkout_select_address', String(created.id));
      await renderCheckout(app);
    } catch (err) {
      newErr.textContent = 'Failed: ' + err.message;
      btn.disabled = false;
      btn.textContent = 'Save Address';
    }
  };

  /* Sync local cart to server cart, then create the order */
  const syncCartToServer = async () => {
    const serverCart = await api.get('/cart/');
    for (const item of serverCart.items || []) {
      await api.delete(`/cart/items/${item.id}`);
    }
    for (const item of cart) {
      if (!item.slug) continue;
      await api.post('/cart/items', {
        product_slug: item.slug,
        variant_sku: item.variant_sku || null,
        quantity: item.quantity,
      });
    }
  };

  /* Online payments are offered only when Razorpay is configured */
  let onlineEnabled = false;
  try {
    const cfg = await api.get('/orders/payment-config');
    onlineEnabled = !!cfg.enabled;
  } catch (e) {
    onlineEnabled = false;
  }
  if (onlineEnabled) {
    const group = document.getElementById('paymethod-group');
    if (group) group.style.display = 'block';
  }

  const finishOrder = (orderId, number) => {
    localStorage.removeItem('deckun_cart');
    document.dispatchEvent(new Event('cart-updated'));
    alert(`Order placed: ${number}`);
    window.location.hash = `#orders/${orderId}`;
  };

  const loadRazorpay = () =>
    new Promise((resolve, reject) => {
      if (window.Razorpay) return resolve();
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Could not load the payment gateway'));
      document.body.appendChild(script);
    });

  const startRazorpay = async (order) => {
    const intent = await api.post(`/orders/${order.id}/payment/intent`, {});
    await loadRazorpay();
    return new Promise((resolve, reject) => {
      const rzp = new window.Razorpay({
        key: intent.razorpay_key_id,
        amount: intent.amount,
        currency: intent.currency,
        name: intent.name || 'Deckun',
        description: `Order ${intent.order_number}`,
        order_id: intent.razorpay_order_id,
        handler: async (response) => {
          try {
            await api.post(`/orders/${order.id}/payment/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            resolve();
          } catch (err) {
            reject(err);
          }
        },
        modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
      });
      rzp.open();
    });
  };

  document.getElementById('place-order').onclick = async () => {
    errBox.textContent = '';
    const btn = document.getElementById('place-order');

    const selected = document.querySelector('input[name="address_id"]:checked');
    if (!selected) {
      errBox.textContent = 'Please select a delivery address (or add one).';
      return;
    }

    const methodEl = document.querySelector('input[name="paymethod"]:checked');
    const method = methodEl ? methodEl.value : 'cod';

    btn.disabled = true;
    btn.textContent = 'Placing order...';

    try {
      await syncCartToServer();
      const res = await api.post('/orders/checkout', {
        shipping_address_id: selected.value,
        payment_method: method,
        customer_note: null,
        promotion_code: appliedCode,
      });

      const order = res.order || res;

      if (method === 'online') {
        btn.textContent = 'Opening payment...';
        await startRazorpay(order);
      }

      finishOrder(order.id, order.order_number);
    } catch (err) {
      errBox.textContent = 'Could not place order: ' + err.message;
      btn.disabled = false;
      btn.textContent = 'Place Order';
    }
  };

  refreshTotals();
}
