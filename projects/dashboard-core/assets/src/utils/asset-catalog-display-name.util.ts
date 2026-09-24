/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

import { resolveAssetEntityId } from '@eclipse-edc/dashboard-core';
import type { Asset } from '@think-it-labs/edc-connector-client';

const EDC_NS = 'https://w3id.org/edc/v0.0.1/ns/';

function readJsonLdValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const normalized = readJsonLdValue(entry);
      if (normalized) {
        return normalized;
      }
    }
    return undefined;
  }
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const scalar = record['@value'];
  if (typeof scalar === 'string') {
    return scalar;
  }

  const identifier = record['@id'];
  if (typeof identifier === 'string') {
    return identifier;
  }

  return undefined;
}

function readFirstObject(value: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(value)) {
    const first = value[0];
    return first && typeof first === 'object' ? (first as Record<string, unknown>) : undefined;
  }
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

function getPropertyValue(asset: Asset, key: string): string | undefined {
  const properties = asset.properties as {
    optionalValue?: <T>(ns: string, prop: string) => T | undefined;
  };

  if (typeof properties?.optionalValue === 'function') {
    const fromOptional = properties.optionalValue<string>('edc', key);
    if (fromOptional) {
      return fromOptional;
    }
  }

  const propertiesRecord = asset.properties as Record<string, unknown> | undefined;
  const direct = readJsonLdValue(propertiesRecord?.[key]);
  if (direct) {
    return direct;
  }

  const expandedKey = `${EDC_NS}${key}`;
  const expanded = readJsonLdValue(propertiesRecord?.[expandedKey]);
  if (expanded) {
    return expanded;
  }

  const expandedProperties = readFirstObject((asset as Record<string, unknown>)[`${EDC_NS}properties`]);
  return readJsonLdValue(expandedProperties?.[expandedKey] ?? expandedProperties?.[key]);
}

function getDataAddressValue(asset: Asset, key: string): string | undefined {
  const dataAddress = asset.dataAddress as {
    optionalValue?: <T>(ns: string, prop: string) => T | undefined;
  };

  if (typeof dataAddress?.optionalValue === 'function') {
    const fromOptional = dataAddress.optionalValue<string>('edc', key);
    if (fromOptional) {
      return fromOptional;
    }
  }

  const dataAddressRecord = asset.dataAddress as Record<string, unknown> | undefined;
  const direct = readJsonLdValue(dataAddressRecord?.[key]);
  if (direct) {
    return direct;
  }

  const expandedKey = `${EDC_NS}${key}`;
  const expanded = readJsonLdValue(dataAddressRecord?.[expandedKey]);
  if (expanded) {
    return expanded;
  }

  const expandedDataAddress = readFirstObject((asset as Record<string, unknown>)[`${EDC_NS}dataAddress`]);
  return readJsonLdValue(expandedDataAddress?.[expandedKey] ?? expandedDataAddress?.[key]);
}

function getObjectName(asset: Asset): string | undefined {
  return getDataAddressValue(asset, 'objectName');
}

/** Same id resolution order as `AssetViewComponent.getAssetId` (for fallback when `resolveAssetEntityId` is empty). */
function getConnectorAssetId(asset: Asset): string {
  const directId = typeof asset.id === 'string' ? asset.id.trim() : '';
  if (directId.length > 0) {
    return directId;
  }

  const jsonLdId = readJsonLdValue((asset as Record<string, unknown>)['@id'])?.trim();
  if (jsonLdId && jsonLdId.length > 0) {
    return jsonLdId;
  }

  const propertyId = getPropertyValue(asset, 'id')?.trim();
  if (propertyId && propertyId.length > 0) {
    return propertyId;
  }

  const fallbackName = getPropertyValue(asset, 'name')?.trim();
  if (fallbackName && fallbackName.length > 0) {
    return fallbackName;
  }

  return 'unknown-asset';
}

function normalizeAssetLookupKey(id: string): string {
  return id.trim().toLowerCase();
}

/** Stable key for matching `ContractAgreement.assetId` to catalog rows. */
export function connectorAssetLookupKey(asset: Asset): string {
  const fromEntity = resolveAssetEntityId(asset)?.trim();
  if (fromEntity && fromEntity.length > 0) {
    return normalizeAssetLookupKey(fromEntity);
  }
  return normalizeAssetLookupKey(getConnectorAssetId(asset));
}

/**
 * Human-readable catalog title aligned with `AssetViewComponent.toTableRow` name priority.
 */
export function resolveAssetCatalogDisplayName(asset: Asset): string {
  const normalizedId = getConnectorAssetId(asset);
  const objectName = getObjectName(asset);
  return (
    getPropertyValue(asset, 'assetTitle') ??
    getPropertyValue(asset, 'simpl:name') ??
    getPropertyValue(asset, 'name') ??
    objectName ??
    normalizedId
  );
}

/**
 * Map normalized asset id → display name for negotiation / agreement views.
 */
export function buildAssetDisplayNameLookup(assets: readonly Asset[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const asset of assets) {
    const key = connectorAssetLookupKey(asset);
    if (!key) {
      continue;
    }
    const display = resolveAssetCatalogDisplayName(asset).trim() || key;
    map.set(key, display);
  }
  return map;
}
