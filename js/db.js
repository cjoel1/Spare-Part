// IndexedDB data access layer — no external dependencies.
const DB_NAME = "sparepart-db";
const DB_VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      if (!db.objectStoreNames.contains("parts")) {
        const parts = db.createObjectStore("parts", { keyPath: "id", autoIncrement: true });
        parts.createIndex("partNumber", "partNumber", { unique: true });
        parts.createIndex("category", "category", { unique: false });
        parts.createIndex("manufacturer", "manufacturer", { unique: false });
      }
      if (!db.objectStoreNames.contains("history")) {
        const history = db.createObjectStore("history", { keyPath: "id", autoIncrement: true });
        history.createIndex("partId", "partId", { unique: false });
      }
      if (!db.objectStoreNames.contains("kv")) {
        db.createObjectStore("kv", { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(storeNames, mode, fn) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(storeNames, mode);
        const stores = Array.isArray(storeNames)
          ? storeNames.map((n) => t.objectStore(n))
          : t.objectStore(storeNames);
        let result;
        Promise.resolve(fn(stores, t))
          .then((r) => {
            result = r;
          })
          .catch(reject);
        t.oncomplete = () => resolve(result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error || new Error("Transaction aborted"));
      })
  );
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ---------------- Parts ----------------

export function getAllParts() {
  return tx("parts", "readonly", (store) => reqToPromise(store.getAll()));
}

export function getPart(id) {
  return tx("parts", "readonly", (store) => reqToPromise(store.get(Number(id))));
}

export function getPartByNumber(partNumber) {
  return tx("parts", "readonly", (store) => {
    const idx = store.index("partNumber");
    return reqToPromise(idx.get(partNumber));
  });
}

function normalizePart(p) {
  return {
    partNumber: (p.partNumber || "").trim(),
    description: (p.description || "").trim(),
    manufacturer: (p.manufacturer || "").trim(),
    modelSerial: (p.modelSerial || "").trim(),
    qty: Number.isFinite(+p.qty) ? +p.qty : 0,
    reorderQty: Number.isFinite(+p.reorderQty) ? +p.reorderQty : 0,
    leadTimeDays: Number.isFinite(+p.leadTimeDays) ? +p.leadTimeDays : 0,
    usedIn: Array.isArray(p.usedIn) ? p.usedIn : [],
    equivalentPN: (p.equivalentPN || "").trim(),
    storageLocationId: (p.storageLocationId || "").trim(),
    category: (p.category || "").trim(),
    notes: (p.notes || "").trim(),
    photo: typeof p.photo === "string" ? p.photo : "",
  };
}

export async function addPart(partData) {
  const now = Date.now();
  const part = { ...normalizePart(partData), createdAt: now, updatedAt: now };
  const id = await tx("parts", "readwrite", (store) => reqToPromise(store.add(part)));
  if (part.qty) {
    await addHistory({ partId: id, timestamp: now, oldQty: 0, newQty: part.qty, delta: part.qty, note: "Creación de repuesto" });
  }
  return id;
}

export async function updatePart(id, partData) {
  return tx(["parts", "history"], "readwrite", async (stores) => {
    const [partsStore, historyStore] = stores;
    const existing = await reqToPromise(partsStore.get(Number(id)));
    if (!existing) throw new Error("Repuesto no encontrado");
    const normalized = normalizePart(partData);
    const updated = { ...existing, ...normalized, id: existing.id, updatedAt: Date.now() };
    if (normalized.qty !== existing.qty) {
      historyStore.add({
        partId: existing.id,
        timestamp: Date.now(),
        oldQty: existing.qty,
        newQty: normalized.qty,
        delta: normalized.qty - existing.qty,
        note: partData.historyNote || "Ajuste manual",
      });
    }
    await reqToPromise(partsStore.put(updated));
    return updated;
  });
}

// Atomic +/- stock adjustment with automatic history entry. Clamps at 0.
export function adjustQty(id, delta, note = "Ajuste rápido") {
  return tx(["parts", "history"], "readwrite", async (stores) => {
    const [partsStore, historyStore] = stores;
    const part = await reqToPromise(partsStore.get(Number(id)));
    if (!part) throw new Error("Repuesto no encontrado");
    const newQty = Math.max(0, Number(part.qty) + delta);
    if (newQty === part.qty) return part;
    historyStore.add({
      partId: part.id,
      timestamp: Date.now(),
      oldQty: part.qty,
      newQty,
      delta: newQty - part.qty,
      note,
    });
    const updated = { ...part, qty: newQty, updatedAt: Date.now() };
    await reqToPromise(partsStore.put(updated));
    return updated;
  });
}

