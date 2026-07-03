export function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

export function debounce(fn, wait = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export function formatDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString("es", { year: "numeric", month: "short", day: "2-digit" }) +
    " " + d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
}

export function formatDateShort(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("es", { year: "numeric", month: "short", day: "2-digit" });
}

// Triggers a client-side file download without window.open (works inside iOS PWA).
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  downloadBlob(blob, filename);
}

export function slugify(str) {
  return String(str)
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// Reads an image file and returns a downsized JPEG data URL, small enough to
// store inside the part record in IndexedDB without bloating exports.
export function fileToResizedDataURL(file, maxDim = 900, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });
}

export function uniqueId(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
