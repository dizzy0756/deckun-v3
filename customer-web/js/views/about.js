import { api } from '../api.js';

const escapeAttr = (text) => String(text == null ? '' : text).replace(/"/g, '&quot;');

export async function renderAbout(app) {
  let content = {};
  try {
    content = (await api.get('/content/')) || {};
  } catch (e) {
    content = {};
  }

  const get = (key, fallback = '') => content?.[key]?.text_value || fallback;

  const email = get('contact.email', 'hello@deckun.in');
  const phoneRaw = get('contact.phone', '+91 90000 00000');
  const phoneHref = 'tel:' + phoneRaw.replace(/[^\d+]/g, '');

  const instaRaw = get('contact.instagram', 'deckun');
  const instaHandle = instaRaw.replace(/^@/, '');
  const instaUrl = /^https?:\/\//i.test(instaRaw)
    ? instaRaw
    : `https://instagram.com/${instaHandle}`;

  app.innerHTML = `
    <section class="section">
      <div class="container" style="max-width:800px;">
        <h1 style="font-family:var(--font-heading); font-size:2.5rem; margin-bottom:1rem;">About Deckun</h1>
        <p style="color:var(--color-text-secondary); font-size:1.125rem; line-height:1.8;">
          Deckun is a premium outdoor gear store dedicated to helping you live more outdoors.
          We offer carefully curated products built for adventure, durability, and comfort.
        </p>

        <h2 style="font-family:var(--font-heading); font-size:1.5rem; margin:2rem 0 0.5rem;">Get in touch</h2>
        <p style="color:var(--color-text-secondary);">Reach us on any of these — we're happy to help.</p>

        <div class="contact-icons">
          <a class="contact-icon" href="${escapeAttr(instaUrl)}" target="_blank" rel="noopener noreferrer"
             aria-label="Instagram" title="Instagram">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2.5" y="2.5" width="19" height="19" rx="5.5"></rect>
              <circle cx="12" cy="12" r="4.2"></circle>
              <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"></circle>
            </svg>
          </a>

          <a class="contact-icon" href="mailto:${escapeAttr(email)}"
             aria-label="Email us" title="${escapeAttr(email)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2.5" y="5" width="19" height="14" rx="2.5"></rect>
              <path d="M3.5 7l7.3 5.3a2 2 0 0 0 2.4 0L20.5 7"></path>
            </svg>
          </a>

          <a class="contact-icon" href="${escapeAttr(phoneHref)}"
             aria-label="Call us" title="${escapeAttr(phoneRaw)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 16.9v2.1a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 1.1 3.2 2 2 0 0 1 3.1 1h2.1a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L6.5 8.5a16 16 0 0 0 6 6l.9-.9a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2.1z"></path>
            </svg>
          </a>
        </div>
      </div>
    </section>
  `;
}
