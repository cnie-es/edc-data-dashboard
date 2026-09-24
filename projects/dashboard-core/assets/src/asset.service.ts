import { Injectable, inject } from '@angular/core';
import { EdcClientService, RawEndpointCacheService, type RawCacheSnapshot } from '@eclipse-edc/dashboard-core';
import type { Asset } from '@think-it-labs/edc-connector-client';

@Injectable({ providedIn: 'root' })
export class AssetService {
  private static readonly ASSETS_CACHE_KEY = 'assets/request' as const;
  private readonly edc = inject(EdcClientService);
  private readonly rawCache = inject(RawEndpointCacheService);

  /**
   * Recupera todos los assets mediante paginación completa.
   * @param pageSize Tamaño de página (por defecto 1000).
   * @returns Array completo de assets.
   */
  private async fetchAllAssets(pageSize = 1000): Promise<Asset[]> {
    const client = await this.edc.getClient();
    const allAssets: Asset[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const page = await client.management.assets.queryAll({ offset, limit: pageSize });
      if (page.length === 0) {
        break;
      }
      allAssets.push(...page);
      offset += page.length;
      // Si la página devuelve menos de lo solicitado, asumimos que es la última.
      if (page.length < pageSize) {
        hasMore = false;
      }
    }
    return allAssets;
  }

  /**
   * Obtiene todos los assets (sin caché).
   */
  public async getAllAssets(): Promise<Asset[]> {
    return this.fetchAllAssets();
  }

  /**
   * Obtiene los assets desde la caché si es válida, o los recupera y cachea.
   */
  public async getCachedOrFetchAssets(): Promise<readonly Asset[]> {
    return this.rawCache.getOrFetch<Asset>(AssetService.ASSETS_CACHE_KEY, async () => this.fetchAllAssets());
  }

  /**
   * Fuerza la actualización de la caché de assets.
   */
  public async refreshAssetsCache(): Promise<readonly Asset[]> {
    return this.rawCache.forceRefresh<Asset>(AssetService.ASSETS_CACHE_KEY, async () => this.fetchAllAssets());
  }

  /**
   * Devuelve la instantánea de la caché si existe.
   */
  public getAssetsCacheSnapshot(): readonly Asset[] | undefined {
    return this.rawCache.getSnapshot<Asset>(AssetService.ASSETS_CACHE_KEY)?.data;
  }

  /**
   * Lee la caché desde memoria o IndexedDB (sin llamar al conector).
   */
  public async getAssetsCacheSnapshotOrLoad(): Promise<RawCacheSnapshot<Asset> | undefined> {
    return this.rawCache.getSnapshotOrLoadFromIdb<Asset>(AssetService.ASSETS_CACHE_KEY);
  }

  /**
   * Elimina un asset por ID.
   */
  public async deleteAsset(id: string): Promise<void> {
    return (await this.edc.getClient()).management.assets.delete(id);
  }
}
