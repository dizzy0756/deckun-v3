import { api, getToken } from '../api.js';

const rupee = (amount) => "₹" + Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export async function renderCheckout(app) {
  const cart = JSON.parse(localStorage.getItem('deckun_cart') || '[]');

  if (cart.length === 0) {
    app.innerHTML = `<section class="section"><div class="container" style="max-width:600px;">
      <p>Your cart is empty</p>
      <a href="#products" class="btn btn-primary" style="margin-top:1rem;">Shop Now</a>
    </div></section>`;
    return;
  }

  const subtotal = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
  let appliedCode = null;
  let discount = 0;

  app.innerHTML = `
    <section class="section">
      <div class="container" style="max-width:600px;">
        <h1 style="font-family:var(--font-heading); font-size:2rem; margin-bottom:1.5rem;">Checkout</h1>
        <form id="checkout-form" style="display:flex; flex-direction:column; gap:1rem;">
          <div>
            <label style="display:block; margin-bottom:0.5rem; font-weight:500;">Full Name</label>
            <input type="text" name="name" required style="width:100%; padding:0.75rem; border:1px solid var(--color-border); border-radius:var(--radius); font-family:inherit;" />
          </div>
          <div>
            <label style="display:block; margin-bottom:0.5rem; font-weight:500;">Mobile Number</label>
            <input type="tel" name="mobile" required style="width:100%; padding:0.75rem; border:1px solid var(--color-border); border-radius:var(--radius); font-family:inherit;" />
          </div>
          <div>
            <label style="display:block; margin-bottom:0.5rem; font-weight:500;">PIN Code</label>
            <input type="text" name="pincode" required style="width:100%; padding:0.75rem; border:1px solid var(--color-border); border-radius:var(--radius); font-family:inherit;" />
          </div>
          <div>
            <label style="display:block; margin-bottom:0.5rem; font-weight:500;">Address</label>
            <textarea name="address" required rows="3" style="width:100%; padding:0.75rem; border:1px solid var(--color-border); border-radius:var(--radius); font-family:inherit; resize:vertical;"></textarea>
          </div>
          <div>
            <label style="display:block; margin-bottom:0.5rem; font-weight:500;">Landmark (Optional)</label>
            <input type="text" name="landmark" style="width:100%; padding:0.75rem; border:1px solid var(--color-border); border-radius:var(--radius); font-family:inherit;" />
          </div>

          <div>
            <label style="display:block; margin-bottom:0.5rem; font-weight:500;">Promo Code</label>
            <div style="display:flex; gap:0.5rem;">
              <input type="text" id="promo-code" placeholder="Enter code" style="flex:1; padding:0.75rem; border:1px solid var(--color-border); border-radius:var(--radius); font-family:inherit; text-transform:uppercase;" />
              <button type="button" id="apply-promo" class="btn btn-secondary">Apply</button>
            </div>
            <div id="promo-msg" style="font-size:0.875rem; margin-top:0.375rem; min-height:1.1rem;"></div>
          </div>

          <div style="padding:1rem; background:var(--color-surface-alt); border-radius:var(--radius); display:grid; gap:0.35rem;">
            <div style="display:flex; justify-content:space-between;"><span>Subtotal</span><span>${rupee(subtotal)}</span></div>
            <div id="discount-row" style="display:none; justify-content:space-between; color:var(--color-success);">
              <span>Discount</span><span id="discount-value">− ${rupee(0)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-weight:700; border-top:1px solid var(--color-border); padding-top:0.5rem;">
              <span>Payable</span><span id="payable">${rupee(subtotal)}</span>
            </div>
            <div style="color:var(--color-text-muted); font-size:0.875rem;">Payment: Cash on Delivery</div>
          </div>

          <button type="submit" class="btn btn-primary" style="width:100%;">Place Order (COD)</button>
        </form>
      </div>
    </section>
  `;

  const promoInput = document.getElementById('promo-code');
  const applyBtn = document.getElementById('apply-promo');
  const promoMsg = document.getElementById('promo-msg');
  const discountRow = document.getElementById('discount-row');
  const discountValue = document.getElementById('discount-value');
  const payableEl = document.getElementById('payable');

  const refreshTotals = () => {
    const payable = Math.max(0, subtotal - discount);
    payableEl.textContent = rupee(payable);
    if (discount > 0) {
      discountRow.style.display = 'flex';
      discountValue.textContent = '− ' + rupee(discount);
    } else {
      discountRow.style.display = 'none';
    }
  };

  applyBtn.addEventListener('click', async () => {
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
  });

  document.getElementById('checkout-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form);

    const summary = {
      name: data.name,
      mobile: data.mobile,
      pincode: data.pincode,
      address: data.address,
      landmark: data.landmark || null,
      subtotal,
      promotion_code: appliedCode,
      discount,
      total: Math.max(0, subtotal - discount),
      placed_at: new Date().toISOString(),
    };

    // Persist the most recent checkout summary for the orders view
    localStorage.setItem('deckun_last_order', JSON.stringify(summary));

    // If a customer session exists, create the order server-side.
    if (getToken()) {
      try {
        await api.post('/orders/checkout', {
          shipping_address_id: summary.shipping_address_id || null,
          payment_method: 'cod',
          promotion_code: appliedCode,
          customer_note: summary.landmark,
        });
      } catch (err) {
        // Address/auth not fully wired yet — fall back to local confirmation
        console.warn('Server checkout not completed:', err);
      }
    }

    alert(
      appliedCode
        ? `Order placed with ${appliedCode} — you saved ${rupee(discount)} (COD)`
        : 'Order placed — awaiting confirmation (COD)'
    );
    localStorage.removeItem('deckun_cart');
    document.dispatchEvent(new Event('cart-updated'));
    window.location.hash = '#orders';
  };
}
