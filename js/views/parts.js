import * as db from "../db.js";
import { state, needsReorder, getEquipmentColor } from "../state.js";
import { icon } from "../utils/icons.js";
import { escapeHtml, debounce } from "../utils/helpers.js";
import { navigate } from "../router.js";

export async function render(root, { query }) {
  const parts = await db.getAllParts();

  const filters = {
    q: query.get("q") || "",
    equipment: query.get("equipment") || "",
    status: query.get("status") || "all",
    category: query.get("category") || "",
  };

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
      <button class="btn btn-primary" id="btn-new-part">${icon("plus", { size: 16 })} Nuevo</button>
    </div>
    <div class="flex items-center justify-between" style="margin-bottom:10px;">
      <span class="text-sm muted" id="result-count"></span>
    </div>
    <div class="part-list" id="parts-list"></div>
  `;

  function updateQuery() {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.equipment) params.set("equipment", filters.equipment);
    if (filters.status !== "all") params.set("status", filters.status);
    if (filters.category) params.set("category", filters.category);
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
    return list.sort((a, b) => a.partNumber.localeCompare(b.partNumber));
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
    listEl.innerHTML = list
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
            <div>
              <div class="part-pn">${escapeHtml(p.partNumber)}</div>
              <div class="part-desc">${escapeHtml(p.description)}</div>
            </div>
            <span class="qty-badge" style="color:${reorder ? "var(--danger)" : "var(--success)"}">${p.qty}</span>
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
      .join("");
    listEl.querySelectorAll("[data-id]").forEach((el) => {
      el.addEventListener("click", () => navigate(`/parts/${el.dataset.id}`));
    });
  }

  const debouncedSearch = debounce((v) => {
    filters.q = v;
    updateQuery();
    renderList();
  }, 200);

  root.querySelector("#f-search").addEventListener("input", (e) => debouncedSearch(e.target.value));
  root.querySelector("#f-equipment").addEventListener("change", (e) => {
    filters.equipment = e.target.value;
    updateQuery();
    renderList();
  });
  root.querySelector("#f-status").addEventListener("change", (e) => {
    filters.status = e.target.value;
    updateQuery();
    renderList();
  });
  root.querySelector("#f-category").addEventListener("change", (e) => {
    filters.category = e.target.value;
    updateQuery();
    renderList();
  });
  root.querySelector("#btn-new-part").addEventListener("click", () => navigate("/parts/new"));

  renderList();
}