// Re-inserts a previously deleted part (same id) with its history — powers "undo delete".
export function restorePart(part, historyRows = []) {
  return tx(["parts", "history"], "readwrite", async (stores) => {
    const [partsStore, historyStore] = stores;
    await reqToPromise(partsStore.add(part));
    for (const h of historyRows) {
      const { id, ...rest } = h;
      historyStore.add(rest);
    }
  });
}

export function deletePart(id) {
  return tx(["parts", "history"], "readwrite", async (stores) => {
    const [partsStore, historyStore] = stores;
    await reqToPromise(partsStore.delete(Number(id)));
    const idx = historyStore.index("partId");
    const range = IDBKeyRange.only(Number(id));
    await new Promise((resolve, reject) => {
      const cursorReq = idx.openCursor(range);
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else resolve();
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    });
  });
}

// Upsert by partNumber — used by Excel/JSON import. Returns {created, updated}.
export async function upsertPartsBulk(partsData) {
  let created = 0;
  let updated = 0;
  await tx(["parts", "history"], "readwrite", async (stores) => {
    const [partsStore, historyStore] = stores;
    const idx = partsStore.index("partNumber");
    for (const raw of partsData) {
      const normalized = normalizePart(raw);
      if (!normalized.partNumber) continue;
      const existing = await reqToPromise(idx.get(normalized.partNumber));
      const now = Date.now();
      if (existing) {
        const merged = { ...existing, ...normalized, id: existing.id, updatedAt: now };
        if (normalized.qty !== existing.qty) {
          historyStore.add({
            partId: existing.id,
            timestamp: now,
            oldQty: existing.qty,
            newQty: normalized.qty,
            delta: normalized.qty - existing.qty,
            note: "Importación",
          });
        }
        await reqToPromise(partsStore.put(merged));
        updated++;
      } else {
        const part = { ...normalized, createdAt: now, updatedAt: now };
        const id = await reqToPromise(partsStore.add(part));
        if (part.qty) {
          historyStore.add({ partId: id, timestamp: now, oldQty: 0, newQty: part.qty, delta: part.qty, note: "Importación" });
        }
        created++;
      }
    }
  });
  return { created, updated };
}

export function countParts() {
  return tx("parts", "readonly", (store) => reqToPromise(store.count()));
}

// ---------------- History ----------------

export function addHistory(entry) {
  return tx("history", "readwrite", (store) => reqToPromise(store.add(entry)));
}

export function getRecentHistory(limit = 10) {
  return tx("history", "readonly", (store) => reqToPromise(store.getAll())).then((rows) =>
    rows.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit)
  );
}

export function getHistoryForPart(partId) {
  return tx("history", "readonly", (store) => {
    const idx = store.index("partId");
    return reqToPromise(idx.getAll(Number(partId)));
  }).then((rows) => rows.sort((a, b) => b.timestamp - a.timestamp));
}

// ---------------- Key/Value (settings) ----------------

export async function getKV(key, fallback) {
  const row = await tx("kv", "readonly", (store) => reqToPromise(store.get(key)));
  return row ? row.value : fallback;
}

export function setKV(key, value) {
  return tx("kv", "readwrite", (store) => reqToPromise(store.put({ key, value })));
}

// ---------------- Reset ----------------

export function clearAllData() {
  return tx(["parts", "history", "kv"], "readwrite", async (stores) => {
    for (const s of stores) await reqToPromise(s.clear());
  });
}

export async function exportAllData() {
  const [parts, history] = await Promise.all([
    getAllParts(),
    tx("history", "readonly", (store) => reqToPromise(store.getAll())),
  ]);
  const equipmentList = await getKV("equipmentList", []);
  const categories = await getKV("categories", []);
  const companyName = await getKV("companyName", "");
  return {
    exportedAt: new Date().toISOString(),
    version: DB_VERSION,
    companyName,
    equipmentList,
    categories,
    parts,
    history,
  };
}

export async function importAllData(data, { replace = false } = {}) {
  if (replace) await clearAllData();
  if (data.equipmentList) await setKV("equipmentList", data.equipmentList);
  if (data.categories) await setKV("categories", data.categories);
  if (data.companyName) await setKV("companyName", data.companyName);
  if (Array.isArray(data.parts) && data.parts.length) {
    if (replace) {
      await tx("parts", "readwrite", async (store) => {
        for (const p of data.parts) {
          const { id, ...rest } = p;
          await reqToPromise(store.add({ ...rest, id }));
        }
      });
    } else {
      await upsertPartsBulk(data.parts);
    }
  }
}
