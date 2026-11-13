/**
 * app.js — router, navigation, and view dispatch.
 *
 * Hash-based routing: #dashboard, #orders, #orders/123, #products, etc.
 * Views live in js/views/<name>.js and export a render() function.
 */

import { api, showToast } from "./api.js";
import { getToken, logout } from "./auth.js";

const NAV_ITEMS = [
  { hash: "#dashboard", label: "Home", icon: "\u00a0" },
  { hash: "#orders", label: "Orders", icon: "\u2709" },
  { hash: "#whatsapp", label: "WA Order", icon: "\U0001f4f2" },
  { hash: "#products", label: "Products", icon: "\U0001f43b" },
  { hash: "#inventory", label: "Inventory", icon: "\u2717" },
  { hash: "#reviews", label: "Reviews", icon: "\u2b30" },
  { hash: "#promotions", label: "Promos", icon: "\U0001f525" },
  { hash: "#content", label: "Content", icon: "\u2192" },
  { hash: "#pincodes", label: "PIN Codes", icon: "\u2317" },
  { hash: "#settings", label: "Settings", icon: "\u2699" },
  { hash: "#customers", label: "Customers", icon: "\U0001f46b" },
];

const VIEWS = {
  dashboard: () => import("./views/dashboard.js"),
  orders: () => import("./views/orders.js"),
  whatsapp: () => import("./views/create-order.js"),
  products: () => import("./views/products.js"),
  inventory: () => import("./views/inventory.js"),
  reviews: () => import("./views/reviews.js"),
  promotions: () => import("./views/promotions.js"),
  content: () => import("./views/content.js"),
  pincodes: () => import("./views/pincodes.js"),
  settings: () => import("./views/settings.js"),
  customers: () => import("./views/customers.js"),
};

function initNav() {
  const sidebar = document.getElementById("nav-list");
  const bottomNav = document.getElementById("bottom-nav");
  const menuBtn = document.getElementById("menu-btn");
  const menuClose = document.getElementById("menu-close");
  const overlay = document.getElementById("nav-overlay");
  const drawer = document.getElementById("sidebar");

  if (sidebar) {
    sidebar.innerHTML = NAV_ITEMS.map((item) =>
      `<li><a href="${item.hash}" class="${item.hash === '#dashboard' ? 'active' : ''}"><span>${item.label}</span></a>`
    ).join("");
  }

  if (bottomNav) {
    bottomNav.innerHTML = NAV_ITEMS.map((item) =>
      `<li><a href="${item.hash}" data-hash="${item.hash}">${item.label}</a></li>`
    ).join("");
  }

  const openDrawer = () => {
    drawer?.classList.add("open");
    overlay?.classList.add("show");
    document.body.classList.add("nav-open");
  };

  const closeDrawer = () => {
    drawer?.classList.remove("open");
    overlay?.classList.remove("show");
    document.body.classList.remove("nav-open");
  };

  menuBtn?.addEventListener("click", () => {
    if (drawer?.classList.contains("open")) closeDrawer();
    else openDrawer();
  });

  menuClose?.addEventListener("click", closeDrawer);
  overlay?.addEventListener("click", closeDrawer);

  // Close the drawer after picking a destination on mobile
  drawer?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeDrawer);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  document.querySelectorAll("[data-hash], .sidebar a").forEach((link) => {
    link.addEventListener("click", () => setActiveNav(link.getAttribute("href") || link.dataset.hash));
  });
}

function setActiveNav(hash) {
  document.querySelectorAll("#nav-list a, #bottom-nav a").forEach((a) => {
    a.classList.toggle("active", a.getAttribute("href") === hash || a.dataset.hash === hash);
  });
}

function getRoute() {
  const hash = window.location.hash || "#dashboard";
  const parts = hash.slice(1).split("/");
  return { name: parts[0] || "dashboard", id: parts[1], subId: parts[2], hash };
}

async function render() {
  const { name, id, subId } = getRoute();
  const app = document.getElementById("app");

  // Handle edit product route: #products/edit/<id> or #products/edit/new
  if (name === "products" && id === "edit") {
    const mod = await import("./views/edit-product.js");
    await mod.render({ id: subId, params: getUrlParams() });
    return;
  }

  const loader = VIEWS[name];
  if (!loader) {
    app.innerHTML = "<p>Page not found.</p>";
    return;
  }

  try {
    const mod = await loader();
    await mod.render({ id, params: getUrlParams() });
  } catch (err) {
    console.error(err);
    app.innerHTML = `<p>Failed to load page.</p>`;
  }
}

function getUrlParams() {
  const hash = window.location.hash || "";
  const parts = hash.split("?");
  if (parts.length < 2) return {};
  return Object.fromEntries(
    new URLSearchParams(parts[1]).entries()
  );
}

async function initNotifications() {
  try {
    const data = await api.get("/api/admin/notifications/", { unread_only: true });
    const badge = document.getElementById("notification-badge");
    if (data && data.length > 0) {
      badge.textContent = String(data.length);
      badge.classList.remove("hidden");
    }
  } catch (err) {
    /* unauthenticated — will redirect */
  }
}

function checkAuth() {
  if (!getToken()) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

/* --- Bootstrap --- */

document.addEventListener("DOMContentLoaded", () => {
  if (!checkAuth()) return;
  initNav();
  initNotifications();
  render();

  document.getElementById("settings-btn")?.addEventListener("click", () => {
    window.location.hash = "#settings";
  });

  window.addEventListener("hashchange", () => {
    render();
  });
});
