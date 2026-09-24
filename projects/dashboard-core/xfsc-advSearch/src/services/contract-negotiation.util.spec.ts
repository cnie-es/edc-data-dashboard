import { getContractNegotiationData, isEligibleForContractNegotiation } from './contract-negotiation.util';

describe('contract-negotiation util', () => {
  const eligibleDocument = {
    credentialSubject: {
      'simpl:edcRegistration': {
        'simpl:assetId': 'asset-123',
        'simpl:contractDefinitionId': 'contract-def-456',
      },
      'simpl:edcConnector': {
        'simpl:providerEndpointURL': 'https://provider.example/protocol',
      },
    },
  };

  it('should return true when SD has all required negotiation fields', () => {
    expect(isEligibleForContractNegotiation(eligibleDocument)).toBeTrue();
  });

  it('should return false when assetId is missing', () => {
    const document = {
      credentialSubject: {
        'simpl:edcRegistration': {
          'simpl:contractDefinitionId': 'contract-def-456',
        },
        'simpl:edcConnector': {
          'simpl:providerEndpointURL': 'https://provider.example/protocol',
        },
      },
    };

    expect(isEligibleForContractNegotiation(document)).toBeFalse();
  });

  it('should return false when contractDefinitionId is missing', () => {
    const document = {
      credentialSubject: {
        'simpl:edcRegistration': {
          'simpl:assetId': 'asset-123',
        },
        'simpl:edcConnector': {
          'simpl:providerEndpointURL': 'https://provider.example/protocol',
        },
      },
    };

    expect(isEligibleForContractNegotiation(document)).toBeFalse();
  });

  it('should return false when providerEndpointURL is missing', () => {
    const document = {
      credentialSubject: {
        'simpl:edcRegistration': {
          'simpl:assetId': 'asset-123',
          'simpl:contractDefinitionId': 'contract-def-456',
        },
      },
    };

    expect(isEligibleForContractNegotiation(document)).toBeFalse();
  });

  it('should map negotiation payload from eligible SD', () => {
    expect(getContractNegotiationData(eligibleDocument)).toEqual({
      providerEndpoint: 'https://provider.example/protocol',
      assetId: 'asset-123',
      contractDefinitionId: 'contract-def-456',
    });
  });

  it('should return null payload for non-eligible SD', () => {
    expect(getContractNegotiationData({ credentialSubject: {} })).toBeNull();
  });
});
