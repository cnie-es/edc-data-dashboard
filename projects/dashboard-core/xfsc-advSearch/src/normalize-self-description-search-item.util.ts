import type { SDInfo, SDNodeInfo } from './advanced-search.service';

export interface NormalizedSelfDescriptionSearchItem {
  id?: string;
  claimsGraphUri: string[];
  offeringType?: string;
  name: string;
  description: string;
  inLanguage: string;
  serviceAccessPoint?: string;
}

/** OpenAPI may return summary under `n`, `i`, or flat on the item. */
export function normalizeSelfDescriptionSearchItem(item: SDInfo): NormalizedSelfDescriptionSearchItem {
  const raw: SDNodeInfo = (
    'n' in item && item.n
      ? item.n
      : 'i' in item && (item as { i?: SDNodeInfo }).i
        ? (item as { i: SDNodeInfo }).i
        : item
  ) as SDNodeInfo;
  const claimsGraphUri = raw.claimsGraphUri ?? raw.claimsGraphUri0 ?? [];

  return {
    id: raw.id,
    claimsGraphUri,
    offeringType: raw.offeringType,
    name: raw.name ?? '',
    description: raw.description ?? '',
    inLanguage: raw.inLanguage ?? '',
    serviceAccessPoint: raw.serviceAccessPoint,
  };
}

export function selfDescriptionIdFromNormalized(item: NormalizedSelfDescriptionSearchItem): string | undefined {
  return item.claimsGraphUri[0]?.trim() || undefined;
}
