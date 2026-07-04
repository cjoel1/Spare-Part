import * as db from "../db.js";
import { icon } from "../utils/icons.js";
import { escapeHtml, loadScript } from "../utils/helpers.js";
import { navigate } from "../router.js";
import { showToast } from "./toast.js";
import { openModal } from "./modal.js";
import { refreshReorderBadge } from "./nav.js";

// QR label content is "SP:<partNumber>"; raw part numbers are accepted too so
// existing manufacturer barcodes/QRs can be reused if they contain the PN.
export async function handleScanResult(text) {
  const raw = String(text || "").trim();
  const pn = raw.startsWith("SP:") ? raw.slice(3) : raw;
  if (!pn) return false;
  const part = await db.getPartByNumber(pn);
  if (!part) {
    showToast(`No existe el repuesto "${escapeHtml(pn)}"`, { type: "error" });
    return false;
  }
  openQuickSheet(part);
  return true;
}

// Quick action sheet after a successful scan: adjust stock or open the part.
function openQuickSheet(part) {
  let qty = part.qty;
  const { close, el } = openModal({
    title: escapeHtml(part.partNumber),
    bodyHtml: `
      <div class="part-desc" style="margin-bottom:10px;">${escapeHtml(part.description)}</div>
      <div class="part-meta" style="margin-bottom:16px;">
        <span><b>Fabricante:</b> ${escapeHtml(part.manufacturer || "—")}</span>
        <span><b>Ubicación:</b> ${escapeHtml(part.storageLocationId || "—")}</span>
        <span><b>Mínimo:</b> ${part.reorderQty}</span>
      </div>
      <div class="flex items-center gap-12" style="justify-content:center;margin:6px 0 4px;">
        <button type="button" class="btn" data-scan-adj="-1" style="font-size:18px;padding:12px 22px;">−</button>
        <span id="scan-qty" style="font-size:30px;font-weight:800;min-width:64px;text-align:center;">${qty}</span>
        <button type="button" class="btn" data-scan-adj="1" style="font-size:18px;padding:12px 22px;">+</button>
      </div>
      <div class="text-sm faint" style="text-align:center;margin-bottom:6px;">Los ajustes se guardan al instante</div>
    `,
    footerHtml: `<button class="btn btn-primary" data-scan-detail>Ver detalle completo</button>`,
    onMount: (modalEl, closeFn) => {
      modalEl.querySelectorAll("[data-scan-adj]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          try {
            const updated = await db.adjustQty(part.id, Number(btn.dataset.scanAdj), "Ajuste por escaneo");
            qty = updated.qty;
            modalEl.querySelector("#scan-qty").textContent = qty;
            refreshReorderBadge();
          } catch (err) {
            showToast(err.message, { type: "error" });
          }
        });
      });
      modalEl.querySelector("[data-scan-detail]").addEventListener("click", () => {
        closeFn();
        navigate(`/parts/${part.id}`);
      });
    },
  });
  return { close, el };
}

let scannerOpen = false;

export async function openScanner() {
  if (scannerOpen) return;
  scannerOpen = true;

  const wrap = document.createElement("div");
  wrap.className = "scanner-overlay";
  wrap.innerHTML = `
    <div class="scanner-top">
      <span style="font-weight:700;">Escanear código QR</span>
      <button class="icon-btn" id="scanner-close" aria-label="Cerrar" style="color:#fff;">${icon("close", { size: 22 })}</button>
    </div>
    <div class="scanner-view">
      <video id="scanner-video" playsinline muted></video>
      <div class="scanner-frame"></div>
    </div>
    <div class="scanner-hint">Apunta al código QR de la etiqueta del repuesto</div>
  `;
  document.body.appendChild(wrap);

  let stream = null;
  let raf = 0;
  const cleanup = () => {
    scannerOpen = false;
    cancelAnimationFrame(raf);
    if (stream) stream.getTracks().forEach((t) => t.stop());
    wrap.remove();
  };
  wrap.querySelector("#scanner-close").addEventListener("click", cleanup);

  try {
    await loadScript("./vendor/jsQR.js");
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1280 } },
      audio: false,
    });
    const video = wrap.querySelector("#scanner-video");
    video.srcObject = stream;
    await video.play();

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const tick = () => {
      if (!scannerOpen) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const scale = Math.min(1, 640 / video.videoWidth);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = window.jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
        if (result && result.data) {
          cleanup();
          handleScanResult(result.data);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  } catch (err) {
    wrap.querySelector(".scanner-hint").innerHTML =
      `<span style="color:#f87171;">No se pudo acceder a la cámara.</span><br>` +
      `<span style="opacity:.8;">Revisa los permisos de cámara para esta app en tu dispositivo.</span>`;
  }
}
