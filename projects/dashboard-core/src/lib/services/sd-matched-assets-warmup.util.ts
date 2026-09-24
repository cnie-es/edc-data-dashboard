/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

import type { Asset } from '@think-it-labs/edc-connector-client';
import { readAssetPropertyString } from '../utils/asset-property-string.util';

export { readAssetPropertyString };

/**
 * Offer identity used to match SD `claimsGraphUri` (sdId first, then offer.offerID / offer.offer_id).
 */
export function resolveOfferClaimUriFromAsset(asset: Asset): string | undefined {
  const sdId = readAssetPropertyString(asset, 'sdId');
  if (sdId) {
    return sdId;
  }
  const offerId = readAssetPropertyString(asset, 'offer.offerID');
  if (offerId) {
    return offerId;
  }
  const offerIdAlt = readAssetPropertyString(asset, 'offer.offer_id');
  if (offerIdAlt) {
    return offerIdAlt;
  }
  return undefined;
}

/** Counts assets for which {@link resolveOfferClaimUriFromAsset} returns a value. */
export function countAssetsWithResolvableOfferUri(assets: readonly Asset[]): number {
  let count = 0;
  for (const asset of assets) {
    if (resolveOfferClaimUriFromAsset(asset)) {
      count += 1;
    }
  }
  return count;
}

/** Stable DID used by `dashboardMocksEnabled` warmup mock payloads (SD item + asset share this value). */
export const SD_MATCHED_ASSETS_MOCK_CLAIMS_URI = 'did:web:registry.gaia-x.eu:DataOffering:mock-matched-sd-sync';

/** Deterministic policy ids paired with `createMockMatchedAssetsForCache` (no connector call in mock mode). */
export const SD_MATCHED_ASSETS_MOCK_ACCESS_POLICY_ID = 'bca4da62-0e9a-47db-a45e-c8964de72aaa';
export const SD_MATCHED_ASSETS_MOCK_CONTRACT_POLICY_ID = '46382ed4-2ee3-4aa2-aed0-c43363b01b25';

export interface AssetSelectorCriterion {
  operandLeft: string;
  operator: string;
  operandRight: string;
}

export interface ContractPolicyIds {
  accessPolicyId: string;
  contractPolicyId: string;
}

export interface ClaimsGraphItem {
  n?: { claimsGraphUri?: string[] };
}

export function collectClaimsGraphUris(items: readonly ClaimsGraphItem[]): Set<string> {
  const s = new Set<string>();
  for (const item of items) {
    for (const uri of item.n?.claimsGraphUri ?? []) {
      if (typeof uri === 'string' && uri.trim().length > 0) {
        s.add(uri.trim());
      }
    }
  }
  return s;
}

export function getAssetSdId(asset: Asset): string | undefined {
  return resolveOfferClaimUriFromAsset(asset);
}

export function assetMatchesClaims(asset: Asset, claims: ReadonlySet<string>): boolean {
  const offerUri = resolveOfferClaimUriFromAsset(asset);
  return !!offerUri && claims.has(offerUri);
}

/** Resolves EDC asset id (`id` then `@id` on the asset JSON-LD object). */
export function resolveAssetEntityId(asset: Asset): string | undefined {
  const entity = asset as Record<string, unknown>;
  const directId = entity['id'];
  if (typeof directId === 'string' && directId.length > 0) {
    return directId;
  }
  const jsonLdId = entity['@id'];
  if (typeof jsonLdId === 'string' && jsonLdId.length > 0) {
    return jsonLdId;
  }
  return undefined;
}

function isAssetSelectorCriterion(x: unknown): x is AssetSelectorCriterion {
  if (!x || typeof x !== 'object') {
    return false;
  }
  const o = x as Record<string, unknown>;
  return (
    typeof o['operandLeft'] === 'string' && typeof o['operator'] === 'string' && typeof o['operandRight'] === 'string'
  );
}

/** Normalizes `assetsSelector` to a flat list (single criterion vs array). */
export function normalizeAssetsSelector(contractDefinition: unknown): AssetSelectorCriterion[] {
  const raw = (contractDefinition as Record<string, unknown>)['assetsSelector'];
  if (Array.isArray(raw)) {
    return raw.filter(isAssetSelectorCriterion);
  }
  if (isAssetSelectorCriterion(raw)) {
    return [raw];
  }
  return [];
}

/**
 * Asset id targeted by the contract definition’s id criterion (`operandLeft` is `id` or ends with `/id`, `operator` is `=`).
 */
