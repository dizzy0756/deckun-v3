/**
 * auth.js — token management + login form handler.
 */

export function getToken() {
  return localStorage.getItem("admin_token");
}

export function setToken(token) {
  localStorage.setItem("admin_token", token);
}

export function clearToken() {
  localStorage.removeItem("admin_token");
}

export function isAuthenticated() {
  return !!getToken();
}

export function logout() {
  clearToken();
  window.location.href = "login.html";
}

import { api } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = form.email.value;
    const password = form.password.value;
    const btn = form.querySelector("#login-btn");
    const errorEl = document.getElementById("error-msg");
    errorEl.textContent = "";
    btn.disabled = true;
    btn.textContent = "Signing in…";

    try {
      const data = await api.post("/api/auth/admin/login", { email, password });
      setToken(data.access_token);
      window.location.href = "index.html";
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = "Sign In";
    }
  });
});
