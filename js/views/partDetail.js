import * as db from "../db.js";
import { state } from "../state.js";
import { icon } from "../utils/icons.js";
import { escapeHtml, formatDate, fileToResizedDataURL } from "../utils/helpers.js";
import { navigate } from "../router.js";
import { showToast } from "../components/toast.js";
import { confirmModal } from "../components/modal.js";

export async function render(root, { params, query }) {
  const isNew = !params.id;
  const copyId = isNew && query ? query.get("copy") : null;

  let part = {
    partNumber: "", description: "", manufacturer: "", modelSerial: "",
    qty: 0, reorderQty: 0, leadTimeDays: 0, usedIn: [], equivalentPN: "",
    storageLocationId: "", category: "", notes: "", photo: "",
  };
  if (!isNew) {
    part = await db.getPart(params.id);
  } else if (copyId) {
    const src = await db.getPart(copyId);
    if (src) {
      const { id, createdAt, updatedAt, ...rest } = src;
      part = { ...rest, partNumber: "" };
    }
  }

  if (!part) {
    root.innerHTML = `<div class="empty-state"><div class="empty-title">Repuesto no encontrado</div></div>`;
    return;
  }

  const history = isNew ? [] : await db.getHistoryForPart(params.id);
  let photoData = part.photo || "";

  root.innerHTML = `
    <div class="flex items-center gap-8" style="margin-bottom:14px;">
      <button class="btn btn-ghost btn-sm" id="btn-back">${icon("chevronRight", { size: 15, className: "rotate-180" })} Volver</button>
      ${!isNew ? `<button class="btn btn-ghost btn-sm" id="btn-duplicate">${icon("copy", { size: 15 })} Duplicar</button>` : ""}
      ${copyId ? `<span class="pill pill-neutral">Copia — asigna un nuevo N° de parte</span>` : ""}
    </div>

    <form id="part-form">
      <div class="card card-pad mb-16">
        <div class="section-title" style="margin-top:0;">Información general</div>
        <div class="form-grid cols-2">
          <div class="field">
            <label>Número de parte *</label>
            <input type="text" name="partNumber" required value="${escapeHtml(part.partNumber)}" placeholder="ej. 32ZP74" />
          </div>
          <div class="field">
            <label>Categoría</label>
            <select name="category">
              <option value="">— Sin categoría —</option>
              ${state.categories.map((c) => `<option value="${escapeHtml(c)}" ${part.category === c ? "selected" : ""}>${escapeHtml(c)}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="field">
          <label>Descripción</label>
          <textarea name="description" placeholder="Descripción completa del repuesto">${escapeHtml(part.description)}</textarea>
        </div>
        <div class="form-grid cols-2">
          <div class="field">
            <label>Fabricante</label>
            <input type="text" name="manufacturer" value="${escapeHtml(part.manufacturer)}" placeholder="ej. TB WOODS" />
          </div>
          <div class="field">
            <label>Modelo / Número de serie</label>
            <input type="text" name="modelSerial" value="${escapeHtml(part.modelSerial)}" />
          </div>
        </div>
      </div>

      <div class="card card-pad mb-16">
        <div class="section-title" style="margin-top:0;">Foto</div>
        <div id="photo-area"></div>
        <input type="file" id="photo-input" accept="image/*" style="display:none;" />
      </div>

      <div class="card card-pad mb-16">
        <div class="section-title" style="margin-top:0;">Existencias</div>
        <div class="form-grid cols-2">
          <div class="field">
            <label>Cantidad actual</label>
            <div class="qty-input-row">
              <button type="button" class="btn" data-qty-delta="-1" aria-label="Restar 1">${icon("minus", { size: 15 })}</button>
              <input type="number" name="qty" min="0" step="1" value="${part.qty}" />
              <button type="button" class="btn" data-qty-delta="1" aria-label="Sumar 1">${icon("plus", { size: 15 })}</button>
            </div>
          </div>
          <div class="field">
            <label>Cantidad mínima (reorden)</label>
            <input type="number" name="reorderQty" min="0" step="1" value="${part.reorderQty}" />
          </div>
        </div>
        <div class="form-grid cols-2">
          <div class="field">
            <label>Tiempo de entrega (días)</label>
            <input type="number" name="leadTimeDays" min="0" step="1" value="${part.leadTimeDays}" />
          </div>
          <div class="field">
            <label>Ubicación de almacenamiento</label>
            <input type="text" name="storageLocationId" value="${escapeHtml(part.storageLocationId)}" placeholder="ej. Estante A-3" />
          </div>
        </div>
        ${!isNew ? `<div class="field"><label>Nota de ajuste (opcional, se guarda en el historial)</label><input type="text" name="historyNote" placeholder="ej. Consumido en mantenimiento" /></div>` : ""}
      </div>

      <div class="card card-pad mb-16">
        <div class="section-title" style="margin-top:0;">Usado en</div>
        <div class="checkbox-grid" id="used-in-grid">
          ${state.equipmentList
            .map(
              (eq) => `
            <label class="check-item ${part.usedIn.includes(eq) ? "checked" : ""}">
              <input type="checkbox" name="usedIn" value="${escapeHtml(eq)}" ${part.usedIn.includes(eq) ? "checked" : ""} />
              <span>${escapeHtml(eq)}</span>
            </label>
          `
            )
            .join("")}
        </div>
      </div>

      <div class="card card-pad mb-16">
        <div class="section-title" style="margin-top:0;">Proveedor / equivalentes</div>
        <div class="field">
          <label>P/N equivalentes y contacto de proveedor</label>
          <textarea name="equivalentPN" placeholder="ej. Proveedor XYZ, tel. 555-1234, P/N alterno ABC123">${escapeHtml(part.equivalentPN)}</textarea>
        </div>
      </div>

      <div class="card card-pad mb-16">
        <div class="section-title" style="margin-top:0;">Notas internas</div>
        <div class="field">
          <textarea name="notes" placeholder="Notas internas">${escapeHtml(part.notes)}</textarea>
        </div>
      </div>

      ${
        !isNew && history.length
          ? `
      <div class="card card-pad mb-16">
        <div class="section-title" style="margin-top:0;">Historial de cantidad</div>
        <div id="history-list">
          ${history
            .slice(0, 20)
            .map(
              (h) => `
            <div class="history-item">
              <span>${formatDate(h.timestamp)} · ${escapeHtml(h.note || "")}</span>
              <span style="font-weight:700;color:${h.delta >= 0 ? "var(--success)" : "var(--danger)"}">${h.delta >= 0 ? "+" : ""}${h.delta} (${h.oldQty} → ${h.newQty})</span>
            </div>
          `
            )
            .join("")}
        </div>
      </div>`
          : ""
      }

      <div class="flex gap-8" style="padding-bottom:8px;">
        <button type="submit" class="btn btn-primary grow">${icon("check", { size: 16 })} ${isNew ? "Crear repuesto" : "Guardar cambios"}</button>
        ${!isNew ? `<button type="button" class="btn btn-danger" id="btn-delete">${icon("trash", { size: 16 })}</button>` : ""}
      </div>
    </form>
  `;

  root.querySelector("#btn-back").addEventListener("click", () => navigate("/parts"));

  const duplicateBtn = root.querySelector("#btn-duplicate");
  if (duplicateBtn) {
    duplicateBtn.addEventListener("click", () => navigate(`/parts/new?copy=${params.id}`));
  }

  // --- Photo handling ---
  const photoArea = root.querySelector("#photo-area");
  const photoInput = root.querySelector("#photo-input");
  function renderPhotoArea() {
    if (photoData) {
      photoArea.innerHTML = `
        <img class="part-photo-preview" src="${photoData}" alt="Foto del repuesto" />
        <div class="flex gap-8" style="margin-top:10px;">
          <button type="button" class="btn btn-sm" id="btn-photo-replace">${icon("camera", { size: 15 })} Reemplazar</button>
          <button type="button" class="btn btn-sm btn-danger" id="btn-photo-remove">${icon("trash", { size: 15 })} Quitar</button>
        </div>
      `;
      photoArea.querySelector("#btn-photo-replace").addEventListener("click", () => photoInput.click());
      photoArea.querySelector("#btn-photo-remove").addEventListener("click", () => {
        photoData = "";
        renderPhotoArea();
      });
    } else {
      photoArea.innerHTML = `
        <button type="button" class="file-drop w-full" id="btn-photo-add" style="border-style:dashed;">
          ${icon("camera", { size: 28 })}
          <div><strong>Agregar foto</strong></div>
          <div class="text-sm faint">Cámara o galería · se guarda en el dispositivo</div>
        </button>
      `;
      photoArea.querySelector("#btn-photo-add").addEventListener("click", () => photoInput.click());
    }
  }
  photoInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      photoData = await fileToResizedDataURL(file);
      renderPhotoArea();
    } catch (err) {
      showToast(err.message, { type: "error" });
    } finally {
      e.target.value = "";
    }
  });
  renderPhotoArea();

  // --- Qty steppers (adjust the input; history is written on save) ---
  const qtyInput = root.querySelector('input[name="qty"]');
  root.querySelectorAll("[data-qty-delta]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = Math.max(0, (Number(qtyInput.value) || 0) + Number(btn.dataset.qtyDelta));
      qtyInput.value = next;
    });
  });

  root.querySelectorAll("#used-in-grid .check-item").forEach((label) => {
    const input = label.querySelector("input");
    input.addEventListener("change", () => label.classList.toggle("checked", input.checked));
  });

  const form = root.querySelector("#part-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = {
      partNumber: fd.get("partNumber"),
      description: fd.get("description"),
      manufacturer: fd.get("manufacturer"),
      modelSerial: fd.get("modelSerial"),
      qty: Number(fd.get("qty") || 0),
      reorderQty: Number(fd.get("reorderQty") || 0),
      leadTimeDays: Number(fd.get("leadTimeDays") || 0),
      usedIn: fd.getAll("usedIn"),
      equivalentPN: fd.get("equivalentPN"),
      storageLocationId: fd.get("storageLocationId"),
      category: fd.get("category"),
      notes: fd.get("notes"),
      photo: photoData,
      historyNote: fd.get("historyNote") || "",
    };
    if (!payload.partNumber.trim()) {
      showToast("El número de parte es obligatorio", { type: "error" });
      return;
    }
    try {
      if (isNew) {
        const id = await db.addPart(payload);
        showToast("Repuesto creado", { type: "success" });
        navigate(`/parts/${id}`);
      } else {
        await db.updatePart(params.id, payload);
        showToast("Cambios guardados", { type: "success" });
        render(root, { params, query });
      }
    } catch (err) {
      if (String(err).includes("Constraint")) {
        showToast("Ya existe un repuesto con ese número de parte", { type: "error" });
      } else {
        showToast("Error al guardar: " + err.message, { type: "error" });
      }
    }
  });

  const deleteBtn = root.querySelector("#btn-delete");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      const ok = await confirmModal({
        title: "Eliminar repuesto",
        message: `¿Eliminar "${escapeHtml(part.partNumber)}"?`,
        confirmLabel: "Eliminar",
        danger: true,
      });
      if (!ok) return;
      const partSnapshot = { ...part };
      const historySnapshot = history.map((h) => ({ ...h }));
      await db.deletePart(params.id);
      navigate("/parts");
      showToast("Repuesto eliminado", {
        type: "success",
        actionLabel: "Deshacer",
        onAction: async () => {
          try {
            await db.restorePart(partSnapshot, historySnapshot);
            showToast("Repuesto restaurado", { type: "success" });
            navigate(`/parts/${partSnapshot.id}`);
          } catch (err) {
            showToast("No se pudo restaurar: " + err.message, { type: "error" });
          }
        },
      });
    });
  }
}
