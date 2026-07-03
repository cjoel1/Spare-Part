import * as db from "./db.js";
import { DEFAULT_EQUIPMENT, DEFAULT_CATEGORIES, SAMPLE_PARTS } from "./seed.js";

export const APP_VERSION = "2.0";

export const state = {
  companyName: "Spare Part Inventory",
  equipmentList: [...DEFAULT_EQUIPMENT],
  categories: [...DEFAULT_CATEGORIES],
  theme: "system", // 'light' | 'dark' | 'system'
  ready: false,
};

const listeners = new Set();
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function notify() {
  for (const fn of listeners) fn(state);
}

export async function initState() {
  const seeded = await db.getKV("seeded", false);
  if (!seeded) {
    await db.setKV("equipmentList", DEFAULT_EQUIPMENT);
    await db.setKV("categories", DEFAULT_CATEGORIES);
    await db.setKV("companyName", "Spare Part Inventory");
    await db.setKV("theme", "system");
    await db.upsertPartsBulk(SAMPLE_PARTS);
    await db.setKV("seeded", true);
  }
  const [companyName, equipmentList, categories, theme] = await Promise.all([
    db.getKV("companyName", "Spare Part Inventory"),
    db.getKV("equipmentList", DEFAULT_EQUIPMENT),
    db.getKV("categories", DEFAULT_CATEGORIES),
    db.getKV("theme", "system"),
  ]);
  state.companyName = companyName;
  state.equipmentList = equipmentList;
  state.categories = categories;
  state.theme = theme;
  state.ready = true;
  applyTheme(theme);
  notify();
}

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "dark") root.setAttribute("data-theme", "dark");
  else if (theme === "light") root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");
}

export async function setTheme(theme) {
  state.theme = theme;
  await db.setKV("theme", theme);
  applyTheme(theme);
  notify();
}

export async function setCompanyName(name) {
  state.companyName = name;
  await db.setKV("companyName", name);
  notify();
}

export async function setEquipmentList(list) {
  state.equipmentList = list;
  await db.setKV("equipmentList", list);
  notify();
}

export async function setCategories(list) {
  state.categories = list;
  await db.setKV("categories", list);
  notify();
}

export async function resetAllData() {
  await db.clearAllData();
  await initState();
}

// Deterministic color assignment for equipment pills (cycles through a fixed palette).
const EQUIPMENT_PALETTE = [
  { c: "#2563eb", s: "#e6edff" },
  { c: "#059669", s: "#e3f7ef" },
  { c: "#d97706", s: "#fef3e2" },
  { c: "#dc2626", s: "#fdeaea" },
  { c: "#7c3aed", s: "#f0e9fe" },
  { c: "#0891b2", s: "#e2f6fa" },
  { c: "#be185d", s: "#fce7f1" },
  { c: "#65a30d", s: "#eef7e0" },
];

export function getEquipmentColor(name) {
  const idx = Math.abs(hashCode(name)) % EQUIPMENT_PALETTE.length;
  return EQUIPMENT_PALETTE[idx];
}

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

export function needsReorder(part) {
  return Number(part.qty) <= Number(part.reorderQty);
}
