import * as db from "../db.js";
import { state, APP_VERSION, setCompanyName, setEquipmentList, setCategories, setTheme, resetAllData } from "../state.js";
import { icon } from "../utils/icons.js";
import { escapeHtml } from "../utils/helpers.js";
import { showToast } from "../components/toast.js";
import { confirmModal } from "../components/modal.js";
import { setCompanyName as setTopbarCompanyName } from "../components/nav.js";

async function renameEquipmentEverywhere(oldName, newName) {
  const parts = await db.getAllParts();
  for (const p of parts) {
    if ((p.usedIn || []).includes(oldName)) {
      const usedIn = p.usedIn.map((e) => (e === oldName ? newName : e));
      await db.updatePart(p.id, { ...p, usedIn });
    }
  }
}

async function removeEquipmentEverywhere(name) {
  const parts = await db.getAllParts();
  for (const p of parts) {
    if ((p.usedIn || []).includes(name)) {
      const usedIn = p.usedIn.filter((e) => e !== name);
      await db.updatePart(p.id, { ...p, usedIn });
    }
  }
}

async function renameCategoryEverywhere(oldName, newName) {
  const parts = await db.getAllParts();
  for (const p of parts) {
    if (p.category === oldName) await db.updatePart(p.id, { ...p, category: newName });
  }
}

async function removeCategoryEverywhere(name) {
  const parts = await db.getAllParts();
  for (const p of parts) {
    if (p.category === name) await db.updatePart(p.id, { ...p, category: "" });
  }
}

function editableList(items, { addLabel }) {
  return `
    <div class="list-editable">
      ${items
        .map(
          (item, i) => `
        <div class="list-editable-row" data-index="${i}">
          <input type="text" value="${escapeHtml(item)}" data-edit />
          <button type="button" class="icon-btn btn-sm" data-move-up title="Subir">${icon("chevronDown", { size: 16, className: "rotate-180" })}</button>
          <button type="button" class="icon-btn btn-sm" data-move-down title="Bajar">${icon("chevronDown", { size: 16 })}</button>
          <button type="button" class="icon-btn btn-sm" data-remove title="Eliminar">${icon("trash", { size: 16 })}</button>
        </div>
      `
        )
        .join("")}
    </div>
    <button type="button" class="btn btn-sm mt-16" style="margin-top:10px;" data-add-item>${icon("plus", { size: 14 })} ${addLabel}</button>
  `;
}

