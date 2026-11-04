const API_BASE = 'http://127.0.0.1:65433/api';

class API {
  constructor() {
    this.token = localStorage.getItem('customer_token');
  }

  async request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const url = path.startsWith('http') ? path : API_BASE + (path.startsWith('/') ? path : '/' + path);
    try {
      const res = await fetch(url, { ...options, headers, mode: 'cors' });
      if (res.status === 401) {
        localStorage.removeItem('customer_token');
        window.location.hash = '#login';
        throw new Error('Unauthorized');
      }
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      const ct = res.headers.get('content-type');
      return ct && ct.includes('application/json') ? res.json() : res.text();
    } catch (e) {
      console.error('API error:', e);
      throw e;
    }
  }

  get(path) { return this.request(path); }
  post(path, body) { return this.request(path, { method: 'POST', body: JSON.stringify(body) }); }
}

export const api = new API();
export function setToken(t) { localStorage.setItem('customer_token', t); api.token = t; }
export function clearToken() { localStorage.removeItem('customer_token'); api.token = null; }
export function getToken() { return localStorage.getItem('customer_token'); }

// Resolve relative image URLs to full backend URLs
export function resolveUrl(url) {
  if (url && url.startsWith('/')) {
    return API_BASE.replace('/api', '') + url;
  }
  return url;
}