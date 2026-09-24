/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

import type { Asset } from '@think-it-labs/edc-connector-client';
import { readAssetPropertyString } from './asset-property-string.util';

/**
 * Reads `properties.createdAt` from an EDC asset (edc optionalValue, JSON-LD, or plain string/number).
 */
export function extractCreatedAtRawFromAsset(asset: Asset): string | number | undefined {
  const fromOptional = readAssetPropertyString(asset, 'createdAt');
  if (fromOptional !== undefined && fromOptional.trim().length > 0) {
    return fromOptional;
  }
  const props = asset.properties as Record<string, unknown> | undefined;
  const v = props?.['createdAt'];
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === 'string' && v.trim().length > 0) {
    return v.trim();
  }
  return undefined;
}

/** Epoch ms for sorting by creation date; missing or invalid → `NaN`. */
export function getAssetCreatedAtTimestamp(asset: Asset): number {
  const raw = extractCreatedAtRawFromAsset(asset);
  if (raw === undefined) {
    return NaN;
  }
  const parsed = typeof raw === 'number' ? new Date(raw) : new Date(String(raw).trim());
  return parsed.getTime();
}

/** Spanish-style dd/mm/yyyy for Mis activos / Mis políticas; missing or invalid → `-`. */
export function formatAssetCreatedAtDdMmYyyy(asset: Asset): string {
  const raw = extractCreatedAtRawFromAsset(asset);
  if (raw === undefined) {
    return '-';
  }
  const parsed = typeof raw === 'number' ? new Date(raw) : new Date(String(raw).trim());
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
}
