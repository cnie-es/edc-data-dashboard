import type { Asset } from '@think-it-labs/edc-connector-client';
import { resolveOfferContractPolicyFromAssets } from './resolve-offer-contract-policy.util';

describe('resolveOfferContractPolicyFromAssets', () => {
  it('matches asset by offer.offerID and returns contract policy context', () => {
    const asset = {
      '@id': 'asset-1',
      contractPolicyId: 'policy-123',
      accessPolicyId: 'access-policy-456',
      properties: {
        'offer.offerID': 'offer-sd-1',
        name: 'My corpus asset',
      },
    } as unknown as Asset;

    const resolved = resolveOfferContractPolicyFromAssets([asset], 'offer-sd-1');
    expect(resolved).toEqual({
      contractPolicyId: 'policy-123',
      accessPolicyId: 'access-policy-456',
      assetDisplayName: 'My corpus asset',
    });
  });

  it('returns undefined when no asset matches offer id', () => {
    expect(resolveOfferContractPolicyFromAssets([], 'missing')).toBeUndefined();
  });
});
