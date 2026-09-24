import { normalizeContractDefinition, toOfferCardViewModel } from './offer-card-view-model';
import type { Asset, ContractDefinition, PolicyDefinition } from '@think-it-labs/edc-connector-client';

describe('offer-card-view-model', () => {
  it('normalizes assetsSelector when backend returns single object', () => {
    const contractDefinition = {
      id: 'cd-1',
      accessPolicyId: 'access-1',
      contractPolicyId: 'contract-1',
      assetsSelector: {
        operandLeft: 'id',
        operator: '=',
        operandRight: 'asset-1',
      },
    } as unknown as ContractDefinition;

    const normalized = normalizeContractDefinition(contractDefinition);
    expect(Array.isArray(normalized.assetsSelector)).toBeTrue();
    expect(normalized.assetsSelector.length).toBe(1);
  });

  it('renders explicit error title when asset/policy mapping fails', () => {
    const contractDefinition = {
      id: 'cd-2',
      accessPolicyId: 'access-2',
      contractPolicyId: 'policy-2',
      assetsSelector: [],
    } as unknown as ContractDefinition;

    const offerCard = toOfferCardViewModel(contractDefinition, [] as Asset[], [] as PolicyDefinition[]);

    expect(offerCard.title).toBe('Error rendering the offer cd-2');
    expect(offerCard.offerSelfDescriptionId).toBeUndefined();
    expect(offerCard.priceLabel).toContain('(temporary)');
    expect(offerCard.statusBadge).toContain('(temporary)');
    expect(offerCard.policySummary).toBe('Policy action: odrl:use -> policy-2');
    expect(offerCard.assetDisplayName).toBe('cd-2');
  });

  it('builds mapped fields from matched asset and policy', () => {
    const contractDefinition = {
      id: 'cd-3',
      accessPolicyId: 'access-3',
      contractPolicyId: 'policy-3',
      assetsSelector: [{ operandLeft: 'id', operator: '=', operandRight: 'asset-3' }],
    } as unknown as ContractDefinition;

    const asset = {
      '@id': 'asset-3',
      properties: {
        'offer.offerID': 'did:web:test:CorpusOffering:asset-3',
      },
      dataAddress: {
        objectName: 'Asset 03',
        type: 'HttpData',
      },
    } as unknown as Asset;

    const policy = {
      '@id': 'policy-3',
      createdAt: 1771252803929,
      policy: {
        'odrl:assigner': 'Telefonica IoT Big Data Tech (temporary)',
        'odrl:permission': {
          'odrl:action': {
            '@id': 'odrl:use',
          },
        },
      },
    } as unknown as PolicyDefinition;

    const offerCard = toOfferCardViewModel(contractDefinition, [asset], [policy]);

    expect(offerCard.title).toBe('Asset 03');
    expect(offerCard.offerSelfDescriptionId).toBe('did:web:test:CorpusOffering:asset-3');
    expect(offerCard.providerLabel).toBe('Telefonica IoT Big Data Tech (temporary)');
    expect(offerCard.subtitle).toBe('HttpData');
    expect(offerCard.policySummary).toBe('Policy action: use -> policy-3');
    expect(offerCard.publishedAt).toBe('2026-02-16T10:40:03.929Z');
    expect(offerCard.description).toBe('No description available.');
  });
});
