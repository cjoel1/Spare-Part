import * as db from "../db.js";
import { state, needsReorder } from "../state.js";
import { icon } from "../utils/icons.js";
import { escapeHtml } from "../utils/helpers.js";
import { navigate } from "../router.js";
import { openPrintOverlay } from "../utils/print.js";
import { printLabels } from "../utils/qrlabels.js";
import { showToast } from "../components/toast.js";

export async function render(root, { query }) {
  const parts = await db.getAllParts();
  let selected = query.get("eq") || state.equipmentList[0] || "";

  root.innerHTML = `
    <div class="equipment-select-row">
      <select id="eq-select">
        ${state.equipmentList.map((eq) => `<option value="${escapeHtml(eq)}" ${eq === selected ? "selected" : ""}>${escapeHtml(eq)}</option>`).join("")}
      </select>
      <button class="btn" id="btn-print">${icon("print", { size: 16 })} Imprimir</button>
      <button class="btn" id="btn-labels">${icon("qr", { size: 16 })} Etiquetas</button>
    </div>
    <div class="text-sm muted mb-16" id="eq-count"></div>
    <div class="part-list" id="eq-parts-list"></div>
  `;

  const select = root.querySelector("#eq-select");
  const countEl = root.querySelector("#eq-count");
  const listEl = root.querySelector("#eq-parts-list");

  function renderForEquipment(eq) {
    history.replaceState(null, "", `#/by-equipment?eq=${encodeURIComponent(eq)}`);
    const list = parts
      .filter((p) => (p.usedIn || []).includes(eq))
      .sort((a, b) => a.partNumber.localeCompare(b.partNumber));
    countEl.textContent = `${list.length} repuesto${list.length === 1 ? "" : "s"} asociado${list.length === 1 ? "" : "s"} a ${eq}`;

    if (!list.length) {
      listEl.innerHTML = `
        <div class="empty-state">
          ${icon("equipment", { size: 40 })}
          <div class="empty-title">Sin repuestos asignados</div>
          <div>Ningún repuesto está marcado como "usado en" ${escapeHtml(eq)}.</div>
        </div>
      `;
      return;
    }

    listEl.innerHTML = list
      .map((p) => {
        const reorder = needsReorder(p);
        return `
        <div class="part-card" data-id="${p.id}">
          <div class="part-card-top">
            <div>
              <div class="part-pn">${escapeHtml(p.partNumber)}</div>
              <div class="part-desc">${escapeHtml(p.description)}</div>
            </div>
            <span class="qty-badge" style="color:${reorder ? "var(--danger)" : "var(--success)"}">${p.qty}</span>
          </div>
          <div class="part-meta">
            <span><b>Fabricante:</b> ${escapeHtml(p.manufacturer || "—")}</span>
            <span><b>Ubicación:</b> ${escapeHtml(p.storageLocationId || "—")}</span>
            ${reorder ? `<span class="pill pill-status-reorder">Reordenar</span>` : ""}
          </div>
        </div>
      `;
      })
      .join("");
    listEl.querySelectorAll("[data-id]").forEach((el) => {
      el.addEventListener("click", () => navigate(`/parts/${el.dataset.id}`));
    });
  }

  select.addEventListener("change", () => {
    selected = select.value;
    renderForEquipment(selected);
  });

  root.querySelector("#btn-print").addEventListener("click", () => {
    const list = parts
      .filter((p) => (p.usedIn || []).includes(selected))
      .sort((a, b) => a.partNumber.localeCompare(b.partNumber));
    const rows = list
      .map(
        (p) => `
        <tr>
          <td>${escapeHtml(p.partNumber)}</td>
          <td>${escapeHtml(p.description)}</td>
          <td>${escapeHtml(p.manufacturer || "")}</td>
          <td>${p.qty}</td>
          <td>${p.reorderQty}</td>
          <td>${escapeHtml(p.storageLocationId || "")}</td>
        </tr>
      `
      )
      .join("");
    openPrintOverlay({
      title: `Repuestos — ${selected}`,
      bodyHtml: `
        <h1>${escapeHtml(state.companyName)}</h1>
        <div class="print-meta">Equipo: <strong>${escapeHtml(selected)}</strong> · ${list.length} repuestos · Generado ${new Date().toLocaleString("es")}</div>
        <table>
          <thead><tr><th>N° Parte</th><th>Descripción</th><th>Fabricante</th><th>Stock</th><th>Mínimo</th><th>Ubicación</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `,
    });
  });

  root.querySelector("#btn-labels").addEventListener("click", async () => {
    const list = parts
      .filter((p) => (p.usedIn || []).includes(selected))
      .sort((a, b) => a.partNumber.localeCompare(b.partNumber));
    if (!list.length) {
      showToast("No hay repuestos para etiquetar", { type: "error" });
      return;
    }
    await printLabels(list, { title: `Etiquetas QR — ${selected}` });
  });

  renderForEquipment(selected);
}
