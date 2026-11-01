import { api } from '../api.js';

export function renderCheckout(app) {
  const cart = JSON.parse(localStorage.getItem('deckun_cart') || '[]');
  let total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  if (cart.length === 0) {
    app.innerHTML = '<section class="section"><div class="container" style="max-width:600px;"><p>Your cart is empty</p><a href="#products" class="btn btn-primary" style="margin-top:1rem;">Shop Now</a></div></section>';
    return;
  }
  
  app.innerHTML = 
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
          <div style="padding:1rem; background:var(--color-surface-alt); border-radius:var(--radius);">
            <div style="display:flex; justify-content:space-between;"><span>Order Total</span><strong>₹</strong></div>
            <div style="color:var(--color-text-muted); font-size:0.875rem; margin-top:0.25rem;">Payment: Cash on Delivery</div>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;">Place Order (COD)</button>
        </form>
      </div>
    </section>
  ;

  document.getElementById('checkout-form').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    alert('Order placed — awaiting confirmation (COD)');
    localStorage.removeItem('deckun_cart');
    document.dispatchEvent(new Event('cart-updated'));
    window.location.hash = '#orders';
  };
}
