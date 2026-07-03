import { icon } from "../utils/icons.js";
import { navigate } from "../router.js";

export const NAV_ITEMS = [
  { id: "dashboard", label: "Inicio", path: "/", iconName: "home" },
  { id: "parts", label: "Repuestos", path: "/parts", iconName: "box" },
  { id: "by-equipment", label: "Por Equipo", path: "/by-equipment", iconName: "equipment" },
  { id: "reorder", label: "Reorden", path: "/reorder", iconName: "reorder" },
  { id: "import-export", label: "Importar", path: "/import-export", iconName: "import" },
  { id: "settings", label: "Ajustes", path: "/settings", iconName: "settings" },
];

const MOBILE_PRIMARY = NAV_ITEMS.slice(0, 4);
const MOBILE_MORE = NAV_ITEMS.slice(4);

let sidebarListEl, bottomNavEl, moreSheetListEl, moreSheetEl, moreSheetBackdropEl, topbarPageEl, topbarCompanyEl;

function itemMarkup(item, { withLabel = true, mobile = false } = {}) {
  return `
    <${mobile ? "button" : "div"} class="${mobile ? "bottom-nav-item" : "sidebar-item"}" data-path="${item.path}" data-nav-id="${item.id}">
      <span class="nav-icon">${icon(item.iconName, { size: mobile ? 22 : 20 })}</span>
      ${withLabel ? `<span>${item.label}</span>` : ""}
    </${mobile ? "button" : "div"}>
  `;
}

export function initNav() {
  sidebarListEl = document.getElementById("sidebar-list");
  bottomNavEl = document.getElementById("bottom-nav");
  moreSheetListEl = document.getElementById("more-sheet-list");
  moreSheetEl = document.getElementById("more-sheet");
  moreSheetBackdropEl = document.getElementById("more-sheet-backdrop");
  topbarPageEl = document.getElementById("topbar-page");
  topbarCompanyEl = document.getElementById("topbar-company");

  sidebarListEl.innerHTML = NAV_ITEMS.map((it) => itemMarkup(it)).join("");
  bottomNavEl.innerHTML =
    MOBILE_PRIMARY.map((it) => itemMarkup(it, { mobile: true })).join("") +
    `<button class="bottom-nav-item" data-more="1">
      <span class="nav-icon">${icon("more", { size: 22 })}</span>
      <span>Más</span>
    </button>`;
  moreSheetListEl.innerHTML = MOBILE_MORE.map(
    (it) => `<div class="sheet-item" data-path="${it.path}" data-nav-id="${it.id}">
      <span class="nav-icon">${icon(it.iconName, { size: 20 })}</span><span>${it.label}</span>
    </div>`
  ).join("");

  document.body.addEventListener("click", (e) => {
    const navEl = e.target.closest("[data-path]");
    if (navEl) {
      navigate(navEl.dataset.path);
      closeMoreSheet();
      return;
    }
    if (e.target.closest("[data-more]")) {
      openMoreSheet();
      return;
    }
  });

  moreSheetBackdropEl.addEventListener("click", closeMoreSheet);
}

function openMoreSheet() {
  moreSheetBackdropEl.hidden = false;
  moreSheetEl.hidden = false;
  requestAnimationFrame(() => {
    moreSheetBackdropEl.classList.add("show");
    moreSheetEl.classList.add("show");
  });
}

function closeMoreSheet() {
  moreSheetBackdropEl.classList.remove("show");
  moreSheetEl.classList.remove("show");
  setTimeout(() => {
    moreSheetBackdropEl.hidden = true;
    moreSheetEl.hidden = true;
  }, 220);
}

export function setActiveNav(path) {
  const activeItem =
    NAV_ITEMS.find((it) => it.path === path) ||
    (path.startsWith("/parts") ? NAV_ITEMS.find((it) => it.id === "parts") : null) ||
    NAV_ITEMS[0];

  document.querySelectorAll("[data-nav-id]").forEach((el) => {
    el.classList.toggle("active", el.dataset.navId === activeItem.id);
  });
  if (topbarPageEl) topbarPageEl.textContent = activeItem.label;
}

export function setCompanyName(name) {
  if (topbarCompanyEl) topbarCompanyEl.textContent = name || "Spare Part Inventory";
}
