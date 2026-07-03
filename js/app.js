import { initState, state, setTheme, subscribe } from "./state.js";
import { route, notFound, startRouter } from "./router.js";
import { initNav, setActiveNav, setCompanyName } from "./components/nav.js";
import { icon } from "./utils/icons.js";

const viewRoot = document.getElementById("view-root");

async function mount(loader, params, query) {
  viewRoot.innerHTML = `<div class="flex items-center gap-8" style="padding:40px 0;justify-content:center;"><div class="spinner"></div></div>`;
  const mod = await loader();
  viewRoot.scrollTop = 0;
  await mod.render(viewRoot, { params, query });
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
  startRouter();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch((err) => console.warn("SW registration failed", err));
  }
}

boot();
