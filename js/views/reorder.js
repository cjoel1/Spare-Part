import * as db from "../db.js";
import { state, needsReorder } from "../state.js";
import { icon } from "../utils/icons.js";
import { escapeHtml } from "../utils/helpers.js";
import { navigate } from "../router.js";
import { openPrintOverlay } from "../utils/print.js";

export async function render(root) {
  const parts = await db.getAllParts();
  const items = parts.filter(needsReorder).sort((a, b) => a.partNumber.localeCompare(b.partNumber));

  root.innerHTML = `
    <div class="flex items-center justify-between mb-16">
      <span class="text-sm muted">${items.length} repuesto${items.length === 1 ? "" : "s"} requieren reposición</span>
      ${items.length ? `<button class="btn btn-primary" id="btn-generate-po">${icon("print", { size: 16 })} Generar orden de compra</button>` : ""}
    </div>
    <div class="flex-col gap-12" id="reorder-list"></div>
  `;

  const listEl = root.querySelector("#reorder-list");

  if (!items.length) {
    listEl.innerHTML = `
      <div class="empty-state">
        ${icon("check", { size: 40 })}
        <div class="empty-title">Todo en orden</div>
        <div>Ningún repuesto necesita reposición en este momento.</div>
      </div>
    `;
    return;
  }

  listEl.innerHTML = items
    .map(
      (p) => `
      <div class="card card-pad">
        <div class="part-card-top" style="cursor:pointer;" data-id="${p.id}">
          <div>
            <div class="part-pn">${escapeHtml(p.partNumber)}</div>
            <div class="part-desc">${escapeHtml(p.description)}</div>
          </div>
          <span class="pill pill-status-reorder">${icon("reorder", { size: 12 })} Reordenar</span>
        </div>
        <div class="part-meta mt-16" style="margin-top:10px;">
          <span><b>Stock actual:</b> ${p.qty}</span>
          <span><b>Mínimo:</b> ${p.reorderQty}</span>
          <span><b>Lead time:</b> ${p.leadTimeDays ? p.leadTimeDays + " días" : "—"}</span>
          <span><b>Fabricante:</b> ${escapeHtml(p.manufacturer || "—")}</span>
        </div>
        ${p.equivalentPN ? `<div class="text-sm muted mt-16" style="margin-top:8px;"><b>Proveedor / equivalentes:</b> ${escapeHtml(p.equivalentPN)}</div>` : ""}
        <div class="field" style="margin-top:12px;margin-bottom:0;">
          <label>Cantidad a pedir</label>
          <input type="number" min="1" step="1" class="po-qty" data-id="${p.id}" value="${Math.max(p.reorderQty * 2 - p.qty, p.reorderQty + 1, 1)}" style="max-width:140px;" />
        </div>
      </div>
    `
    )
    .join("");

  listEl.querySelectorAll("[data-id].part-card-top").forEach((el) => {
    el.addEventListener("click", () => navigate(`/parts/${el.dataset.id}`));
  });

  const genBtn = root.querySelector("#btn-generate-po");
  if (genBtn) {
    genBtn.addEventListener("click", () => {
      const qtyById = {};
      listEl.querySelectorAll(".po-qty").forEach((inp) => {
        qtyById[inp.dataset.id] = Number(inp.value) || 1;
      });
      const rows = items
        .map(
          (p) => `
          <tr>
            <td>${escapeHtml(p.partNumber)}</td>
            <td>${escapeHtml(p.description)}</td>
            <td>${escapeHtml(p.manufacturer || "")}</td>
            <td>${escapeHtml(p.equivalentPN || "")}</td>
            <td>${p.leadTimeDays || 0}</td>
            <td>${p.qty}</td>
            <td><strong>${qtyById[p.id]}</strong></td>
          </tr>
        `
        )
        .join("");
      openPrintOverlay({
        title: "Orden de compra",
        bodyHtml: `
          <h1>Orden de compra</h1>
          <div class="print-meta">${escapeHtml(state.companyName)} · Generada el ${new Date().toLocaleString("es")} · ${items.length} ítems</div>
          <table>
            <thead>
              <tr><th>N° Parte</th><th>Descripción</th><th>Fabricante</th><th>Proveedor / Equivalente</th><th>Lead time (días)</th><th>Stock</th><th>Cant. a pedir</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `,
      });
    });
  }
}
