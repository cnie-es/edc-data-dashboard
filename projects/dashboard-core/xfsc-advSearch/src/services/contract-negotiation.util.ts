import type { ContractNegotiationRequestData } from '../types/contract-negotiation.model';

interface ContractNegotiationCredentialSubject {
  'simpl:edcRegistration'?: {
    'simpl:assetId'?: string;
    'simpl:contractDefinitionId'?: string;
  };
  'simpl:edcConnector'?: {
    'simpl:providerEndpointURL'?: string;
  };
}

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;

const getCredentialSubject = (resourceDescriptionDocument: unknown): ContractNegotiationCredentialSubject | null => {
  const documentRecord = asRecord(resourceDescriptionDocument);
  if (!documentRecord) {
    return null;
  }

  const credentialSubject = asRecord(documentRecord['credentialSubject']);
  if (!credentialSubject) {
    return null;
  }

  return credentialSubject as ContractNegotiationCredentialSubject;
};

export const isEligibleForContractNegotiation = (resourceDescriptionDocument: unknown): boolean => {
  const sdDocument = getCredentialSubject(resourceDescriptionDocument);
  if (!sdDocument) {
    return false;
  }

  return Boolean(
    sdDocument['simpl:edcRegistration']?.['simpl:assetId']?.length &&
      sdDocument['simpl:edcRegistration']?.['simpl:contractDefinitionId']?.length &&
      sdDocument['simpl:edcConnector']?.['simpl:providerEndpointURL']?.length,
  );
};

export const getContractNegotiationData = (
  resourceDescriptionDocument: unknown,
): ContractNegotiationRequestData | null => {
  if (!isEligibleForContractNegotiation(resourceDescriptionDocument)) {
    return null;
  }

  const sdDocument = getCredentialSubject(resourceDescriptionDocument);
  if (!sdDocument) {
    return null;
  }

  return {
    providerEndpoint: sdDocument['simpl:edcConnector']?.['simpl:providerEndpointURL'] ?? '',
    assetId: sdDocument['simpl:edcRegistration']?.['simpl:assetId'] ?? '',
    contractDefinitionId: sdDocument['simpl:edcRegistration']?.['simpl:contractDefinitionId'] ?? '',
  };
};
