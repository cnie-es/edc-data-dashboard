import { buildMockAssetFromVerifiableCredential } from './mock-asset-from-offer-credential.util';

const corpusVc = {
  issuanceDate: '2026-05-18T14:44:25.645818454Z',
  credentialSubject: {
    '@id': 'did:web:registry.gaia-x.eu:CorpusOffering:test-corpus',
    '@type': 'edval:CorpusOffering',
    'edval:isPublicOffering': { '@value': true },
    'simpl:generalServiceProperties': {
      'simpl:name': 'Corpus offer',
      'simpl:description': 'Corpus description',
    },
    'simpl:edcRegistration': {
      'simpl:assetId': 'asset-corpus-1',
      'simpl:accessPolicyId': 'access-1',
      'simpl:servicePolicyId': 'service-1',
    },
    'simpl:offeringPrice': {
      'simpl:priceType': 'free',
      'simpl:price': { '@value': 0 },
    },
  },
} as Record<string, unknown>;

describe('buildMockAssetFromVerifiableCredential', () => {
  it('maps corpus offering fields to connector asset properties', () => {
    const asset = buildMockAssetFromVerifiableCredential(corpusVc);
    expect(asset.id).toBe('asset-corpus-1');
    expect(asset.properties?.['offer.offerID']).toBe('did:web:registry.gaia-x.eu:CorpusOffering:test-corpus');
    expect(asset.properties?.['offer.offer_name']).toBe('Corpus offer');
    expect(asset.properties?.['assetType']).toBe('ms:Corpus');
    expect(asset.properties?.['offer.isPublic']).toBe('true');
    expect(asset.properties?.['offer.isFree']).toBe('true');
    expect(asset['accessPolicyId']).toBe('access-1');
    expect(asset['contractPolicyId']).toBe('service-1');
  });

  it('maps model offering asset type', () => {
    const asset = buildMockAssetFromVerifiableCredential({
      issuanceDate: '2026-06-03T14:13:04.785595277Z',
      credentialSubject: {
        '@id': 'did:web:registry.gaia-x.eu:ModelOffering:test-model',
        '@type': 'edval:ModelOffering',
        'simpl:generalServiceProperties': { 'simpl:name': 'Model offer' },
        'simpl:edcRegistration': { 'simpl:assetId': 'asset-model-1' },
        'simpl:offeringPrice': { 'simpl:priceType': 'paid' },
      },
    });
    expect(asset.properties?.['assetType']).toBe('ms:MLModel');
  });
});
