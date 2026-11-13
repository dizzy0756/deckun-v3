import { api, isLoggedIn, clearToken } from '../api.js';

const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
};

export async function renderAccount(app) {
  if (!isLoggedIn()) {
    app.innerHTML = `
      <section class="section">
        <div class="container" style="max-width:600px;">
          <h1 style="font-family:var(--font-heading); font-size:2rem; margin-bottom:1.5rem;">My Account</h1>
          <p style="color:var(--color-text-muted); margin-bottom:1.5rem;">Sign in to view your profile, addresses and orders.</p>
          <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
            <a href="#login" class="btn btn-primary">Sign In</a>
            <a href="#register" class="btn btn-secondary">Create Account</a>
          </div>
        </div>
      </section>
    `;
    return;
  }

  app.innerHTML = `<section class="section"><div class="container" style="max-width:800px;"><div class="loading">Loading account…</div></div></section>`;

  let profile = null;
  let addresses = [];
  try {
    [profile, addresses] = await Promise.all([
      api.get('/auth/me'),
      api.get('/auth/me/addresses'),
    ]);
  } catch (e) {
    app.innerHTML = `<section class="section"><div class="container" style="max-width:800px;">
      <p class="error-text">Could not load account: ${escapeHtml(e.message)}</p>
    </div></section>`;
    return;
  }

  app.innerHTML = `
    <section class="section">
      <div class="container" style="max-width:800px;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap;">
          <h1 style="font-family:var(--font-heading); font-size:2rem;">My Account</h1>
          <button id="logout-btn" class="btn btn-secondary btn-sm">Sign Out</button>
        </div>

        <div class="card" style="margin-top:1rem;">
          <div class="card-header">Profile</div>
          <p><strong>${escapeHtml(profile.full_name)}</strong></p>
          <p style="color:var(--color-text-muted);">${escapeHtml(profile.mobile_number)}</p>
          ${profile.email ? `<p style="color:var(--color-text-muted);">${escapeHtml(profile.email)}</p>` : ''}
        </div>

        <div style="display:flex; gap:0.75rem; margin:1rem 0; flex-wrap:wrap;">
          <a href="#orders" class="btn btn-secondary btn-sm">My Orders</a>
        </div>

        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap;">
            <div class="card-header" style="margin:0;">Saved Addresses</div>
            <button id="add-addr-btn" class="btn btn-primary btn-sm">+ Add Address</button>
          </div>
          <div id="address-list" style="margin-top:1rem;"></div>
        </div>

        <div id="addr-form-wrap" class="card" style="display:none; margin-top:1rem;">
          <div class="card-header" id="addr-form-title">New Address</div>
          <form id="addr-form">
            <input type="hidden" name="address_id" />
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <div class="form-group">
                <label>Label</label>
                <input type="text" name="label" class="form-control" value="Home" />
              </div>
              <div class="form-group">
                <label>Full Name *</label>
                <input type="text" name="full_name" class="form-control" required />
              </div>
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
              <div class="form-group">
                <label>City *</label>
                <input type="text" name="city" class="form-control" required />
              </div>
              <div class="form-group">
                <label>State *</label>
                <input type="text" name="state" class="form-control" required />
              </div>
              <div class="form-group">
                <label>PIN Code *</label>
                <input type="text" name="pincode" class="form-control" required />
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <div class="form-group">
                <label>Landmark</label>
                <input type="text" name="landmark" class="form-control" />
              </div>
              <div class="form-group">
                <label>Phone Number *</label>
                <input type="tel" name="phone_number" class="form-control" required />
              </div>
            </div>
            <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.875rem;margin-bottom:1rem;">
              <input type="checkbox" name="is_default" /> Set as default address
            </label>
            <div style="display:flex;gap:0.5rem;">
              <button type="submit" class="btn btn-primary">Save Address</button>
              <button type="button" id="cancel-addr" class="btn btn-secondary">Cancel</button>
            </div>
            <div id="addr-error" class="error-text" style="margin-top:0.5rem;"></div>
          </form>
        </div>
      </div>
    </section>
  `;

  const listEl = document.getElementById('address-list');
  const formWrap = document.getElementById('addr-form-wrap');
  const form = document.getElementById('addr-form');
  const formTitle = document.getElementById('addr-form-title');
  const errBox = document.getElementById('addr-error');

  const paintAddresses = (items) => {
    if (!items || items.length === 0) {
      listEl.innerHTML = `<p class="empty-state" style="padding:1rem 0;">No saved addresses yet.</p>`;
      return;
    }
    listEl.innerHTML = items.map((a) => `
      <div class="card" style="margin-bottom:0.75rem;border-color:${a.is_default ? 'var(--color-primary)' : 'var(--color-border)'};">
        <div style="display:flex;justify-content:space-between;gap:0.75rem;flex-wrap:wrap;">
          <div>
            <div style="font-weight:600;">
              ${escapeHtml(a.label || 'Address')}
              ${a.is_default ? '<span class="badge badge-active" style="margin-left:0.5rem;">Default</span>' : ''}
            </div>
            <div style="font-size:0.875rem;color:var(--color-text-secondary);margin-top:0.25rem;">
              ${escapeHtml(a.full_name)} · ${escapeHtml(a.phone_number)}<br/>
              ${escapeHtml(a.address_line1)}${a.address_line2 ? ', ' + escapeHtml(a.address_line2) : ''}<br/>
              ${escapeHtml(a.city)}, ${escapeHtml(a.state)} ${escapeHtml(a.pincode)}
              ${a.landmark ? `<br/>Landmark: ${escapeHtml(a.landmark)}` : ''}
            </div>
          </div>
          <div style="display:flex;gap:0.5rem;align-items:flex-start;flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm" data-edit="${a.id}">Edit</button>
            ${!a.is_default ? `<button class="btn btn-secondary btn-sm" data-default="${a.id}">Set Default</button>` : ''}
            <button class="btn btn-danger btn-sm" data-remove="${a.id}">Delete</button>
          </div>
        </div>
      </div>
    `).join("");

    listEl.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.onclick = () => {
        const addr = items.find((x) => String(x.id) === btn.dataset.edit);
        openForm(addr);
      };
    });

    listEl.querySelectorAll('[data-default]').forEach((btn) => {
      btn.onclick = async () => {
        btn.disabled = true;
        try {
          await api.put(`/auth/me/addresses/${btn.dataset.default}/default`);
          const fresh = await api.get('/auth/me/addresses');
          paintAddresses(fresh);
        } catch (e) {
          alert('Failed: ' + e.message);
          btn.disabled = false;
        }
      };
    });

    listEl.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.onclick = async () => {
        if (!confirm('Delete this address?')) return;
        btn.disabled = true;
        try {
          await api.delete(`/auth/me/addresses/${btn.dataset.remove}`);
          const fresh = await api.get('/auth/me/addresses');
          paintAddresses(fresh);
        } catch (e) {
          alert('Failed: ' + e.message);
          btn.disabled = false;
        }
      };
    });
  };

  const openForm = (addr) => {
    form.reset();
    errBox.textContent = '';
    form.address_id.value = addr ? addr.id : '';
    formTitle.textContent = addr ? 'Edit Address' : 'New Address';
    if (addr) {
      form.label.value = addr.label || '';
      form.full_name.value = addr.full_name || '';
      form.address_line1.value = addr.address_line1 || '';
      form.address_line2.value = addr.address_line2 || '';
      form.city.value = addr.city || '';
      form.state.value = addr.state || '';
      form.pincode.value = addr.pincode || '';
      form.landmark.value = addr.landmark || '';
      form.phone_number.value = addr.phone_number || '';
      form.is_default.checked = !!addr.is_default;
    } else {
      form.label.value = 'Home';
      form.full_name.value = profile.full_name || '';
      form.phone_number.value = profile.mobile_number || '';
    }
    formWrap.style.display = 'block';
    formWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  document.getElementById('add-addr-btn').onclick = () => openForm(null);
  document.getElementById('cancel-addr').onclick = () => { formWrap.style.display = 'none'; };

  form.onsubmit = async (e) => {
    e.preventDefault();
    errBox.textContent = '';
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Saving…';

    const payload = {
      label: form.label.value.trim() || 'Home',
      full_name: form.full_name.value.trim(),
      address_line1: form.address_line1.value.trim(),
      address_line2: form.address_line2.value.trim() || null,
      city: form.city.value.trim(),
      state: form.state.value.trim(),
      pincode: form.pincode.value.trim(),
      landmark: form.landmark.value.trim() || null,
      phone_number: form.phone_number.value.trim(),
      is_default: form.is_default.checked,
    };

    const id = form.address_id.value;
    try {
      if (id) {
        await api.put(`/auth/me/addresses/${id}`, payload);
      } else {
        await api.post('/auth/me/addresses', payload);
      }
      formWrap.style.display = 'none';
      const fresh = await api.get('/auth/me/addresses');
      paintAddresses(fresh);
    } catch (err) {
      errBox.textContent = 'Failed: ' + err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Address';
    }
  };

  document.getElementById('logout-btn').onclick = () => {
    clearToken();
    alert('Signed out');
    window.location.hash = '#home';
  };

  paintAddresses(addresses);
}
