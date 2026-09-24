import type { ContractAgreement, ContractNegotiation } from '@think-it-labs/edc-connector-client';

export type NegotiationEnrichmentStatus = 'idle' | 'loading' | 'done' | 'error';

export interface NegotiationRow {
  negotiationId: string;
  contractAgreementId?: string;
  counterPartyId: string;
  state: string;
  createdAt: number;
  type?: string;

  displayName: string;
  selfDescriptionId?: string;
  assetId?: string;

  enrichmentStatus: NegotiationEnrichmentStatus;

  /** Compact negotiation for modals / transfer. */
  negotiation: ContractNegotiation;
  /** Filled after agreement fetch; placeholder until then. */
  agreement?: ContractAgreement;
}

export interface CatalogEnrichmentEntry {
  displayName: string;
  selfDescriptionId?: string;
}
