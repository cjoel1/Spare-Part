import { icon } from "../utils/icons.js";
import { escapeHtml } from "../utils/helpers.js";

export function showToast(message, { type = "default", duration, actionLabel, onAction } = {}) {
  const root = document.getElementById("toast-root");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  const iconName = type === "success" ? "check" : type === "error" ? "alertTriangle" : "";
  el.innerHTML = `
    ${iconName ? icon(iconName, { size: 18 }) : ""}
    <span class="grow">${message}</span>
    ${actionLabel ? `<button class="toast-action">${escapeHtml(actionLabel)}</button>` : ""}
  `;
  root.appendChild(el);

  const ms = duration ?? (actionLabel ? 6500 : 3200);
  const dismiss = () => {
    el.style.transition = "opacity 0.2s ease";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 220);
  };
  const timer = setTimeout(dismiss, ms);

  if (actionLabel) {
    el.querySelector(".toast-action").addEventListener("click", () => {
      clearTimeout(timer);
      el.remove();
      if (onAction) onAction();
    });
  }
}
