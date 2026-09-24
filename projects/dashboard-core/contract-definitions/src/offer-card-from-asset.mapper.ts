/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

import type { Asset, ContractDefinition } from '@think-it-labs/edc-connector-client';
import { getAssetSdId, stripCuriePrefix } from '@eclipse-edc/dashboard-core';
import {
  extractCreatedAtRawFromAsset,
  readAssetPropertyString,
  resolveAssetCatalogDisplayName,
} from '@eclipse-edc/dashboard-core/assets';
import { OFFER_CARD_DEFAULTS } from './contract-definitions-ui.constants';
import { normalizeContractDefinition, type OfferCardViewModel } from './offer-card-view-model';

const EDC_NS_ID = 'https://w3id.org/edc/v0.0.1/ns/id';

interface SelectorCriterion {
  operandLeft: string;
  operator: string;
  operandRight: string;
}

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

function publishedAtIso(asset: Asset): string {
  const raw = extractCreatedAtRawFromAsset(asset);
  if (raw === undefined) {
    return 'Unknown date';
  }
  const parsed = typeof raw === 'number' ? new Date(raw) : new Date(String(raw).trim());
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown date';
  }
  return parsed.toISOString();
}

export function readIsFreeOffering(asset: Asset): boolean {
  const isFreeFlag = readAssetPropertyString(asset, 'offer.isFree');
  if (isFreeFlag === 'true') {
    return true;
  }
  if (isFreeFlag === 'false') {
    return false;
  }
  const price = readAssetPropertyString(asset, 'simpl:price');
  if (price && price.length > 0) {
    const parsed = Number.parseFloat(price);
    return !Number.isNaN(parsed) && parsed === 0;
  }
  return false;
}

export function readIsPublicOffering(asset: Asset): boolean {
  return readAssetPropertyString(asset, 'offer.isPublic') === 'true';
}

function buildPriceLabel(asset: Asset): string {
  if (readIsFreeOffering(asset)) {
    return 'Gratuito';
  }
  const price = readAssetPropertyString(asset, 'simpl:price');
  if (price && price.length > 0) {
    return `${price} € + IVA`;
  }
  return OFFER_CARD_DEFAULTS.priceLabel;
}

function statusBadgeFromOffer(asset: Asset): string {
  return readIsPublicOffering(asset) ? 'Cat. Público' : 'Cat. No público';
}

export function readAssetTypeKey(asset: Asset): string {
  return formatAssetTypeSubtitle(readAssetPropertyString(asset, 'assetType'));
}

function formatAssetTypeSubtitle(raw: string | undefined): string {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return OFFER_CARD_DEFAULTS.subtitle;
  }
  return stripCuriePrefix(trimmed).toLowerCase();
}

function stubContractDefinitionFromAsset(asset: Asset): ContractDefinition {
  const id = getAssetEntityId(asset);
  const raw = {
    id,
    accessPolicyId: readRootString(asset, 'accessPolicyId') ?? '',
    contractPolicyId: readRootString(asset, 'contractPolicyId') ?? '',
    assetsSelector: {
      operandLeft: EDC_NS_ID,
      operator: '=',
      operandRight: id,
    },
  };
  return normalizeContractDefinition(raw as unknown as ContractDefinition);
}

/**
 * Builds Mis ofertas cards from cached connector assets (properties + top-level policy ids).
 * @param connectorName Active EDC config `connectorName` shown on each card header.
 */
export function buildOfferCardViewModelsFromAssets(
  assets: readonly Asset[],
  connectorName: string | undefined,
): OfferCardViewModel[] {
  const providerLabel = connectorName?.trim() || OFFER_CARD_DEFAULTS.providerLabel;

  return assets.map(asset => {
    const contractDefinition = stubContractDefinitionFromAsset(asset);
    const entityId = getAssetEntityId(asset);
    const accessPolicyId = readRootString(asset, 'accessPolicyId') ?? '';
    const contractPolicyId = readRootString(asset, 'contractPolicyId') ?? '';
    const offerSelfDescriptionId = getAssetSdId(asset);

    const title =
      readAssetPropertyString(asset, 'offer.offer_name') ??
      readAssetPropertyString(asset, 'assetTitle') ??
      readAssetPropertyString(asset, 'simpl:name') ??
      readAssetPropertyString(asset, 'name') ??
      entityId;

    const assetTypeKey = readAssetTypeKey(asset);
    const subtitle =
      assetTypeKey === OFFER_CARD_DEFAULTS.subtitle.toLowerCase() ? OFFER_CARD_DEFAULTS.subtitle : assetTypeKey;

    const description =
      readAssetPropertyString(asset, 'assetDescription') ??
      readAssetPropertyString(asset, 'offer.offerDescription') ??
      readAssetPropertyString(asset, 'simpl:description') ??
      OFFER_CARD_DEFAULTS.description;

    const assetDisplayName = resolveAssetCatalogDisplayName(asset).trim() || entityId;

    return {
      contractDefinition,
      id: entityId,
      accessPolicyId,
      contractPolicyId,
      assetsSelector: contractDefinition.assetsSelector as SelectorCriterion[],
      offerSelfDescriptionId,
      title,
      providerLabel,
      subtitle,
      description,
      publishedAt: publishedAtIso(asset),
      assetDisplayName,
      policySummary: '',
      policyEnrichmentStatus: contractPolicyId.length > 0 ? 'idle' : 'ready',
      priceLabel: buildPriceLabel(asset),
      statusBadge: statusBadgeFromOffer(asset),
      keywords: [],
      license: { title: '', spdx: '', url: readAssetPropertyString(asset, 'simpl:license') ?? '' },
      assetTypeKey,
      isPublicOffering: readIsPublicOffering(asset),
      isFreeOffering: readIsFreeOffering(asset),
    };
  });
}