export async function render(root) {
  root.innerHTML = `
    <div class="section-title" style="margin-top:0;">General</div>
    <div class="card card-pad mb-16">
      <div class="field" style="margin-bottom:0;">
        <label>Nombre de la empresa / instalación</label>
        <input type="text" id="company-name" value="${escapeHtml(state.companyName)}" />
      </div>
    </div>

    <div class="section-title">Apariencia</div>
    <div class="card card-pad mb-16">
      <div class="settings-row">
        <div>
          <div class="settings-row-label">Tema</div>
          <div class="settings-row-sub">Claro, oscuro o según el sistema</div>
        </div>
        <select id="theme-select" style="width:auto;">
          <option value="system" ${state.theme === "system" ? "selected" : ""}>Sistema</option>
          <option value="light" ${state.theme === "light" ? "selected" : ""}>Claro</option>
          <option value="dark" ${state.theme === "dark" ? "selected" : ""}>Oscuro</option>
        </select>
      </div>
    </div>

    <div class="section-title">Equipos / Sistemas (Usado en)</div>
    <div class="card card-pad mb-16" id="equipment-card">
      ${editableList(state.equipmentList, { addLabel: "Agregar equipo" })}
    </div>

    <div class="section-title">Categorías</div>
    <div class="card card-pad mb-16" id="category-card">
      ${editableList(state.categories, { addLabel: "Agregar categoría" })}
    </div>

    <div class="section-title">Datos</div>
    <div class="card card-pad mb-16">
      <div class="settings-row">
        <div>
          <div class="settings-row-label">Restablecer todos los datos</div>
          <div class="settings-row-sub">Elimina todos los repuestos, historial y ajustes. No se puede deshacer.</div>
        </div>
        <button class="btn btn-danger" id="btn-reset">${icon("trash", { size: 15 })} Restablecer</button>
      </div>
    </div>

    <button class="btn btn-primary btn-block" id="btn-save-general">${icon("check", { size: 16 })} Guardar cambios</button>

    <div class="text-sm faint" style="text-align:center;margin:18px 0 24px;">
      Spare Part Inventory v${APP_VERSION} · <a href="#/help">Guía de uso</a>
    </div>
  `;

  root.querySelector("#theme-select").addEventListener("change", async (e) => {
    await setTheme(e.target.value);
    showToast("Tema actualizado", { type: "success" });
  });

  function wireListCard(cardEl) {
    function reIndex() {
      [...cardEl.querySelectorAll(".list-editable-row")].forEach((row, i) => (row.dataset.index = i));
    }
    cardEl.addEventListener("click", (e) => {
      const row = e.target.closest(".list-editable-row");
      if (e.target.closest("[data-add-item]")) {
        const container = cardEl.querySelector(".list-editable");
        const div = document.createElement("div");
        div.className = "list-editable-row";
        div.innerHTML = `
          <input type="text" value="" data-edit placeholder="Nuevo…" />
          <button type="button" class="icon-btn btn-sm" data-move-up>${icon("chevronDown", { size: 16, className: "rotate-180" })}</button>
          <button type="button" class="icon-btn btn-sm" data-move-down>${icon("chevronDown", { size: 16 })}</button>
          <button type="button" class="icon-btn btn-sm" data-remove>${icon("trash", { size: 16 })}</button>
        `;
        container.appendChild(div);
        reIndex();
        div.querySelector("input").focus();
        return;
      }
      if (!row) return;
      if (e.target.closest("[data-move-up]")) {
        const prev = row.previousElementSibling;
        if (prev) row.parentElement.insertBefore(row, prev);
        reIndex();
      } else if (e.target.closest("[data-move-down]")) {
        const next = row.nextElementSibling;
        if (next) row.parentElement.insertBefore(next, row);
        reIndex();
      } else if (e.target.closest("[data-remove]")) {
        row.remove();
        reIndex();
      }
    });
  }

  wireListCard(root.querySelector("#equipment-card"));
  wireListCard(root.querySelector("#category-card"));

  root.querySelector("#btn-reset").addEventListener("click", async () => {
    const ok = await confirmModal({
      title: "Restablecer datos",
      message: "Esto eliminará permanentemente todos los repuestos, historial y configuraciones. ¿Continuar?",
      confirmLabel: "Sí, restablecer todo",
      danger: true,
    });
    if (!ok) return;
    await resetAllData();
    showToast("Datos restablecidos", { type: "success" });
    render(root);
  });

  root.querySelector("#btn-save-general").addEventListener("click", async () => {
    const companyName = root.querySelector("#company-name").value.trim() || "Spare Part Inventory";
    if (companyName !== state.companyName) {
      await setCompanyName(companyName);
      setTopbarCompanyName(companyName);
    }

    const newEquipment = [...root.querySelectorAll("#equipment-card [data-edit]")]
      .map((i) => i.value.trim())
      .filter(Boolean);
    const oldEquipment = state.equipmentList;
    // Detect simple renames by matching original index when count is unchanged.
    if (newEquipment.length === oldEquipment.length) {
      for (let i = 0; i < oldEquipment.length; i++) {
        if (oldEquipment[i] !== newEquipment[i] && !oldEquipment.includes(newEquipment[i])) {
          await renameEquipmentEverywhere(oldEquipment[i], newEquipment[i]);
        }
      }
    }
    const removedEquipment = oldEquipment.filter((e) => !newEquipment.includes(e));
    for (const removed of removedEquipment) {
      const stillReferenced = newEquipment.length === oldEquipment.length; // renamed, not removed
      if (!stillReferenced) await removeEquipmentEverywhere(removed);
    }
    await setEquipmentList(newEquipment);

    const newCategories = [...root.querySelectorAll("#category-card [data-edit]")]
      .map((i) => i.value.trim())
      .filter(Boolean);
    const oldCategories = state.categories;
    if (newCategories.length === oldCategories.length) {
      for (let i = 0; i < oldCategories.length; i++) {
        if (oldCategories[i] !== newCategories[i] && !oldCategories.includes(newCategories[i])) {
          await renameCategoryEverywhere(oldCategories[i], newCategories[i]);
        }
      }
    } else {
      const removedCategories = oldCategories.filter((c) => !newCategories.includes(c));
      for (const removed of removedCategories) await removeCategoryEverywhere(removed);
    }
    await setCategories(newCategories);

    showToast("Ajustes guardados", { type: "success" });
    render(root);
  });
}
