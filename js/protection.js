// Data-protection layer: persistent storage, backup reminders, and an on-device
// error log so field issues can be diagnosed without a backend.
import { getKV, setKV, exportAllData, countParts } from "./db.js";
import { downloadJSON } from "./utils/helpers.js";
import { showToast } from "./components/toast.js";

const ERROR_LOG_KEY = "errorLog";
const LAST_BACKUP_KEY = "lastBackupAt";
const BACKUP_REMINDER_DAYS = 7;

// ---- Error log (capped ring buffer in IndexedDB) ----
export async function logError(kind, message, extra) {
  try {
    const log = (await getKV(ERROR_LOG_KEY, [])) || [];
    log.unshift({ t: Date.now(), kind, message: String(message).slice(0, 500), extra: extra ? String(extra).slice(0, 300) : "" });
    await setKV(ERROR_LOG_KEY, log.slice(0, 50));
  } catch {
    // Never let logging throw.
  }
}

export function getErrorLog() {
  return getKV(ERROR_LOG_KEY, []);
}

export function clearErrorLog() {
  return setKV(ERROR_LOG_KEY, []);
}

export async function markBackupDone() {
  await setKV(LAST_BACKUP_KEY, Date.now());
}

export async function getLastBackup() {
  return getKV(LAST_BACKUP_KEY, null);
}

// ---- One-tap backup used by the reminder and Settings ----
export async function runBackup() {
  const data = await exportAllData();
  downloadJSON(data, `spareparts-backup-${new Date().toISOString().slice(0, 10)}.json`);
  await markBackupDone();
}

export async function initDataProtection() {
  // 1. Ask the browser to not evict our data (best-effort, no prompt on most).
  try {
    if (navigator.storage && navigator.storage.persist) {
      const already = await navigator.storage.persisted?.();
      if (!already) await navigator.storage.persist();
    }
  } catch {
    /* ignore */
  }

  // 2. Global error capture → on-device log.
  window.addEventListener("error", (e) => {
    logError("error", e.message, e.filename ? `${e.filename}:${e.lineno}` : "");
  });
  window.addEventListener("unhandledrejection", (e) => {
    logError("promise", e.reason?.message || e.reason || "unhandledrejection");
  });

  // 3. Backup reminder if data exists and it's been a while.
  try {
    const count = await countParts();
    if (count > 0) {
      const last = await getLastBackup();
      const stale = !last || Date.now() - last > BACKUP_REMINDER_DAYS * 86400000;
      if (stale) {
        setTimeout(() => {
          showToast("Respalda tu inventario para no perder datos", {
            type: "default",
            duration: 9000,
            actionLabel: "Respaldar",
            onAction: async () => {
              try {
                await runBackup();
                showToast("Respaldo descargado", { type: "success" });
              } catch (err) {
                showToast("Error al respaldar: " + err.message, { type: "error" });
              }
            },
          });
        }, 2500);
      }
    }
  } catch {
    /* ignore */
  }
}
