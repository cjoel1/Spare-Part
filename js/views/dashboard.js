import * as db from "../db.js";
import { state, needsReorder, getEquipmentColor } from "../state.js";
import { icon } from "../utils/icons.js";
import { escapeHtml, formatDate } from "../utils/helpers.js";
import { navigate } from "../router.js";

export async function render(root) {
  const parts = await db.getAllParts();
  const recentHistory = await db.getRecentHistory(8);
  const partById = new Map(parts.map((p) => [p.id, p]));
  const reorderParts = parts.filter(needsReorder);
  const criticalParts = parts.filter((p) => Number(p.qty) === 0);

  const perEquipment = state.equipmentList.map((eq) => ({
    name: eq,
    count: parts.filter((p) => (p.usedIn || []).includes(eq)).length,
  }));

  root.innerHTML = `
    <div class="stat-grid">
      <div class="card stat-card tone-accent">
        <div class="stat-icon">${icon("box", { size: 18 })}</div>
        <div class="stat-value">${parts.length}</div>
        <div class="stat-label">Total repuestos</div>
      </div>
      <div class="card stat-card tone-warning" id="stat-reorder">
        <div class="stat-icon">${icon("reorder", { size: 18 })}</div>
        <div class="stat-value">${reorderParts.length}</div>
        <div class="stat-label">Necesitan reorden</div>
      </div>
      <div class="card stat-card tone-danger" id="stat-critical">
        <div class="stat-icon">${icon("alertTriangle", { size: 18 })}</div>
        <div class="stat-value">${criticalParts.length}</div>
        <div class="stat-label">Repuestos críticos (sin stock)</div>
      </div>
    </div>

    <div class="section-title">Resumen por equipo</div>
    <div class="card card-pad">
      <div class="flex-col gap-12" id="equipment-summary"></div>
    </div>

    <div class="section-title">Por categoría</div>
    <div class="card card-pad">
      <div class="flex-col gap-12" id="category-summary"></div>
    </div>

    <div class="flex items-center justify-between mt-16" style="margin-top:22px;">
      <div class="section-title" style="margin:0;">Necesitan reorden</div>
      ${reorderParts.length ? `<button class="btn btn-ghost btn-sm" id="see-all-reorder">Ver todos ${icon("chevronRight", { size: 15 })}</button>` : ""}
    </div>
    <div class="part-list" id="reorder-quick-list"></div>

    <div class="section-title" style="margin-top:22px;">Actividad reciente</div>
    <div class="card card-pad" id="activity-feed"></div>
  `;

  const eqSummaryEl = root.querySelector("#equipment-summary");
  const maxCount = Math.max(1, ...perEquipment.map((e) => e.count));
  eqSummaryEl.innerHTML = perEquipment
    .map((e) => {
      const color = getEquipmentColor(e.name);
      const pct = Math.round((e.count / maxCount) * 100);
      return `
        <div class="flex items-center gap-12" data-eq="${escapeHtml(e.name)}" style="cursor:pointer;">
          <div style="width:120px;flex-shrink:0;font-size:12.5px;font-weight:650;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(e.name)}</div>
          <div style="flex:1;background:var(--surface-2);border-radius:6px;height:8px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:${color.c};border-radius:6px;"></div>
          </div>
          <div style="width:26px;text-align:right;font-size:13px;font-weight:700;">${e.count}</div>
        </div>
      `;
    })
    .join("");
  eqSummaryEl.querySelectorAll("[data-eq]").forEach((el) => {
    el.addEventListener("click", () => navigate(`/by-equipment?eq=${encodeURIComponent(el.dataset.eq)}`));
  });

  const catSummaryEl = root.querySelector("#category-summary");
  const perCategory = [...state.categories, ""].map((cat) => ({
    name: cat || "Sin categoría",
    value: cat,
    count: parts.filter((p) => (p.category || "") === cat).length,
  })).filter((c) => c.count > 0);
  if (!perCategory.length) {
    catSummaryEl.innerHTML = `<span class="text-sm faint">Sin datos aún.</span>`;
  } else {
    const maxCat = Math.max(1, ...perCategory.map((c) => c.count));
    catSummaryEl.innerHTML = perCategory
      .map((c) => {
        const color = getEquipmentColor(c.name);
        const pct = Math.round((c.count / maxCat) * 100);
        return `
        <div class="flex items-center gap-12" data-cat="${escapeHtml(c.value)}" style="cursor:pointer;">
          <div style="width:120px;flex-shrink:0;font-size:12.5px;font-weight:650;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(c.name)}</div>
          <div style="flex:1;background:var(--surface-2);border-radius:6px;height:8px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:${color.c};border-radius:6px;"></div>
          </div>
          <div style="width:26px;text-align:right;font-size:13px;font-weight:700;">${c.count}</div>
        </div>
      `;
      })
      .join("");
    catSummaryEl.querySelectorAll("[data-cat]").forEach((el) => {
      el.addEventListener("click", () => {
        const cat = el.dataset.cat;
        navigate(cat ? `/parts?category=${encodeURIComponent(cat)}` : "/parts");
      });
    });
  }

  const activityEl = root.querySelector("#activity-feed");
  if (!recentHistory.length) {
    activityEl.innerHTML = `<span class="text-sm faint">Aún no hay movimientos de stock registrados.</span>`;
  } else {
    activityEl.innerHTML = recentHistory
      .map((h) => {
        const p = partById.get(h.partId);
        const pn = p ? p.partNumber : `#${h.partId}`;
        return `
        <div class="history-item" data-part="${h.partId}" style="cursor:${p ? "pointer" : "default"};">
          <span><b>${escapeHtml(pn)}</b> · ${escapeHtml(h.note || "")} <span class="faint">· ${formatDate(h.timestamp)}</span></span>
          <span style="font-weight:700;color:${h.delta >= 0 ? "var(--success)" : "var(--danger)"}">${h.delta >= 0 ? "+" : ""}${h.delta} (${h.oldQty} → ${h.newQty})</span>
        </div>
      `;
      })
      .join("");
    activityEl.querySelectorAll("[data-part]").forEach((el) => {
      const p = partById.get(Number(el.dataset.part));
      if (p) el.addEventListener("click", () => navigate(`/parts/${p.id}`));
    });
  }

  const quickListEl = root.querySelector("#reorder-quick-list");
  if (!reorderParts.length) {
    quickListEl.innerHTML = `
      <div class="empty-state">
        ${icon("check", { size: 40 })}
        <div class="empty-title">Todo en orden</div>
        <div>Ningún repuesto necesita reposición.</div>
      </div>
    `;
  } else {
    quickListEl.innerHTML = reorderParts
      .slice(0, 6)
      .map(
        (p) => `
        <div class="part-card" data-id="${p.id}">
          <div class="part-card-top">
            <div>
              <div class="part-pn">${escapeHtml(p.partNumber)}</div>
              <div class="part-desc">${escapeHtml(p.description)}</div>
            </div>
            <span class="pill pill-status-reorder">${icon("reorder", { size: 12 })} Reordenar</span>
          </div>
          <div class="part-meta">
            <span><b>Stock:</b> ${p.qty}</span>
            <span><b>Mínimo:</b> ${p.reorderQty}</span>
            <span><b>Fabricante:</b> ${escapeHtml(p.manufacturer || "—")}</span>
          </div>
        </div>
      `
      )
      .join("");
    quickListEl.querySelectorAll("[data-id]").forEach((el) => {
      el.addEventListener("click", () => navigate(`/parts/${el.dataset.id}`));
    });
  }

  const seeAllBtn = root.querySelector("#see-all-reorder");
  if (seeAllBtn) seeAllBtn.addEventListener("click", () => navigate("/reorder"));
  root.querySelector("#stat-reorder").addEventListener("click", () => navigate("/reorder"));
  root.querySelector("#stat-critical").addEventListener("click", () => navigate("/reorder"));
}