export function getContractDefinitionTargetAssetId(contractDefinition: unknown): string | undefined {
  const selectors = normalizeAssetsSelector(contractDefinition);
  const criterion = selectors.find(
    s => (s.operandLeft === 'id' || s.operandLeft.endsWith('/id')) && s.operator === '=',
  );
  const right = criterion?.operandRight;
  return typeof right === 'string' ? right.trim() : undefined;
}

export function readContractPolicyIds(contractDefinition: unknown): ContractPolicyIds | undefined {
  const o = contractDefinition as Record<string, unknown>;
  const a = o['accessPolicyId'];
  const c = o['contractPolicyId'];
  if (typeof a === 'string' && a.trim().length > 0 && typeof c === 'string' && c.trim().length > 0) {
    return { accessPolicyId: a.trim(), contractPolicyId: c.trim() };
  }
  return undefined;
}

/**
 * First matching contract definition per asset id wins (stable); later definitions for the same asset are ignored.
 */
export function mergeContractDefinitionPageIntoPolicyMap(
  definitions: readonly unknown[],
  matchedIds: ReadonlySet<string>,
  policyByAssetId: Map<string, ContractPolicyIds>,
): void {
  for (const def of definitions) {
    const assetId = getContractDefinitionTargetAssetId(def);
    if (!assetId || !matchedIds.has(assetId)) {
      continue;
    }
    if (policyByAssetId.has(assetId)) {
      continue;
    }
    const policies = readContractPolicyIds(def);
    if (policies) {
      policyByAssetId.set(assetId, policies);
    }
  }
}

export function mergeContractPolicyIdsOntoAsset(asset: Asset, policyIds: ContractPolicyIds | undefined): Asset {
  if (!policyIds) {
    return asset;
  }
  return {
    ...(asset as object),
    accessPolicyId: policyIds.accessPolicyId,
    contractPolicyId: policyIds.contractPolicyId,
  } as unknown as Asset;
}

export function enrichMatchedAssetsWithContractPolicies(
  matched: readonly Asset[],
  policyByAssetId: ReadonlyMap<string, ContractPolicyIds>,
): Asset[] {
  return matched.map(asset => {
    const id = resolveAssetEntityId(asset);
    const policies = id ? policyByAssetId.get(id) : undefined;
    return mergeContractPolicyIdsOntoAsset(asset, policies);
  });
}

export function createMockMatchedAssetsForCache(): Asset[] {
  const uri = SD_MATCHED_ASSETS_MOCK_CLAIMS_URI;
  return [
    {
      '@id': 'a2e7b491-e771-4396-857c-a13198aaf672',
      '@type': 'https://w3id.org/edc/v0.0.1/ns/Asset',
      accessPolicyId: SD_MATCHED_ASSETS_MOCK_ACCESS_POLICY_ID,
      contractPolicyId: SD_MATCHED_ASSETS_MOCK_CONTRACT_POLICY_ID,
      properties: {
        id: 'a2e7b491-e771-4396-857c-a13198aaf672',
        assetTitle: 'Mock matched asset (dashboardMocksEnabled)',
        'offer.priceType': 'free',
        sdId: uri,
        templateId: '5',
        createdAt: '2026-05-13T09:23:20.288567228Z',
        'offer.offerDescription': 'Deterministic mock asset for SD–connector matching warmup (offer description).',
        assetDescription: 'Deterministic mock asset for SD–connector matching warmup.',
        assetTypeId: 'ms:Corpus',
        'simpl:name': 'Mock matched asset',
        'simpl:description': 'Deterministic mock asset for SD–connector matching warmup.',
        'simpl:priceType': 'free',
        'offer.currency': 'EUR',
        'offer.price': '0',
        'offer.offerID': uri,
        'offer.isPublic': 'true',
        'offer.isFree': 'true',
        assetType: 'ms:Corpus',
        'offer.offer_name': 'Mock matched asset (dashboardMocksEnabled)',
        'offer.license': 'https://raw.githubusercontent.com/apache/.github/main/LICENSE',
        'simpl:price': '0',
      },
      dataAddress: {
        '@type': 'DataAddress',
        proxyPath: 'false',
        type: 'HttpData',
        baseUrl: 'https://jsonplaceholder.typicode.com/todos/1',
      },
      '@context': {
        '@vocab': 'https://w3id.org/edc/v0.0.1/ns/',
        edc: 'https://w3id.org/edc/v0.0.1/ns/',
        odrl: 'http://www.w3.org/ns/odrl/2/',
      },
    } as unknown as Asset,
  ];
}
