const DB_NAME = 'DashboardRawEndpointCache';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';

let dbPromise: Promise<IDBDatabase> | undefined;

/** Shape persisted in IndexedDB (per cache key). */
export interface IdbRawCacheRecord {
  readonly data: readonly unknown[];
  readonly fetchedAt: number;
  readonly expiresAt: number;
  readonly isRefreshing: boolean;
}

function parseIdbRawCacheRecord(value: unknown): IdbRawCacheRecord | undefined {
  if (value === null || typeof value !== 'object') {
    return undefined;
  }
  const rec = value as Record<string, unknown>;
  const data = rec['data'];
  if (!Array.isArray(data)) {
    return undefined;
  }
  const fetchedAt = rec['fetchedAt'];
  const expiresAt = rec['expiresAt'];
  if (typeof fetchedAt !== 'number' || !Number.isFinite(fetchedAt)) {
    return undefined;
  }
  if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) {
    return undefined;
  }
  const isRefreshing = rec['isRefreshing'];
  if (isRefreshing !== undefined && typeof isRefreshing !== 'boolean') {
    return undefined;
  }
  return {
    data,
    fetchedAt,
    expiresAt,
    isRefreshing: Boolean(isRefreshing),
  };
}

function openDb(): Promise<IDBDatabase> | undefined {
  if (typeof indexedDB === 'undefined') {
    return undefined;
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => {
        dbPromise = undefined;
        reject(req.error ?? new Error('IndexedDB open failed'));
      };
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  }
  return dbPromise;
}

/**
 * Runs one IDB request; resolves with `request.result` or `undefined` if IndexedDB is unavailable or the request fails.
 */
function runSingleRequest(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<unknown> {
  const dbP = openDb();
  if (!dbP) {
    return Promise.resolve(undefined);
  }
  return dbP
    .then(
      db =>
        new Promise<unknown>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, mode);
          const store = tx.objectStore(STORE_NAME);
          const request = run(store);
          request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
          request.onsuccess = () => resolve(request.result);
        }),
    )
    .catch(() => undefined);
}

export async function idbGetRawSnapshotRecord(storageKey: string): Promise<IdbRawCacheRecord | undefined> {
  const raw = await runSingleRequest('readonly', store => store.get(storageKey));
  if (raw === undefined || raw === null) {
    return undefined;
  }
  const parsed = parseIdbRawCacheRecord(raw);
  if (!parsed) {
    await idbDeleteRawSnapshotRecord(storageKey);
    return undefined;
  }
  return parsed;
}

export async function idbPutRawSnapshotRecord(storageKey: string, record: IdbRawCacheRecord): Promise<void> {
  await runSingleRequest('readwrite', store => store.put(record, storageKey));
}

export async function idbDeleteRawSnapshotRecord(storageKey: string): Promise<void> {
  await runSingleRequest('readwrite', store => store.delete(storageKey));
}

/** Resets the singleton connection; use in tests between cases. */
export async function deleteRawEndpointCacheDatabaseForTests(): Promise<void> {
  if (typeof indexedDB === 'undefined') {
    dbPromise = undefined;
    return;
  }
  if (dbPromise) {
    try {
      const db = await dbPromise;
      db.close();
    } catch {
      /* ignore */
    }
  }
  dbPromise = undefined;
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error('deleteDatabase failed'));
    req.onblocked = () => resolve();
  });
}
