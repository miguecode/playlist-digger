import { fmtNumber, timeAgo } from './format';
import { fold } from './text';

/** Resumen de una playlist guardada. El CSV completo se guarda aparte (ver más abajo). */
export interface HistoryEntry {
  readonly id: string;
  readonly name: string;
  /** Cuándo se guardó (ms desde 1970). */
  readonly savedAt: number;
  readonly tracks: number;
  readonly durationMs: number;
}

/** Cuántas playlists se recuerdan: al pasar el límite se descartan las más viejas. */
export const HISTORY_MAX = 20;
/** Un CSV más grande que esto se abre igual, pero no se guarda (20 playlists así serían demasiado). */
export const HISTORY_MAX_CSV_CHARS = 8_000_000;

/** Misma playlist = mismo nombre (sin importar mayúsculas ni tildes): al volver a cargarla se actualiza. */
export function historyId(name: string): string {
  return fold(name).replace(/\s+/g, ' ').trim() || 'playlist';
}

/** Decide qué queda en el historial al guardar `entry`: las más nuevas primero, hasta `max`. */
export function planSave(
  existing: readonly HistoryEntry[],
  entry: HistoryEntry,
  max: number = HISTORY_MAX,
): { kept: HistoryEntry[]; evicted: string[] } {
  const others = existing.filter((e) => e.id !== entry.id);
  const all = [entry, ...others].sort((a, b) => b.savedAt - a.savedAt);
  const kept = all.slice(0, max);
  const keptIds = new Set(kept.map((e) => e.id));
  return { kept, evicted: others.filter((e) => !keptIds.has(e.id)).map((e) => e.id) };
}

/** «193 canciones · hace 2 días». */
export function historySummary(entry: HistoryEntry, now: number = Date.now()): string {
  const noun = entry.tracks === 1 ? 'canción' : 'canciones';
  return `${fmtNumber(entry.tracks)} ${noun} · ${timeAgo(entry.savedAt, now)}`;
}

// ───────────────────────── Almacenamiento (IndexedDB) ─────────────────────────
// Un CSV puede pesar varios MB: localStorage (≈5 MB en total) no alcanza, IndexedDB sí.
// Todo queda en este navegador; nada se envía a ningún servidor.

const DB_NAME = 'playlist-viewer';
const META = 'meta';
const CSV = 'csv';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Este navegador no ofrece almacenamiento local.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(META, { keyPath: 'id' });
      request.result.createObjectStore(CSV);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir el almacenamiento local.'));
  });
  // Si falló, la próxima vez se vuelve a intentar.
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

const finished = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Falló la operación.'));
    tx.onabort = () => reject(tx.error ?? new Error('Se canceló la operación.'));
  });

const result = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Falló la lectura.'));
  });

function isEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== 'object') return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.name === 'string' &&
    typeof e.savedAt === 'number' &&
    typeof e.tracks === 'number' &&
    typeof e.durationMs === 'number'
  );
}

/** Playlists guardadas, de la más nueva a la más vieja. Si el navegador no deja, devuelve una lista vacía. */
export async function listHistory(): Promise<HistoryEntry[]> {
  try {
    const db = await openDb();
    const all = await result(db.transaction(META).objectStore(META).getAll());
    return all.filter(isEntry).sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

/** Guarda (o actualiza) una playlist. Lanza un error si el navegador no lo permite o no hay lugar. */
export async function saveToHistory(entry: HistoryEntry, csv: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([META, CSV], 'readwrite');
  const metas = tx.objectStore(META);
  const csvs = tx.objectStore(CSV);
  const all = metas.getAll();
  all.onsuccess = () => {
    const { evicted } = planSave((all.result as unknown[]).filter(isEntry), entry);
    metas.put(entry);
    csvs.put(csv, entry.id);
    for (const id of evicted) {
      metas.delete(id);
      csvs.delete(id);
    }
  };
  await finished(tx);
}

/** CSV completo de una playlist guardada, o null si ya no está. */
export async function loadHistoryCsv(id: string): Promise<string | null> {
  try {
    const db = await openDb();
    const text = await result(db.transaction(CSV).objectStore(CSV).get(id));
    return typeof text === 'string' ? text : null;
  } catch {
    return null;
  }
}

export async function removeFromHistory(id: string): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction([META, CSV], 'readwrite');
    tx.objectStore(META).delete(id);
    tx.objectStore(CSV).delete(id);
    await finished(tx);
  } catch {
    /* si no se pudo borrar, la lista se vuelve a leer y se verá que sigue ahí */
  }
}

export async function clearHistory(): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction([META, CSV], 'readwrite');
    tx.objectStore(META).clear();
    tx.objectStore(CSV).clear();
    await finished(tx);
  } catch {
    /* ídem */
  }
}
