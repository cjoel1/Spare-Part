import * as db from "../db.js";
import { state, needsReorder, getEquipmentColor } from "../state.js";
import { icon } from "../utils/icons.js";
import { escapeHtml, debounce } from "../utils/helpers.js";
import { navigate } from "../router.js";
import { refreshReorderBadge } from "../components/nav.js";

const VIEW_PREF_KEY = "sp-parts-view";

export async function render(root, { query }) {
  const parts = await db.getAllParts();

  const filters = {
    q: query.get("q") || "",
    equipment: query.get("equipment") || "",
    status: query.get("status") || "all",
    category: query.get("category") || "",
    sort: query.get("sort") || "pn",
  };
  let viewMode = localStorage.getItem(VIEW_PREF_KEY) || "cards";

  root.innerHTML = `
    <div class="toolbar">
      <div class="search-box">
        ${icon("search", { size: 16 })}
        <input type="search" id="f-search" placeholder="Buscar por número, descripción o fabricante…" value="${escapeHtml(filters.q)}" />
      </div>
      <select id="f-equipment">
        <option value="">Todos los equipos</option>
        ${state.equipmentList.map((eq) => `<option value="${escapeHtml(eq)}" ${filters.equipment === eq ? "selected" : ""}>${escapeHtml(eq)}</option>`).join("")}
      </select>
      <select id="f-status">
        <option value="all" ${filters.status === "all" ? "selected" : ""}>Todos los estados</option>
        <option value="reorder" ${filters.status === "reorder" ? "selected" : ""}>Solo reorden</option>
        <option value="ok" ${filters.status === "ok" ? "selected" : ""}>OK</option>
      </select>
      <select id="f-category">
        <option value="">Todas las categorías</option>
        ${state.categories.map((c) => `<option value="${escapeHtml(c)}" ${filters.category === c ? "selected" : ""}>${escapeHtml(c)}</option>`).join("")}
      </select>
      <select id="f-sort" title="Ordenar">
        <option value="pn" ${filters.sort === "pn" ? "selected" : ""}>N° de parte</option>
        <option value="qty-asc" ${filters.sort === "qty-asc" ? "selected" : ""}>Stock: menor a mayor</option>
        <option value="qty-desc" ${filters.sort === "qty-desc" ? "selected" : ""}>Stock: mayor a menor</option>
        <option value="updated" ${filters.sort === "updated" ? "selected" : ""}>Actualizado reciente</option>
      </select>
      <button class="icon-btn view-toggle" id="btn-view-toggle" title="Cambiar vista"></button>
      <button class="btn btn-primary" id="btn-new-part">${icon("plus", { size: 16 })} Nuevo</button>
    </div>
    <div class="flex items-center justify-between" style="margin-bottom:10px;">
      <span class="text-sm muted" id="result-count"></span>
    </div>
    <div id="parts-list"></div>
  `;

  function updateQuery() {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.equipment) params.set("equipment", filters.equipment);
    if (filters.status !== "all") params.set("status", filters.status);
    if (filters.category) params.set("category", filters.category);
    if (filters.sort !== "pn") params.set("sort", filters.sort);
    const qs = params.toString();
    history.replaceState(null, "", `#/parts${qs ? "?" + qs : ""}`);
  }

  function applyFilters() {
    let list = parts;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      list = list.filter(
        (p) =>
          p.partNumber.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.manufacturer || "").toLowerCase().includes(q)
      );
    }
    if (filters.equipment) list = list.filter((p) => (p.usedIn || []).includes(filters.equipment));
    if (filters.status === "reorder") list = list.filter(needsReorder);
    if (filters.status === "ok") list = list.filter((p) => !needsReorder(p));
    if (filters.category) list = list.filter((p) => p.category === filters.category);

    const sorted = [...list];
    switch (filters.sort) {
      case "qty-asc": sorted.sort((a, b) => a.qty - b.qty); break;
      case "qty-desc": sorted.sort((a, b) => b.qty - a.qty); break;
      case "updated": sorted.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)); break;
      default: sorted.sort((a, b) => a.partNumber.localeCompare(b.partNumber));
    }
    return sorted;
  }

  function stepperMarkup(p) {
    const reorder = needsReorder(p);
    return `
      <div class="qty-stepper">
        <button type="button" data-adj="-1" data-id="${p.id}" aria-label="Restar 1">${icon("minus", { size: 14 })}</button>
        <span class="qty-badge" style="color:${reorder ? "var(--danger)" : "var(--success)"}">${p.qty}</span>
        <button type="button" data-adj="1" data-id="${p.id}" aria-label="Sumar 1">${icon("plus", { size: 14 })}</button>
      </div>
    `;
  }

  function cardsMarkup(list) {
    return `<div class="part-list">${list
      .map((p) => {
        const reorder = needsReorder(p);
        const tags = (p.usedIn || [])
          .slice(0, 4)
          .map((eq) => {
            const c = getEquipmentColor(eq);
            return `<span class="eq-pill" style="--eqc:${c.c};--eqc-soft:${c.s}">${escapeHtml(eq)}</span>`;
          })
          .join("");
        const moreTags = (p.usedIn || []).length > 4 ? `<span class="pill pill-neutral">+${p.usedIn.length - 4}</span>` : "";
        return `
        <div class="part-card" data-id="${p.id}">
          <div class="part-card-top">
            <div class="flex gap-12" style="min-width:0;">
              ${p.photo ? `<img class="part-thumb" src="${p.photo}" alt="" />` : ""}
              <div style="min-width:0;">
                <div class="part-pn">${escapeHtml(p.partNumber)}</div>
                <div class="part-desc">${escapeHtml(p.description)}</div>
              </div>
            </div>
            ${stepperMarkup(p)}
          </div>
          <div class="part-meta">
            <span><b>Fabricante:</b> ${escapeHtml(p.manufacturer || "—")}</span>
            ${p.category ? `<span><b>Categoría:</b> ${escapeHtml(p.category)}</span>` : ""}
            ${reorder ? `<span class="pill pill-status-reorder">Reordenar</span>` : ""}
          </div>
          ${tags || moreTags ? `<div class="part-tags">${tags}${moreTags}</div>` : ""}
        </div>
      `;
      })
      .join("")}</div>`;
  }

  function tableMarkup(list) {
    return `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>N° Parte</th><th>Descripción</th><th>Fabricante</th><th>Categoría</th>
              <th>Stock</th><th>Mín.</th><th>Estado</th><th>Usado en</th>
            </tr>
          </thead>
          <tbody>
            ${list
              .map((p) => {
                const reorder = needsReorder(p);
                const tags = (p.usedIn || [])
                  .map((eq) => {
                    const c = getEquipmentColor(eq);
                    return `<span class="eq-pill" style="--eqc:${c.c};--eqc-soft:${c.s}">${escapeHtml(eq)}</span>`;
                  })
                  .join(" ");
                return `
                <tr data-id="${p.id}">
                  <td style="font-weight:700;white-space:nowrap;">${escapeHtml(p.partNumber)}</td>
                  <td>${escapeHtml(p.description)}</td>
                  <td>${escapeHtml(p.manufacturer || "—")}</td>
                  <td>${escapeHtml(p.category || "—")}</td>
                  <td>${stepperMarkup(p)}</td>
                  <td>${p.reorderQty}</td>
                  <td>${reorder ? `<span class="pill pill-status-reorder">Reordenar</span>` : `<span class="pill pill-status-ok">OK</span>`}</td>
                  <td><div class="chip-row">${tags || "—"}</div></td>
                </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function updateViewToggleIcon() {
    root.querySelector("#btn-view-toggle").innerHTML = icon(viewMode === "cards" ? "table" : "list", { size: 19 });
  }

  function renderList() {
    const list = applyFilters();
    root.querySelector("#result-count").textContent = `${list.length} repuesto${list.length === 1 ? "" : "s"}`;
    const listEl = root.querySelector("#parts-list");
    if (!list.length) {
      listEl.innerHTML = `
        <div class="empty-state">
          ${icon("box", { size: 40 })}
          <div class="empty-title">Sin resultados</div>
          <div>Ajusta los filtros o crea un nuevo repuesto.</div>
        </div>
      `;
      return;
    }
    const isDesktop = window.matchMedia("(min-width: 900px)").matches;
    listEl.innerHTML = viewMode === "table" && isDesktop ? tableMarkup(list) : cardsMarkup(list);
  }

  root.querySelector("#parts-list").addEventListener("click", async (e) => {
    const adjBtn = e.target.closest("[data-adj]");
    if (adjBtn) {
      e.stopPropagation();
      const id = Number(adjBtn.dataset.id);
      const delta = Number(adjBtn.dataset.adj);
      try {
        const updated = await db.adjustQty(id, delta);
        const local = parts.find((p) => p.id === id);
        if (local && updated) {
          local.qty = updated.qty;
          local.updatedAt = updated.updatedAt;
        }
        renderList();
        refreshReorderBadge();
      } catch (err) {
        const { showToast } = await import("../components/toast.js");
        showToast(err.message, { type: "error" });
      }
      return;
    }
    const rowEl = e.target.closest("[data-id]");
    if (rowEl) navigate(`/parts/${rowEl.dataset.id}`);
  });

  const debouncedSearch = debounce((v) => {
    filters.q = v;
    updateQuery();
    renderList();
  }, 200);

  root.querySelector("#f-search").addEventListener("input", (e) => debouncedSearch(e.target.value));
  for (const [selId, key] of [["#f-equipment", "equipment"], ["#f-status", "status"], ["#f-category", "category"], ["#f-sort", "sort"]]) {
    root.querySelector(selId).addEventListener("change", (e) => {
      filters[key] = e.target.value;
      updateQuery();
      renderList();
    });
  }
  root.querySelector("#btn-view-toggle").addEventListener("click", () => {
    viewMode = viewMode === "cards" ? "table" : "cards";
    localStorage.setItem(VIEW_PREF_KEY, viewMode);
    updateViewToggleIcon();
    renderList();
  });
  root.querySelector("#btn-new-part").addEventListener("click", () => navigate("/parts/new"));

  updateViewToggleIcon();
  renderList();
}
