/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

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

/**
 * Reads a string property from an EDC asset (optionalValue, plain key, expanded edc IRI, or JSON-LD value).
 * Safe to use on assets restored from IndexedDB where `optionalValue` is no longer present.
 */
export function readAssetPropertyString(asset: Asset, key: string): string | undefined {
  const properties = asset.properties as {
    optionalValue?: <T>(ns: string, prop: string) => T | undefined;
  };

  if (typeof properties?.optionalValue === 'function') {
    const fromOptional = properties.optionalValue<string>('edc', key);
    if (fromOptional?.trim()) {
      return fromOptional.trim();
    }
  }

  const propertiesRecord = asset.properties as Record<string, unknown> | undefined;
  const direct = readJsonLdValue(propertiesRecord?.[key]);
  if (direct?.trim()) {
    return direct.trim();
  }

  const expandedKey = `${EDC_NS}${key}`;
  const expanded = readJsonLdValue(propertiesRecord?.[expandedKey]);
  if (expanded?.trim()) {
    return expanded.trim();
  }

  const expandedProperties = readFirstObject((asset as Record<string, unknown>)[`${EDC_NS}properties`]);
  const fromExpandedProps = readJsonLdValue(expandedProperties?.[expandedKey] ?? expandedProperties?.[key]);
  if (fromExpandedProps?.trim()) {
    return fromExpandedProps.trim();
  }

  return undefined;
}
