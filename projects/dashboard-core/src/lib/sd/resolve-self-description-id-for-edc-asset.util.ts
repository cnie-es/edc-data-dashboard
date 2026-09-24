import type { Asset } from '@think-it-labs/edc-connector-client';
import { getAssetSdId, resolveAssetEntityId } from '../services/sd-matched-assets-warmup.util';

function normalizeAssetLookupKey(id: string): string {
  return id.trim().toLowerCase();
}

/** Finds an EDC management asset by agreement/catalog asset id. */
export function findEdcAssetByConnectorId(assets: readonly Asset[], edcAssetId: string): Asset | undefined {
  const key = normalizeAssetLookupKey(edcAssetId);
  if (!key) {
    return undefined;
  }
  for (const asset of assets) {
    const entityId = resolveAssetEntityId(asset);
    if (entityId && normalizeAssetLookupKey(entityId) === key) {
      return asset;
    }
    const directId = typeof asset.id === 'string' ? asset.id.trim() : '';
    if (directId && normalizeAssetLookupKey(directId) === key) {
      return asset;
    }
    const jsonLdId = (asset as Record<string, unknown>)['@id'];
    if (typeof jsonLdId === 'string' && normalizeAssetLookupKey(jsonLdId) === key) {
      return asset;
    }
  }
  return undefined;
}

/** Same SD id resolution as Mis activos “Ver” (asset properties, not catalog search). */
export function resolveSelfDescriptionIdFromEdcAssets(
  edcAssetId: string,
  assets: readonly Asset[] | undefined,
): string | undefined {
  if (!assets?.length) {
    return undefined;
  }
  const asset = findEdcAssetByConnectorId(assets, edcAssetId);
  if (!asset) {
    return undefined;
  }
  const sdId = getAssetSdId(asset)?.trim();
  return sdId && sdId.length > 0 ? sdId : undefined;
}

/**
 * Resolves self-description id: EDC asset properties first, then optional catalog fallback.
 */
export async function resolveSelfDescriptionIdForEdcAsset(
  edcAssetId: string,
  loadAssets: () => Promise<readonly Asset[] | undefined>,
  catalogFallback?: () => Promise<string | undefined>,
): Promise<string | undefined> {
  const assetId = edcAssetId?.trim();
  if (!assetId) {
    return catalogFallback ? catalogFallback() : undefined;
  }

  try {
    const assets = await loadAssets();
    const fromEdc = resolveSelfDescriptionIdFromEdcAssets(assetId, assets);
    if (fromEdc) {
      return fromEdc;
    }
  } catch {
    /* try catalog fallback */
  }

  if (catalogFallback) {
    const fromCatalog = await catalogFallback();
    const trimmed = fromCatalog?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return undefined;
}
