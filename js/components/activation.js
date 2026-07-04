import { activate } from "../license.js";
import { icon } from "../utils/icons.js";
import { escapeHtml } from "../utils/helpers.js";

// Full-screen activation gate. Blocks the app until a valid code is entered.
// options:
//   status      — result of getLicenseStatus()
//   onActivated — called after a code is accepted
//   onReadOnly  — if provided (expired license), shows a "view only" escape hatch
//   allowClose  — show a close button (used from Settings to change the code)
export function showActivationGate({ status = {}, onActivated, onReadOnly, allowClose = false } = {}) {
  const existing = document.getElementById("activation-gate");
  if (existing) existing.remove();

  const expired = status.state === "expired";
  const wrap = document.createElement("div");
  wrap.id = "activation-gate";
  wrap.className = "activation-gate";
  wrap.innerHTML = `
    <div class="activation-card card">
      ${allowClose ? `<button class="icon-btn activation-close" aria-label="Cerrar">${icon("close", { size: 20 })}</button>` : ""}
      <div class="activation-logo">${icon("gear", { size: 34 })}</div>
      <h2>${expired ? "Licencia expirada" : "Activación requerida"}</h2>
      <p class="muted activation-sub">
        ${
          expired
            ? `La licencia de <strong>${escapeHtml(status.payload?.c || "este equipo")}</strong> venció el <strong>${escapeHtml(status.payload?.exp || "")}</strong>. Ingresa un código nuevo para continuar.`
            : "Ingresa el código de activación proporcionado con tu compra para comenzar a usar la app."
        }
      </p>
      <textarea id="activation-code" rows="4" placeholder="SP1.xxxxx.xxxxx" spellcheck="false" autocapitalize="off" autocomplete="off"></textarea>
      <div class="activation-error" id="activation-error" hidden></div>
      <button class="btn btn-primary btn-block" id="activation-submit">${icon("check", { size: 16 })} Activar</button>
      ${expired && onReadOnly ? `<button class="btn btn-ghost btn-block" id="activation-readonly" style="margin-top:8px;">Continuar en modo consulta</button>` : ""}
      <div class="text-sm faint" style="margin-top:14px;text-align:center;">Tus datos permanecen intactos en este dispositivo.</div>
    </div>
  `;
  document.body.appendChild(wrap);

  const close = () => wrap.remove();
  const errorEl = wrap.querySelector("#activation-error");
  const codeEl = wrap.querySelector("#activation-code");

  wrap.querySelector("#activation-submit").addEventListener("click", async () => {
    errorEl.hidden = true;
    const result = await activate(codeEl.value);
    if (!result.ok) {
      errorEl.textContent = result.reason;
      errorEl.hidden = false;
      return;
    }
    close();
    if (onActivated) onActivated(result);
  });

  const roBtn = wrap.querySelector("#activation-readonly");
  if (roBtn) {
    roBtn.addEventListener("click", () => {
      close();
      onReadOnly();
    });
  }
  const closeBtn = wrap.querySelector(".activation-close");
  if (closeBtn) closeBtn.addEventListener("click", close);
}
