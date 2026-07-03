import { icon } from "./icons.js";

// Opens an in-app print/PDF overlay. Never uses window.open (breaks in iOS PWA standalone mode).
// `bodyHtml` is trusted app-generated markup for the printable document.
export function openPrintOverlay({ title = "Documento", bodyHtml }) {
  const root = document.getElementById("print-root");
  root.innerHTML = `
    <div class="print-overlay">
      <div class="print-overlay-bar">
        <strong>${title}</strong>
        <div class="flex gap-8">
          <button class="btn btn-primary btn-sm" id="print-go">${icon("print", { size: 16 })} Imprimir / PDF</button>
          <button class="btn btn-ghost btn-sm" id="print-close">${icon("close", { size: 16 })} Cerrar</button>
        </div>
      </div>
      <div class="print-overlay-body">
        <div class="print-doc">${bodyHtml}</div>
      </div>
    </div>
  `;
  const close = () => {
    root.innerHTML = "";
  };
  root.querySelector("#print-close").addEventListener("click", close);
  root.querySelector("#print-go").addEventListener("click", () => window.print());
  return close;
}
