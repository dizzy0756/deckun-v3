export async function renderTerms(app) {
  document.title = 'Terms & Conditions — Deckun';

  const section = (heading, body) => `
    <div style="margin-bottom:1.5rem;">
      <h2 style="font-family:var(--font-heading); font-size:1.25rem; margin-bottom:0.4rem;">${heading}</h2>
      <div style="color:var(--color-text-secondary); line-height:1.7;">${body}</div>
    </div>
  `;

  app.innerHTML = `
    <section class="section">
      <div class="container" style="max-width:800px;">
        <h1 style="font-family:var(--font-heading); font-size:2.5rem; margin-bottom:0.5rem;">Terms &amp; Conditions</h1>
        <p style="color:var(--color-text-muted); margin-bottom:2rem;">Last updated: November 2026</p>

        ${section('1. Acceptance of Terms', `
          By browsing or purchasing from Deckun, you agree to these Terms &amp; Conditions and our
          order, shipping and returns policies described below.
        `)}

        ${section('2. Products &amp; Pricing', `
          All prices are listed in Indian Rupees (INR) and include applicable taxes unless stated otherwise.
          Product photographs and descriptions are indicative; minor variations in colour or finish may occur.
          We may update prices, stock and promotions at any time without prior notice.
        `)}

        ${section('3. Orders &amp; Confirmation', `
          Orders placed through the website or over WhatsApp are confirmed after verification by our team.
          We reserve the right to cancel an order in case of a pricing error, stock unavailability or a
          failed delivery-address check, with any amount paid refunded in full.
        `)}

        ${section('4. Payment', `
          Cash on Delivery is available for serviceable PIN codes. Any delivery fee applicable to a COD
          order will be confirmed before dispatch. Online payment methods, where offered, are processed
          by third-party providers and are subject to their terms.
        `)}

        ${section('5. Shipping &amp; Delivery', `
          We deliver only to PIN codes listed as serviceable on our website. Delivery timelines are
          estimates and may vary due to weather, transport or local conditions. Please ensure someone is
          available at the delivery address to receive the order.
        `)}

        ${section('6. Returns &amp; Exchanges', `
          Damaged or defective items must be reported within 48 hours of delivery with photographs of the
          packaging and product. Unused items in their original packaging may be exchanged within 7 days
          of delivery. For hygiene and safety reasons, certain items may not be eligible for return.
        `)}

        ${section('7. Cancellation', `
          You may cancel an order before it is dispatched via your account or by contacting our support.
          Once an order has been shipped, cancellation may not be possible.
        `)}

        ${section('8. Promotions &amp; Coupons', `
          Promotional codes are valid only during the stated period and may be subject to minimum order
          values. Unless explicitly stated, codes cannot be combined, and we may withdraw an offer at any time.
        `)}

        ${section('9. Privacy', `
          We collect only the information needed to process and deliver your order and to provide support.
          We do not sell your personal data. See our contact page if you have questions about your data.
        `)}

        ${section('10. Limitation of Liability', `
          Deckun is not liable for indirect or consequential losses arising from the use of our products or
          website. Our total liability for any order is limited to the amount paid for that order.
        `)}

        ${section('11. Governing Law', `
          These terms are governed by the laws of India. Any disputes are subject to the exclusive
          jurisdiction of the courts of Manipur.
        `)}

        ${section('12. Contact', `
          For questions about these terms, reach us via the
          <a href="#contact" style="color:var(--color-primary);">Contact page</a>.
        `)}
      </div>
    </section>
  `;
}
