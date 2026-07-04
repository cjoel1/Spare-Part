import { escapeHtml, loadScript } from "./helpers.js";
import { openPrintOverlay } from "./print.js";
import { state } from "../state.js";

// Builds an SVG QR code (as a data-independent inline string) for "SP:<pn>".
function qrSvg(text, sizePx = 120) {
  // qrcode-generator: type 0 = auto version, "M" error correction.
  const qr = window.qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const cell = sizePx / count;
  let rects = "";
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) {
        rects += `<rect x="${(c * cell).toFixed(2)}" y="${(r * cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}"/>`;
      }
    }
  }
  return `<svg width="${sizePx}" height="${sizePx}" viewBox="0 0 ${sizePx} ${sizePx}" xmlns="http://www.w3.org/2000/svg"><rect width="${sizePx}" height="${sizePx}" fill="#fff"/><g fill="#000">${rects}</g></svg>`;
}

// Opens the print overlay with a grid of QR labels for the given parts.
export async function printLabels(parts, { title = "Etiquetas QR" } = {}) {
  await loadScript("./vendor/qrcode.js");
  const labels = parts
    .map(
      (p) => `
    <div class="qr-label">
      ${qrSvg("SP:" + p.partNumber, 120)}
      <div class="qr-label-info">
        <div class="qr-label-pn">${escapeHtml(p.partNumber)}</div>
        <div class="qr-label-desc">${escapeHtml(p.description || "")}</div>
        ${p.storageLocationId ? `<div class="qr-label-loc">${escapeHtml(p.storageLocationId)}</div>` : ""}
        <div class="qr-label-company">${escapeHtml(state.companyName)}</div>
      </div>
    </div>
  `
    )
    .join("");

  openPrintOverlay({
    title,
    bodyHtml: `
      <style>
        .qr-label-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .qr-label {
          display: flex; align-items: center; gap: 12px;
          border: 1px solid #bbb; border-radius: 8px; padding: 10px; page-break-inside: avoid;
        }
        .qr-label svg { flex-shrink: 0; width: 100px; height: 100px; }
        .qr-label-info { min-width: 0; }
        .qr-label-pn { font-weight: 800; font-size: 15px; }
        .qr-label-desc { font-size: 10.5px; color: #444; margin: 2px 0; line-height: 1.3;
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .qr-label-loc { font-size: 10px; font-weight: 700; color: #111; }
        .qr-label-company { font-size: 9px; color: #888; margin-top: 3px; }
        @media print { .qr-label-grid { grid-template-columns: repeat(2, 1fr); } }
      </style>
      <h1>${escapeHtml(title)}</h1>
      <div class="print-meta">${parts.length} etiqueta${parts.length === 1 ? "" : "s"} · ${escapeHtml(state.companyName)} · ${new Date().toLocaleDateString("es")}</div>
      <div class="qr-label-grid">${labels}</div>
    `,
  });
}
