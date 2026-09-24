/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

import type { Asset } from '@think-it-labs/edc-connector-client';
import { buildMockAssetFromVerifiableCredential } from './mock-asset-from-offer-credential.util';

export const MOCK_OFFER_RESOURCE_URLS = [
  '/resources/corpus.json',
  '/resources/mlmodel.json',
  '/resources/api.json',
  '/resources/lexicalconceptualresource.json',
] as const;

let loadPromise: Promise<void> | undefined;
let assets: Asset[] = [];
const selfDescriptionByOfferId = new Map<string, Record<string, unknown>>();

function normalizeOfferId(offerId: string): string {
  const trimmed = offerId.trim();
  if (!trimmed) {
    return '';
  }
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

function indexCredential(vc: Record<string, unknown>): void {
  const subject = vc['credentialSubject'];
  if (typeof subject !== 'object' || subject === null || Array.isArray(subject)) {
    return;
  }
  const offerId = (subject as Record<string, unknown>)['@id'];
  if (typeof offerId === 'string' && offerId.trim().length > 0) {
    selfDescriptionByOfferId.set(offerId.trim(), vc);
  }
}

async function fetchCredential(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load mock offer resource ${url}: ${response.status}`);
  }
  return (await response.json()) as Record<string, unknown>;
}

/** Loads all `/resources/*.json` mock offer fixtures once. */
export function ensureMockOfferResourcesLoaded(): Promise<void> {
  if (!loadPromise) {
    loadPromise = (async () => {
      const loaded = await Promise.all(MOCK_OFFER_RESOURCE_URLS.map(fetchCredential));
      assets = loaded.map(buildMockAssetFromVerifiableCredential);
      selfDescriptionByOfferId.clear();
      for (const vc of loaded) {
        indexCredential(vc);
      }
    })();
  }
  return loadPromise;
}

/** Resets cached fixtures (for unit tests). */
export function resetMockOfferResourcesForTests(): void {
  loadPromise = undefined;
  assets = [];
  selfDescriptionByOfferId.clear();
}

/** Registers inline fixtures without HTTP (for unit tests). */
export function registerMockOfferCredentialsForTests(vcs: Record<string, unknown>[]): void {
  loadPromise = Promise.resolve();
  assets = vcs.map(buildMockAssetFromVerifiableCredential);
  selfDescriptionByOfferId.clear();
  for (const vc of vcs) {
    indexCredential(vc);
  }
}

export function getMockOfferAssetsFromRegistry(): Asset[] {
  return assets;
}

export function getMockSelfDescriptionFromRegistry(offerId: string): Record<string, unknown> | undefined {
  const normalized = normalizeOfferId(offerId);
  if (!normalized) {
    return undefined;
  }
  const hit = selfDescriptionByOfferId.get(normalized);
  return hit ? { ...hit } : undefined;
}
