export type OfferPolicyEnrichmentStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Minimal shape for contract-policy label enrichment on offer cards. */
export interface OfferPolicyEnrichable {
  contractPolicyId: string;
  assetDisplayName: string;
  /** Card header label; set to ODRL assigner (same as in Mis políticas). */
  providerLabel: string;
  policySummary: string;
  policyEnrichmentStatus?: OfferPolicyEnrichmentStatus;
}
