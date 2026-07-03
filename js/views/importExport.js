import * as db from "../db.js";
import { state, needsReorder } from "../state.js";
import { icon } from "../utils/icons.js";
import { escapeHtml, downloadJSON, downloadBlob } from "../utils/helpers.js";
import { showToast } from "../components/toast.js";
import { openPrintOverlay } from "../utils/print.js";
import { confirmModal } from "../components/modal.js";

function colLetterToIndex(letters) {
  let idx = 0;
  for (const ch of letters) idx = idx * 26 + (ch.toUpperCase().charCodeAt(0) - 64);
  return idx - 1;
}

function rowToPart(row, equipmentList) {
  const get = (letter) => {
    const v = row[colLetterToIndex(letter)];
    return v === undefined || v === null ? "" : String(v).trim();
  };
  const num = (letter) => {
    const v = row[colLetterToIndex(letter)];
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const usedIn = [];
  const usedInLetters = ["J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y"];
  usedInLetters.forEach((letter, i) => {
    const eq = equipmentList[i];
    if (!eq) return;
    const raw = get(letter).toUpperCase();
    if (raw === "X" || raw === "TRUE" || raw === "1" || raw === "YES" || raw === "SI" || raw === "SÍ") {
      usedIn.push(eq);
    }
  });
  const leadFromI = num("I");
  const leadFromAA = num("AA");
  return {
    partNumber: get("B"),
    description: get("C"),
    manufacturer: get("D"),
    modelSerial: get("E"),
    qty: num("F"),
    reorderQty: num("G"),
    usedIn,
    equivalentPN: get("Z"),
    leadTimeDays: leadFromAA || leadFromI || 0,
    storageLocationId: get("AB"),
    category: "",
    notes: "",
  };
}

export async function render(root) {
  root.innerHTML = `
    <div class="section-title" style="margin-top:0;">Importar</div>
    <div class="card card-pad mb-16">
      <div class="settings-row-label mb-16" style="margin-bottom:10px;">Importar desde Excel (.xlsx)</div>
      <label class="file-drop" id="xlsx-drop">
        ${icon("upload", { size: 28 })}
        <div><strong>Toca para elegir un archivo .xlsx</strong></div>
        <div class="text-sm faint">Columnas: B=N°Parte, C=Descripción, D=Fabricante, E=Modelo, F=Cant., G=Mínimo, I/AA=Lead time, J–Y=Usado en, Z=Equivalente/Proveedor, AB=Ubicación</div>
        <input type="file" id="xlsx-input" accept=".xlsx,.xls" />
      </label>
      <label class="flex items-center gap-8 mt-16" style="margin-top:12px;font-size:13.5px;font-weight:600;">
        <input type="checkbox" id="xlsx-has-header" checked style="width:auto;" /> La primera fila es encabezado
      </label>
      <div id="xlsx-result" class="text-sm mt-16" style="margin-top:10px;"></div>
    </div>

    <div class="card card-pad mb-16">
      <div class="settings-row-label mb-16" style="margin-bottom:10px;">Importar desde JSON (sincronizar entre dispositivos)</div>
      <label class="file-drop" id="json-drop">
        ${icon("fileJson", { size: 28 })}
        <div><strong>Toca para elegir un archivo .json</strong></div>
        <div class="text-sm faint">Exportado previamente desde esta app</div>
        <input type="file" id="json-input" accept="application/json,.json" />
      </label>
      <div id="json-result" class="text-sm mt-16" style="margin-top:10px;"></div>
    </div>

    <div class="section-title">Exportar</div>
    <div class="action-grid mb-16">
      <button class="action-card" id="export-xlsx">
        ${icon("file", { size: 22 })}
        <div class="action-card-title">Exportar Excel</div>
        <div class="action-card-sub">Inventario completo (.xlsx)</div>
      </button>
      <button class="action-card" id="export-json">
        ${icon("fileJson", { size: 22 })}
        <div class="action-card-title">Exportar JSON</div>
        <div class="action-card-sub">Respaldo completo con ajustes</div>
      </button>
      <button class="action-card" id="share-json">
        ${icon("share", { size: 22 })}
        <div class="action-card-title">Compartir JSON</div>
        <div class="action-card-sub">Enviar a otro dispositivo</div>
      </button>
      <button class="action-card" id="export-pdf">
        ${icon("print", { size: 22 })}
        <div class="action-card-title">Exportar PDF</div>
        <div class="action-card-sub">Inventario completo imprimible</div>
      </button>
    </div>
  `;

  root.querySelector("#xlsx-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const resultEl = root.querySelector("#xlsx-result");
    resultEl.innerHTML = `<div class="flex items-center gap-8"><div class="spinner"></div> Procesando…</div>`;
    try {
      const buf = await file.arrayBuffer();
      const wb = window.XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
      const hasHeader = root.querySelector("#xlsx-has-header").checked;
      const dataRows = hasHeader ? rows.slice(1) : rows;
      const partsData = dataRows
        .map((r) => rowToPart(r, state.equipmentList))
        .filter((p) => p.partNumber);
      if (!partsData.length) {
        resultEl.innerHTML = `<span style="color:var(--danger);">No se encontraron filas válidas (columna B vacía).</span>`;
        return;
      }
      const { created, updated } = await db.upsertPartsBulk(partsData);
      resultEl.innerHTML = `<span style="color:var(--success);">Importación completa: ${created} creados, ${updated} actualizados.</span>`;
      showToast(`Importados ${created + updated} repuestos`, { type: "success" });
    } catch (err) {
      resultEl.innerHTML = `<span style="color:var(--danger);">Error al procesar el archivo: ${escapeHtml(err.message)}</span>`;
    } finally {
      e.target.value = "";
    }
  });

  root.querySelector("#json-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const resultEl = root.querySelector("#json-result");
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data.parts)) throw new Error("Formato JSON inválido (falta 'parts')");
      const replace = await confirmModal({
        title: "Importar JSON",
        message: `Se encontraron ${data.parts.length} repuestos. ¿Deseas REEMPLAZAR todos los datos actuales, o combinarlos con los existentes (actualizando por número de parte)?`,
        confirmLabel: "Reemplazar todo",
      });
      await db.importAllData(data, { replace });
      resultEl.innerHTML = `<span style="color:var(--success);">Importación completa (${replace ? "reemplazo total" : "combinado"}).</span>`;
      showToast("Datos importados", { type: "success" });
    } catch (err) {
      resultEl.innerHTML = `<span style="color:var(--danger);">Error: ${escapeHtml(err.message)}</span>`;
    } finally {
      e.target.value = "";
    }
  });

  root.querySelector("#export-xlsx").addEventListener("click", async () => {
    const parts = await db.getAllParts();
    const rows = parts.map((p) => ({
      "N° Parte": p.partNumber,
      Descripción: p.description,
      Fabricante: p.manufacturer,
      "Modelo/Serie": p.modelSerial,
      Cantidad: p.qty,
      "Mínimo Reorden": p.reorderQty,
      "Necesita Reorden": needsReorder(p) ? "SI" : "NO",
      "Lead Time (días)": p.leadTimeDays,
      "Usado En": (p.usedIn || []).join("; "),
      "Proveedor/Equivalente": p.equivalentPN,
      Ubicación: p.storageLocationId,
      Categoría: p.category,
      Notas: p.notes,
    }));
    const ws = window.XLSX.utils.json_to_sheet(rows);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    const out = window.XLSX.write(wb, { type: "array", bookType: "xlsx" });
    downloadBlob(new Blob([out], { type: "application/octet-stream" }), `inventario-${Date.now()}.xlsx`);
    showToast("Excel exportado", { type: "success" });
  });

  root.querySelector("#export-json").addEventListener("click", async () => {
    const data = await db.exportAllData();
    downloadJSON(data, `spareparts-backup-${Date.now()}.json`);
    showToast("JSON exportado", { type: "success" });
  });

  root.querySelector("#share-json").addEventListener("click", async () => {
    const data = await db.exportAllData();
    const filename = `spareparts-backup-${Date.now()}.json`;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const file = new File([blob], filename, { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Inventario de repuestos" });
        return;
      } catch (err) {
        if (err.name === "AbortError") return;
      }
    }
    downloadBlob(blob, filename);
    showToast("Compartir no disponible: JSON descargado", { type: "default" });
  });

  root.querySelector("#export-pdf").addEventListener("click", async () => {
    const parts = (await db.getAllParts()).sort((a, b) => a.partNumber.localeCompare(b.partNumber));
    const rows = parts
      .map(
        (p) => `
        <tr>
          <td>${escapeHtml(p.partNumber)}</td>
          <td>${escapeHtml(p.description)}</td>
          <td>${escapeHtml(p.manufacturer || "")}</td>
          <td>${p.qty}</td>
          <td>${p.reorderQty}</td>
          <td>${needsReorder(p) ? "SÍ" : "NO"}</td>
          <td>${escapeHtml((p.usedIn || []).join(", "))}</td>
          <td>${escapeHtml(p.storageLocationId || "")}</td>
        </tr>
      `
      )
      .join("");
    openPrintOverlay({
      title: "Inventario completo",
      bodyHtml: `
        <h1>${escapeHtml(state.companyName)}</h1>
        <div class="print-meta">Inventario completo · ${parts.length} repuestos · Generado ${new Date().toLocaleString("es")}</div>
        <table>
          <thead><tr><th>N° Parte</th><th>Descripción</th><th>Fabricante</th><th>Stock</th><th>Mínimo</th><th>Reorden</th><th>Usado en</th><th>Ubicación</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `,
    });
  });
}
