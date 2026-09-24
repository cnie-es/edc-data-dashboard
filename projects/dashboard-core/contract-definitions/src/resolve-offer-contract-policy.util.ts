import type { Asset } from '@think-it-labs/edc-connector-client';
import { getAssetSdId } from '@eclipse-edc/dashboard-core';
import { readAssetPropertyString, resolveAssetCatalogDisplayName } from '@eclipse-edc/dashboard-core/assets';

function readRootString(asset: Asset, key: string): string | undefined {
  const v = (asset as Record<string, unknown>)[key];
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;
}

function getAssetEntityId(asset: Asset): string {
  const direct = typeof asset.id === 'string' ? asset.id.trim() : '';
  if (direct.length > 0) {
    return direct;
  }
  const atId = (asset as Record<string, unknown>)['@id'];
  if (typeof atId === 'string' && atId.length > 0) {
    return atId;
  }
  const propId = readAssetPropertyString(asset, 'id');
  if (propId) {
    return propId;
  }
  return 'unknown-asset';
}

export interface OfferContractPolicyContext {
  contractPolicyId: string;
  accessPolicyId: string;
  assetDisplayName: string;
}

export function resolveOfferContractPolicyFromAssets(
  assets: readonly Asset[],
  offerId: string,
): OfferContractPolicyContext | undefined {
  const normalizedOfferId = offerId.trim();
  if (!normalizedOfferId) {
    return undefined;
  }

  for (const asset of assets) {
    const offerSdId = getAssetSdId(asset) ?? readAssetPropertyString(asset, 'offer.offerID');
    if (!offerSdId || offerSdId.trim() !== normalizedOfferId) {
      continue;
    }
    const contractPolicyId = readRootString(asset, 'contractPolicyId') ?? '';
    const accessPolicyId = readRootString(asset, 'accessPolicyId') ?? '';
    const assetDisplayName = resolveAssetCatalogDisplayName(asset).trim() || getAssetEntityId(asset);
    return { contractPolicyId, accessPolicyId, assetDisplayName };
  }

  return undefined;
}
