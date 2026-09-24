/**
 * SD Tooling resource descriptions API (v1) — shared types and helpers (no Angular DI).
 */

/** Query fields for GET `resourceDescriptions` (SD Tooling v1; use with `HttpParams.fromObject`). */
export function createResourceDescriptionsRequestParams(orderBy = 'publicationDate'): Record<string, string> {
  return { orderBy };
}

export interface SdResourceDescriptionNode {
  claimsGraphUri?: string[];
  offeringType?: string;
  name?: string;
  description?: string;
  inLanguage?: string;
  serviceAccessPoint?: string;
}

export interface SdResourceDescriptionItem {
  n?: SdResourceDescriptionNode;
}

export interface SdResourceDescriptionsResponse {
  totalCount?: number;
  items?: SdResourceDescriptionItem[];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

export function parseSdResourceDescriptionsResponse(response: unknown): SdResourceDescriptionsResponse {
  const rec = asRecord(response);
  if (!rec) {
    return { items: [] };
  }
  const itemsRaw = rec['items'];
  const items = Array.isArray(itemsRaw) ? (itemsRaw as SdResourceDescriptionItem[]) : [];
  const totalCount = typeof rec['totalCount'] === 'number' ? rec['totalCount'] : undefined;
  return { totalCount, items };
}

const DEFAULT_API_ROOT = '/sdtooling-api';
const DEFAULT_API_VERSION = 'v2';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function hasVersionSegment(url: string): boolean {
  return /\/v\d+$/i.test(url);
}

function shouldAppendVersionSegment(url: string): boolean {
  return /\/sdtooling-api$/i.test(url);
}

function resolveApiBaseUrl(configuredBaseUrl: string | undefined): string {
  const defaultApiBaseUrl = `${DEFAULT_API_ROOT}/${DEFAULT_API_VERSION}`;
  if (!configuredBaseUrl) {
    return defaultApiBaseUrl;
  }
  const normalizedBaseUrl = normalizeBaseUrl(configuredBaseUrl);
  if (shouldAppendVersionSegment(normalizedBaseUrl)) {
    return `${normalizedBaseUrl}/${DEFAULT_API_VERSION}`;
  }
  return normalizedBaseUrl;
}

function toFixedApiVersionBase(baseUrl: string, version: string): string {
  const normalizedVersion =
    version
      .trim()
      .replace(/^\/+|\/+$/g, '')
      .toLowerCase() || version;
  const normalizedBase = normalizeBaseUrl(baseUrl);
  if (hasVersionSegment(normalizedBase)) {
    return normalizedBase.replace(/\/v\d+$/i, `/${normalizedVersion}`);
  }
  return `${normalizedBase}/${normalizedVersion}`;
}

/**
 * Resolves SD Tooling HTTP v2 base URL from connector `sdToolingApiBaseUrl`
 * (same rules as `SdToolingService` for schema list and related v2 paths).
 */
export function resolveSdToolingV2BaseUrl(sdToolingApiBaseUrl: string | undefined): string {
  return resolveApiBaseUrl(sdToolingApiBaseUrl?.trim());
}

/** Resolves SD Tooling HTTP v1 base URL from connector `sdToolingApiBaseUrl` (same rules as SdToolingService). */
export function resolveSdToolingV1BaseUrl(sdToolingApiBaseUrl: string | undefined): string {
  const apiBaseUrl = resolveApiBaseUrl(sdToolingApiBaseUrl?.trim());
  return toFixedApiVersionBase(apiBaseUrl, 'v1');
}
