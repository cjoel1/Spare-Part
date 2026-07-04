import { initState, state, setTheme, subscribe } from "./state.js";
import { route, notFound, startRouter } from "./router.js";
import { initNav, setActiveNav, setCompanyName, refreshReorderBadge } from "./components/nav.js";
import { icon } from "./utils/icons.js";
import { showToast } from "./components/toast.js";
import { getLicenseStatus } from "./license.js";
import { showActivationGate } from "./components/activation.js";
import { setWritesLocked } from "./db.js";

const viewRoot = document.getElementById("view-root");

async function mount(loader, params, query) {
  viewRoot.innerHTML = `<div class="flex items-center gap-8" style="padding:40px 0;justify-content:center;"><div class="spinner"></div></div>`;
  const mod = await loader();
  viewRoot.scrollTop = 0;
  await mod.render(viewRoot, { params, query });
  refreshReorderBadge();
}

route("/", (ctx) => {
  setActiveNav("/");
  return mount(() => import("./views/dashboard.js"), ctx.params, ctx.query);
});
route("/parts", (ctx) => {
  setActiveNav("/parts");
  return mount(() => import("./views/parts.js"), ctx.params, ctx.query);
});
route("/parts/new", (ctx) => {
  setActiveNav("/parts");
  return mount(() => import("./views/partDetail.js"), ctx.params, ctx.query);
});
route("/parts/:id", (ctx) => {
  setActiveNav("/parts");
  return mount(() => import("./views/partDetail.js"), ctx.params, ctx.query);
});
route("/by-equipment", (ctx) => {
  setActiveNav("/by-equipment");
  return mount(() => import("./views/byEquipment.js"), ctx.params, ctx.query);
});
route("/reorder", (ctx) => {
  setActiveNav("/reorder");
  return mount(() => import("./views/reorder.js"), ctx.params, ctx.query);
});
route("/import-export", (ctx) => {
  setActiveNav("/import-export");
  return mount(() => import("./views/importExport.js"), ctx.params, ctx.query);
});
route("/settings", (ctx) => {
  setActiveNav("/settings");
  return mount(() => import("./views/settings.js"), ctx.params, ctx.query);
});
route("/help", (ctx) => {
  setActiveNav("/help");
  return mount(() => import("./views/help.js"), ctx.params, ctx.query);
});
notFound(() => {
  viewRoot.innerHTML = `<div class="empty-state"><div class="empty-title">Página no encontrada</div></div>`;
});

function updateThemeButton() {
  const btn = document.getElementById("btn-theme-toggle");
  const isDark = document.documentElement.getAttribute("data-theme") === "dark" ||
    (state.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  btn.innerHTML = icon(isDark ? "sun" : "moon", { size: 20 });
}

function wireTopbar() {
  document.getElementById("btn-theme-toggle").addEventListener("click", async () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark" ||
      (state.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    await setTheme(isDark ? "light" : "dark");
    updateThemeButton();
  });
  document.getElementById("btn-sidebar-toggle").innerHTML = icon("menu", { size: 20 });
  document.getElementById("btn-sidebar-toggle").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("collapsed");
  });
}

async function boot() {
  await initState();
  initNav();
  wireTopbar();
  setCompanyName(state.companyName);
  updateThemeButton();
  subscribe(() => {
    setCompanyName(state.companyName);
    updateThemeButton();
  });

  // License gate: the router (and therefore the whole app) only starts once
  // there is a valid activation, or the user opts into read-only mode.
  const license = await getLicenseStatus();
  state.license = license.payload || null;
  if (license.state === "active") {
    if (license.daysLeft !== null && license.daysLeft <= 30) {
      showToast(`Tu licencia vence en ${license.daysLeft} día${license.daysLeft === 1 ? "" : "s"}`, { type: "error", duration: 6000 });
    }
    startRouter();
  } else if (license.state === "expired") {
    showActivationGate({
      status: license,
      onActivated: () => location.reload(),
      onReadOnly: () => {
        setWritesLocked(true);
        const banner = document.createElement("div");
        banner.className = "readonly-banner";
        banner.textContent = "Modo consulta — la licencia expiró; la edición está bloqueada";
        document.querySelector(".topbar").after(banner);
        startRouter();
      },
    });
  } else {
    showActivationGate({ status: license, onActivated: () => location.reload() });
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => {
        // Only announce updates when the page was already SW-controlled before
        // this install; otherwise the first-ever install (skipWaiting + claim)
        // would falsely look like an update.
        const hadController = !!navigator.serviceWorker.controller;
        reg.addEventListener("updatefound", () => {
          const incoming = reg.installing;
          if (!incoming) return;
          incoming.addEventListener("statechange", () => {
            if (incoming.state === "activated" && hadController) {
              showToast("Nueva versión de la app disponible", {
                type: "success",
                actionLabel: "Recargar",
                onAction: () => location.reload(),
              });
            }
          });
        });
      })
      .catch((err) => console.warn("SW registration failed", err));
  }
}

boot();
