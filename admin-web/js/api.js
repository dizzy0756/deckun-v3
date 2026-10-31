/**
 * api.js — fetch wrapper with auth, loading overlay, and toast messages.
 *
 * Usage:
 *   import { api, showToast, confirmDialog } from "./api.js";
 *   const data = await api.get("/api/admin/dashboard/");
 */

const API_BASE = (() => {
  const meta = document.querySelector('meta[name="api-base"]');
  return meta ? meta.content : "/api";
})();

export const api = {
  async request(path, { method = "GET", body = null, params = null } = {}) {
    const url = new URL(path, API_BASE);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== "") url.searchParams.set(k, v);
      });
    }

    const opts = {
      method,
      headers: {},
    };

    const token = localStorage.getItem("admin_token");
    if (token) {
      opts.headers["Authorization"] = `Bearer ${token}`;
    }

    if (body instanceof FormData) {
      Object.assign(opts.headers, Object.fromEntries(body.headers));
    } else if (body !== null) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }

    const resp = await fetch(url, opts);

    const contentType = resp.headers.get("content-type") || "";
    let data;
    if (contentType.includes("application/json")) {
      data = await resp.json();
    }

    if (!resp.ok) {
      const detail = data?.detail || resp.statusText || "Request failed";
      if (resp.status === 401) {
        showToast("Session expired. Please log in again.", "error");
        setTimeout(() => {
          window.location.href = "login.html";
        }, 1500);
      } else {
        showToast(detail, "error");
      }
      throw new Error(detail);
    }

    return data;
  },

  get(path, params = null) {
    return this.request(path, { method: "GET", params });
  },
  post(path, body) {
    return this.request(path, { method: "POST", body });
  },
  patch(path, body) {
    return this.request(path, { method: "PATCH", body });
  },
  delete(path, body = null) {
    return this.request(path, { method: "DELETE", body });
  },
};

export function showLoading(show = true) {
  const el = document.getElementById("loading-overlay");
  if (el) el.classList.toggle("hidden", !show);
}

export function showToast(message, type = "info", duration = 3500) {
  const el = document.getElementById("toast");
  if (!el) return console.warn(message);
  el.textContent = message;
  el.className = `toast show ${type}`;
  setTimeout(() => {
    el.classList.remove("show");
  }, duration);
}

export function confirmDialog(message, okText = "Confirm") {
  return new Promise((resolve) => {
    const id = `confirm-${Date.now()}`;
    const modal = document.createElement("div");
    modal.className = "loading-overlay";
    modal.id = id;
    modal.innerHTML = `
      <div class="confirm-box">
        <p>${message}</p>
        <div class="confirm-actions">
          <button class="btn btn-ghost" data-cancel>Cancel</button>
          <button class="btn btn-primary" data-ok>${okText}</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector("[data-cancel]").onclick = () => {
      document.body.removeChild(modal);
      resolve(false);
    };
    modal.querySelector("[data-ok]").onclick = () => {
      document.body.removeChild(modal);
      resolve(true);
    };
  });
}
