import { icon } from "../utils/icons.js";

export function showToast(message, { type = "default", duration = 3200 } = {}) {
  const root = document.getElementById("toast-root");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  const iconName = type === "success" ? "check" : type === "error" ? "alertTriangle" : "";
  el.innerHTML = `${iconName ? icon(iconName, { size: 18 }) : ""}<span>${message}</span>`;
  root.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity 0.2s ease";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 220);
  }, duration);
}
