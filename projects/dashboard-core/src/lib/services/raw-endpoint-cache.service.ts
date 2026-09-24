import { Injectable } from '@angular/core';
import {
  type IdbRawCacheRecord,
  idbDeleteRawSnapshotRecord,
  idbGetRawSnapshotRecord,
  idbPutRawSnapshotRecord,
} from './raw-endpoint-cache-idb';

/**
 * Persists raw management API list payloads (memory + IndexedDB).
 * Feature views keep calling direct management queries (e.g. AssetService.getAllAssets, PolicyService.getAllPolicies)
 * until a feature explicitly reads cache; background warmup uses this service directly.
 */
export const CACHE_REFRESH_MS = 10 * 60 * 1000;
const CACHE_STORAGE_PREFIX = 'dashboard_raw_endpoint_cache';

export type CacheCollectionKey = 'assets/request' | 'policydefinitions/request';

export interface RawCacheSnapshot<T> {
  readonly data: readonly T[];
  readonly fetchedAt: number;
  readonly expiresAt: number;
  readonly isRefreshing: boolean;
}

interface MutableRawCacheSnapshot<T> {
  data: readonly T[];
  fetchedAt: number;
  expiresAt: number;
  isRefreshing: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class RawEndpointCacheService {
  private readonly cache = new Map<string, MutableRawCacheSnapshot<unknown>>();
  private readonly knownCollectionKeys: readonly CacheCollectionKey[] = ['assets/request', 'policydefinitions/request'];
  private namespace = 'anonymous';

  public setNamespace(namespace: string): void {
    const normalized = namespace.trim();
    this.namespace = normalized.length > 0 ? normalized : 'anonymous';
    void this.hydrateKnownCollectionsFromIdb();
  }

  public getNamespace(): string {
    return this.namespace;
  }

  /**
   * Returns a snapshot from memory only. After navigation or reload, prefer `getOrFetch` (or wait for
   * namespace hydration) before data from IndexedDB is visible here.
   */
  public getSnapshot<T>(collection: CacheCollectionKey): RawCacheSnapshot<T> | undefined {
    const entry = this.cacheEntryForKey<T>(this.buildKey(collection));
    return entry ? this.toReadonlySnapshot(entry) : undefined;
  }

  /**
   * Returns a snapshot from memory or IndexedDB without invoking any backend fetcher.
   * Useful for cache-first pages that should not trigger connector calls on initial load.
   */
  public async getSnapshotOrLoadFromIdb<T>(collection: CacheCollectionKey): Promise<RawCacheSnapshot<T> | undefined> {
    const key = this.buildKey(collection);
    let entry = this.cacheEntryForKey<T>(key);
    if (!entry) {
      entry = await this.loadMutableSnapshotFromIdb<T>(key);
      if (entry) {
        this.cache.set(key, entry);
      }
    }
    return entry ? this.toReadonlySnapshot(entry) : undefined;
  }

  public async getOrFetch<T>(
    collection: CacheCollectionKey,
    fetcher: () => Promise<readonly T[]>,
    refreshMs = CACHE_REFRESH_MS,
  ): Promise<readonly T[]> {
    const key = this.buildKey(collection);
    let entry = this.cacheEntryForKey<T>(key);
    if (!entry) {
      entry = await this.loadMutableSnapshotFromIdb<T>(key);
      if (entry) {
        this.cache.set(key, entry);
      }
    }

    const snapshot = entry ? this.toReadonlySnapshot(entry) : undefined;
    if (snapshot && !this.isExpired(snapshot)) {
      return this.deepClone(snapshot.data);
    }

    return this.forceRefresh(collection, fetcher, refreshMs);
  }

  public async forceRefresh<T>(
    collection: CacheCollectionKey,
    fetcher: () => Promise<readonly T[]>,
    refreshMs = CACHE_REFRESH_MS,
  ): Promise<readonly T[]> {
    const key = this.buildKey(collection);
    await this.markRefreshing(key, true);

    try {
      const fetched = this.deepClone(await fetcher());
      const now = Date.now();
      const snapshot: MutableRawCacheSnapshot<T> = {
        data: fetched,
        fetchedAt: now,
        expiresAt: now + refreshMs,
        isRefreshing: false,
      };
      this.cache.set(key, snapshot);
      await this.persistToIdb(key, snapshot);
      return this.deepClone(snapshot.data);
    } finally {
      await this.markRefreshing(key, false);
    }
  }

  public async clear(collection: CacheCollectionKey): Promise<void> {
    const key = this.buildKey(collection);
    this.cache.delete(key);
    await idbDeleteRawSnapshotRecord(key);
  }

  private async hydrateKnownCollectionsFromIdb(): Promise<void> {
    for (const collection of this.knownCollectionKeys) {
      const key = this.buildKey(collection);
      if (this.cache.has(key)) {
        continue;
      }
      const entry = await this.loadMutableSnapshotFromIdb<unknown>(key);
      if (entry) {
        this.cache.set(key, entry);
      }
    }
  }

  private async markRefreshing(storageKey: string, refreshing: boolean): Promise<void> {
    const existing = this.cache.get(storageKey);
    if (existing) {
      existing.isRefreshing = refreshing;
      this.cache.set(storageKey, existing);
      await this.persistToIdb(storageKey, existing);
    }
  }

  private async loadMutableSnapshotFromIdb<T>(storageKey: string): Promise<MutableRawCacheSnapshot<T> | undefined> {
    const record = await idbGetRawSnapshotRecord(storageKey);
    if (!record) {
      return undefined;
    }
    return this.mutableSnapshotFromIdbRecord(record);
  }

  private mutableSnapshotFromIdbRecord<T>(record: IdbRawCacheRecord): MutableRawCacheSnapshot<T> {
    return {
      data: this.cloneCachedPayload<T>(record.data),
      fetchedAt: record.fetchedAt,
      expiresAt: record.expiresAt,
      isRefreshing: record.isRefreshing,
    };
  }

  /**
   * Restores typed list data from persisted `unknown[]`. Caller supplies `T` for the expected element shape.
   */
  private cloneCachedPayload<T>(payload: readonly unknown[]): readonly T[] {
    return this.deepClone(payload) as readonly T[];
  }

  private async persistToIdb<T>(storageKey: string, snapshot: MutableRawCacheSnapshot<T>): Promise<void> {
    const record: IdbRawCacheRecord = {
      data: snapshot.data,
      fetchedAt: snapshot.fetchedAt,
      expiresAt: snapshot.expiresAt,
      isRefreshing: snapshot.isRefreshing,
    };
    await idbPutRawSnapshotRecord(storageKey, record);
  }

  private cacheEntryForKey<T>(key: string): MutableRawCacheSnapshot<T> | undefined {
    return this.cache.get(key) as MutableRawCacheSnapshot<T> | undefined;
  }

  private toReadonlySnapshot<T>(snapshot: MutableRawCacheSnapshot<T>): RawCacheSnapshot<T> {
    return {
      data: this.deepClone(snapshot.data),
      fetchedAt: snapshot.fetchedAt,
      expiresAt: snapshot.expiresAt,
      isRefreshing: snapshot.isRefreshing,
    };
  }

  private isExpired<T>(snapshot: RawCacheSnapshot<T>): boolean {
    return snapshot.expiresAt <= Date.now();
  }

  private buildKey(collection: CacheCollectionKey): string {
    return `${CACHE_STORAGE_PREFIX}:${this.namespace}:${collection}`;
  }

  private deepClone<T>(value: T): T {
    if (typeof structuredClone === 'function') {
      return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value)) as T;
  }
}
