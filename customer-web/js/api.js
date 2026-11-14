const API_BASE = 'http://127.0.0.1:65433/api';

class API {
  constructor() {
    this.token = localStorage.getItem('customer_token');
  }

  async request(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body !== undefined && options.body !== null && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const url = path.startsWith('http') ? path : API_BASE + (path.startsWith('/') ? path : '/' + path);

    let res;
    try {
      res = await fetch(url, { ...options, headers, mode: 'cors' });
    } catch (e) {
      console.error('Network error:', e);
      throw new Error('Network error — is the server running?');
    }

    if (res.status === 401) {
      const hadToken = !!this.token;
      localStorage.removeItem('customer_token');
      this.token = null;
      if (hadToken) window.location.hash = '#login';
      throw new Error('Please sign in to continue');
    }

    if (!res.ok) {
      let message = res.statusText || 'Request failed';
      try {
        const data = await res.json();
        if (typeof data?.detail === 'string') {
          message = data.detail;
        } else if (Array.isArray(data?.detail)) {
          message = data.detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
        } else if (data?.detail) {
          message = JSON.stringify(data.detail);
        }
      } catch (_) {
        /* non-JSON error body */
      }
      throw new Error(message);
    }

    if (res.status === 204) return null;
    const ct = res.headers.get('content-type');
    return ct && ct.includes('application/json') ? res.json() : res.text();
  }

  get(path) { return this.request(path); }
  post(path, body) {
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    return this.request(path, {
      method: 'POST',
      body: isForm ? body : JSON.stringify(body),
    });
  }
  put(path, body) { return this.request(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) }); }
  delete(path, body) { return this.request(path, { method: 'DELETE', body: body === undefined ? undefined : JSON.stringify(body) }); }
}

export const api = new API();

export function setToken(t) { localStorage.setItem('customer_token', t); api.token = t; }
export function clearToken() { localStorage.removeItem('customer_token'); api.token = null; }
export function getToken() { return localStorage.getItem('customer_token'); }
export function isLoggedIn() { return !!getToken(); }

// Resolve relative image URLs to full backend URLs
export function resolveUrl(url) {
  if (url && typeof url === 'string' && url.startsWith('/')) {
    return API_BASE.replace('/api', '') + url;
  }
  return url;
}
