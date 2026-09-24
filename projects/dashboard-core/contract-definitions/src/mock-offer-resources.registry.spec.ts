import { buildOfferCardViewModelsFromAssets } from './offer-card-from-asset.mapper';
import {
  getMockOfferAssetsFromRegistry,
  getMockSelfDescriptionFromRegistry,
  registerMockOfferCredentialsForTests,
  resetMockOfferResourcesForTests,
} from './mock-offer-resources.registry';

const corpusOfferId = 'did:web:registry.gaia-x.eu:CorpusOffering:test-corpus';
const modelOfferId = 'did:web:registry.gaia-x.eu:ModelOffering:test-model';

describe('mock-offer-resources.registry', () => {
  afterEach(() => {
    resetMockOfferResourcesForTests();
  });

  it('indexes fixtures and builds four offer cards', () => {
    registerMockOfferCredentialsForTests([
      {
        issuanceDate: '2026-05-18T14:44:25.645818454Z',
        credentialSubject: {
          '@id': corpusOfferId,
          '@type': 'edval:CorpusOffering',
          'edval:isPublicOffering': { '@value': true },
          'simpl:generalServiceProperties': {
            'simpl:name': 'aaa',
            'simpl:description': 'Corpus description',
          },
          'simpl:edcRegistration': {
            'simpl:assetId': 'asset-corpus-1',
            'simpl:accessPolicyId': 'access-1',
            'simpl:servicePolicyId': 'service-1',
          },
          'simpl:offeringPrice': { 'simpl:priceType': 'free', 'simpl:price': { '@value': 0 } },
        },
      },
      {
        issuanceDate: '2026-06-03T14:13:04.785595277Z',
        credentialSubject: {
          '@id': modelOfferId,
          '@type': 'edval:ModelOffering',
          'edval:isPublicOffering': { '@value': false },
          'simpl:generalServiceProperties': {
            'simpl:name': 'PruebaMario0306202601',
            'simpl:description': 'Model description',
          },
          'simpl:edcRegistration': {
            'simpl:assetId': 'asset-model-1',
            'simpl:accessPolicyId': 'access-2',
            'simpl:servicePolicyId': 'service-2',
          },
          'simpl:offeringPrice': { 'simpl:priceType': 'free', 'simpl:price': { '@value': 0 } },
        },
      },
      {
        issuanceDate: '2026-06-01T10:00:00.000Z',
        credentialSubject: {
          '@id': 'did:web:registry.gaia-x.eu:ApiOffering:test-api',
          '@type': 'edval:ApiOffering',
          'simpl:generalServiceProperties': { 'simpl:name': 'API 3' },
          'simpl:edcRegistration': { 'simpl:assetId': 'asset-api-1' },
          'simpl:offeringPrice': { 'simpl:priceType': 'free' },
        },
      },
      {
        issuanceDate: '2026-06-02T08:11:45.675153984Z',
        credentialSubject: {
          '@id': 'did:web:registry.gaia-x.eu:LCROffering:test-lcr',
          '@type': 'edval:LCROffering',
          'simpl:generalServiceProperties': { 'simpl:name': 'PruebaMario0206202603' },
          'simpl:edcRegistration': { 'simpl:assetId': 'asset-lcr-1' },
          'simpl:offeringPrice': { 'simpl:priceType': 'free' },
        },
      },
    ]);

    const assets = getMockOfferAssetsFromRegistry();
    expect(assets.length).toBe(4);

    const cards = buildOfferCardViewModelsFromAssets(assets, 'connector');
    expect(cards.map(c => c.title)).toEqual(['aaa', 'PruebaMario0306202601', 'API 3', 'PruebaMario0206202603']);
    expect(cards.map(c => c.subtitle)).toEqual(['corpus', 'mlmodel', 'api', 'lexicalconceptualresource']);
  });

  it('resolves self-description by offer id including encoded did', () => {
    registerMockOfferCredentialsForTests([
      {
        credentialSubject: {
          '@id': corpusOfferId,
          '@type': 'edval:CorpusOffering',
          'simpl:generalServiceProperties': { 'simpl:name': 'aaa' },
          'simpl:edcRegistration': { 'simpl:assetId': 'asset-corpus-1' },
          'simpl:offeringPrice': { 'simpl:priceType': 'free' },
        },
      },
    ]);

    const encoded = encodeURIComponent(corpusOfferId);
    const body = getMockSelfDescriptionFromRegistry(encoded);
    expect(body?.['credentialSubject']).toBeDefined();
    expect((body?.['credentialSubject'] as Record<string, unknown>)['@id']).toBe(corpusOfferId);
  });
});
