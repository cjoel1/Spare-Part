import { icon } from "../utils/icons.js";

export function openModal({ title, bodyHtml, footerHtml = "", onMount, size = "" } = {}) {
  const root = document.getElementById("modal-root");
  const wrap = document.createElement("div");
  wrap.className = "modal-backdrop";
  wrap.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${title || ""}">
      <div class="modal-header">
        <h3>${title || ""}</h3>
        <button class="icon-btn" data-modal-close aria-label="Cerrar">${icon("close", { size: 20 })}</button>
      </div>
      <div class="modal-body">${bodyHtml || ""}</div>
      ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ""}
    </div>
  `;
  root.appendChild(wrap);

  function close() {
    wrap.remove();
  }
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap) close();
  });
  wrap.querySelector("[data-modal-close]").addEventListener("click", close);

  if (onMount) onMount(wrap.querySelector(".modal"), close);
  return { close, el: wrap.querySelector(".modal") };
}

export function confirmModal({ title = "Confirmar", message = "", confirmLabel = "Confirmar", danger = false }) {
  return new Promise((resolve) => {
    const { close } = openModal({
      title,
      bodyHtml: `<p>${message}</p>`,
      footerHtml: `
        <button class="btn" data-cancel>Cancelar</button>
        <button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-confirm>${confirmLabel}</button>
      `,
      onMount: (modalEl, closeFn) => {
        modalEl.querySelector("[data-cancel]").addEventListener("click", () => {
          closeFn();
          resolve(false);
        });
        modalEl.querySelector("[data-confirm]").addEventListener("click", () => {
          closeFn();
          resolve(true);
        });
      },
    });
  });
}
