import { Injectable, inject } from '@angular/core';
import type { Asset, QuerySpec } from '@think-it-labs/edc-connector-client';
import { EdcClientService } from '../services/edc-client.service';
import { RawEndpointCacheService } from '../services/raw-endpoint-cache.service';
import { getAssetSdId } from '../services/sd-matched-assets-warmup.util';

const ASSETS_CACHE_KEY = 'assets/request' as const;
const PAGE_LIMIT = 50;

type AssetQuerySpec = QuerySpec & { '@type': 'QuerySpec' };

/** Normaliza un id de self-description para comparar (el catálogo federado no garantiza la caja). */
export function normalizeSelfDescriptionId(selfDescriptionId: string): string {
  return selfDescriptionId.trim().toLowerCase();
}

/**
 * Identifica las ofertas publicadas por el propio conector.
 *
 * Un conector híbrido actúa de proveedor y de consumidor a la vez, así que sus propias
 * self-descriptions salen en las búsquedas del catálogo federado; contratarlas falla. Para
 * reconocerlas se cruza el id de SD de cada resultado con el de los assets del conector:
 * `getAssetSdId` resuelve el mismo identificador (`sdId` / `offer.offerID`) que el catálogo
 * publica como `claimsGraphUri`, que es el `selfDescriptionId` de la búsqueda.
 *
 * Lee la caché `assets/request`, la misma que alimenta Mis ofertas, pero solo la lee: si está
 * vacía consulta el conector sin volcar el resultado en ella. Esa caché la reescribe el warmup con
 * el subconjunto de assets emparejados con una SD, y escribirla aquí con la lista completa dejaría
 * Mis ofertas mostrando assets que no publican ninguna oferta.
 *
 * Cualquiera de los dos contenidos sirve igual —ambos son assets de este conector—, y que la
 * instantánea esté caducada tampoco importa: como mucho una oferta recién publicada no se
 * reconoce como propia todavía.
 */
@Injectable({
  providedIn: 'root',
})
export class OwnOfferSelfDescriptionsService {
  private readonly edc = inject(EdcClientService);
  private readonly rawCache = inject(RawEndpointCacheService);

  private inflight?: Promise<ReadonlySet<string>>;

  /**
   * Ids de self-description publicadas por este conector, normalizados.
   *
   * No memoriza el resultado —así una oferta recién publicada aparece como propia sin recargar—,
   * solo agrupa las llamadas concurrentes; de no repetir peticiones al conector ya se encarga la
   * caché `assets/request`, con su propio TTL.
   *
   * Nunca lanza: si los assets no se pueden leer devuelve un conjunto vacío. Un fallo aquí debe
   * dejar la oferta contratable, y que el error de negociación lo explique, antes que bloquear el
   * catálogo entero.
   */
  async getOwnSelfDescriptionIds(): Promise<ReadonlySet<string>> {
    this.inflight ??= this.loadOwnSelfDescriptionIds().finally(() => {
      this.inflight = undefined;
    });
    return this.inflight;
  }

  private async loadOwnSelfDescriptionIds(): Promise<ReadonlySet<string>> {
    try {
      const snapshot = await this.rawCache.getSnapshotOrLoadFromIdb<Asset>(ASSETS_CACHE_KEY);
      const assets = snapshot?.data ?? (await this.fetchAllAssetsPages());
      return collectOwnSelfDescriptionIds(assets);
    } catch (error: unknown) {
      console.warn('[OwnOfferSelfDescriptionsService] Could not resolve own offers', error);
      return new Set<string>();
    }
  }

  private async fetchAllAssetsPages(): Promise<Asset[]> {
    const client = await this.edc.getClient();
    const all: Asset[] = [];
    let offset = 0;

    for (;;) {
      const spec: AssetQuerySpec = {
        '@type': 'QuerySpec',
        offset,
        limit: PAGE_LIMIT,
      };
      const page = await client.management.assets.queryAll(spec);
      all.push(...page);
      if (page.length < PAGE_LIMIT) {
        break;
      }
      offset += PAGE_LIMIT;
    }

    return all;
  }
}

/** Ids de SD (normalizados) de los assets que publican una oferta. */
export function collectOwnSelfDescriptionIds(assets: readonly Asset[]): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const asset of assets) {
    const sdId = getAssetSdId(asset);
    if (sdId && sdId.trim().length > 0) {
      ids.add(normalizeSelfDescriptionId(sdId));
    }
  }
  return ids;
}

/** `true` si esa self-description la publicó este conector. */
export function isOwnSelfDescription(
  ownSelfDescriptionIds: ReadonlySet<string>,
  selfDescriptionId: string | undefined,
): boolean {
  const normalized = selfDescriptionId ? normalizeSelfDescriptionId(selfDescriptionId) : '';
  return normalized.length > 0 && ownSelfDescriptionIds.has(normalized);
}
