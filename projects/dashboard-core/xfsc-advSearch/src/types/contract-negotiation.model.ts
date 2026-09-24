export interface ContractNegotiationRequestData {
  providerEndpoint: string;
  assetId: string;
  contractDefinitionId: string;
}

export interface UiError {
  title: string;
  description: string;
}

export interface ContractNegotiationInitiateResponse {
  contractNegotiationId: string;
}

export interface ContractNegotiationStatusResponse {
  '@id': string;
  createdAt?: string;
  state?: string;
  counterPartyAddress?: string;
  contractAgreementId?: string;
  errorDetail?: string;
}

export interface ContractNegotiationOffer {
  '@id'?: string;
}

export interface ContractNegotiationOffersResponse {
  offers?: ContractNegotiationOffer[];
}

/** In-app transfer wizard payload (aligned with negotiation status field names). */
export interface EdcTransferRequestData {
  contractAgreementId: string;
  counterPartyAddress: string;
  templateId: string;
  dataDestination: Record<string, unknown>;
}

/** Wire format for contract-consumption `POST .../transfers`. */
export interface TransferStartRequest {
  contractId: string;
  providerEndpoint: string;
  templateId: string;
  dataDestination: Record<string, unknown>;
}

export interface TransferProcessInitiateResponse {
  transferProcessId: string;
}

export interface TransferProcessStatusResponse {
  '@id': string;
  createdAt?: string;
  state?: string;
  errorDetail?: string;
}
