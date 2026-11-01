export function renderCart(app) {
  const cart = JSON.parse(localStorage.getItem('deckun_cart') || '[]');
  let total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  let itemsHtml = '';
  if (cart.length > 0) {
    itemsHtml = cart.map((item, idx) => {
      const img = item.image || 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=200&h=200&fit=crop';
      return '<div style="display:flex; gap:1rem; padding:1rem; border:1px solid var(--color-border); border-radius:var(--radius);">' +
        '<img src="' + img + '" style="width:80px; height:80px; object-fit:cover; border-radius:var(--radius);" />' +
        '<div style="flex:1;">' +
        '<div style="font-weight:600;">' + escapeHtml(item.name) + '</div>' +
        '<div style="color:var(--color-primary); font-weight:600;">₹' + item.price + '</div>' +
        '<div style="display:flex; align-items:center; gap:0.75rem; margin-top:0.5rem;">' +
        '<button onclick="updateQty(' + idx + ', -1)" class="btn" style="border:1px solid var(--color-border); width:32px; height:32px; padding:0;">-</button>' +
        '<span>' + item.quantity + '</span>' +
        '<button onclick="updateQty(' + idx + ', 1)" class="btn" style="border:1px solid var(--color-border); width:32px; height:32px; padding:0;">+</button>' +
        '<button onclick="removeItem(' + idx + ')" style="color:var(--color-error); margin-left:auto;">Remove</button>' +
        '</div></div></div>';
    }).join('');
  }
  
  app.innerHTML = '<section class="section"><div class="container" style="max-width:800px;"><h1 style="font-family:var(--font-heading); font-size:2rem; margin-bottom:1.5rem;">Shopping Cart</h1>' +
    (cart.length === 0 ? '<p style="color:var(--color-text-muted);">Your cart is empty</p><a href="#products" class="btn btn-primary" style="margin-top:1rem;">Shop Now</a>' : 
      '<div style="display:flex; flex-direction:column; gap:1rem; margin-bottom:2rem;">' + itemsHtml + '</div>' +
      '<div style="padding:1.5rem; background:var(--color-surface-alt); border-radius:var(--radius); margin-bottom:2rem;"><div style="display:flex; justify-content:space-between; font-weight:600; font-size:1.125rem;"><span>Total</span><span>₹' + total + '</span></div></div>' +
      '<a href="#checkout" class="btn btn-primary" style="width:100%;">Proceed to Checkout</a>'
    ) +
    '</div></section>';

  window.updateQty = (idx, delta) => {
    const cart2 = JSON.parse(localStorage.getItem('deckun_cart') || '[]');
    cart2[idx].quantity += delta;
    if (cart2[idx].quantity <= 0) cart2.splice(idx, 1);
    localStorage.setItem('deckun_cart', JSON.stringify(cart2));
    document.dispatchEvent(new Event('cart-updated'));
    renderCart(app);
  };

  window.removeItem = (idx) => {
    const cart2 = JSON.parse(localStorage.getItem('deckun_cart') || '[]');
    cart2.splice(idx, 1);
    localStorage.setItem('deckun_cart', JSON.stringify(cart2));
    document.dispatchEvent(new Event('cart-updated'));
    renderCart(app);
  };
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}
