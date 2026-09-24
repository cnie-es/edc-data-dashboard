import type { Asset } from '@think-it-labs/edc-connector-client';
import {
  SD_MATCHED_ASSETS_MOCK_ACCESS_POLICY_ID,
  SD_MATCHED_ASSETS_MOCK_CLAIMS_URI,
  SD_MATCHED_ASSETS_MOCK_CONTRACT_POLICY_ID,
  assetMatchesClaims,
  collectClaimsGraphUris,
  createMockMatchedAssetsForCache,
  enrichMatchedAssetsWithContractPolicies,
  getAssetSdId,
  readAssetPropertyString,
  resolveOfferClaimUriFromAsset,
  getContractDefinitionTargetAssetId,
  mergeContractDefinitionPageIntoPolicyMap,
  mergeContractPolicyIdsOntoAsset,
  normalizeAssetsSelector,
  readContractPolicyIds,
  resolveAssetEntityId,
} from './sd-matched-assets-warmup.util';

describe('sd-matched-assets-warmup.util', () => {
  it('collectClaimsGraphUris flattens claimsGraphUri arrays', () => {
    const set = collectClaimsGraphUris([
      { n: { claimsGraphUri: ['did:a:1', 'did:a:2'] } },
      { n: { claimsGraphUri: ['did:a:2'] } },
      {},
    ]);
    expect(set.size).toBe(2);
    expect(set.has('did:a:1')).toBe(true);
    expect(set.has('did:a:2')).toBe(true);
  });

  it('getAssetSdId reads sdId from properties', () => {
    const asset = { properties: { sdId: '  did:x  ' } } as unknown as Asset;
    expect(getAssetSdId(asset)).toBe('did:x');
  });

  it('assetMatchesClaims requires exact membership', () => {
    const claims = new Set(['did:match']);
    const ok = { properties: { sdId: 'did:match' } } as unknown as Asset;
    const no = { properties: { sdId: 'did:other' } } as unknown as Asset;
    expect(assetMatchesClaims(ok, claims)).toBe(true);
    expect(assetMatchesClaims(no, claims)).toBe(false);
  });

  it('readAssetPropertyString reads via optionalValue like edc-connector-client', () => {
    const asset = {
      properties: {
        optionalValue: (ns: string, prop: string) =>
          ns === 'edc' && prop === 'sdId' ? 'did:from-optional' : undefined,
      },
    } as unknown as Asset;
    expect(readAssetPropertyString(asset, 'sdId')).toBe('did:from-optional');
    expect(getAssetSdId(asset)).toBe('did:from-optional');
  });

  it('resolveOfferClaimUriFromAsset falls back to offer.offerID when sdId is absent', () => {
    const asset = {
      properties: {
        'offer.offerID': 'did:web:registry.gaia-x.eu:CorpusOffering:offer-only',
      },
    } as unknown as Asset;
    expect(resolveOfferClaimUriFromAsset(asset)).toBe('did:web:registry.gaia-x.eu:CorpusOffering:offer-only');
  });

  it('matches real CorpusOffering SD claims against connector-style offer assets', () => {
    const sdItems = [
      { n: { claimsGraphUri: ['did:web:registry.gaia-x.eu:CorpusOffering:1ee39136-6508-4b88-9c21-cb7235a74ddb'] } },
      { n: { claimsGraphUri: ['did:web:registry.gaia-x.eu:CorpusOffering:3de89378-e459-4310-86c7-8ceeb5d83d0c'] } },
      { n: { claimsGraphUri: ['did:web:registry.gaia-x.eu:CorpusOffering:4d82a619-3b3d-40c9-aa2b-67053643bb61'] } },
      { n: { claimsGraphUri: ['did:web:registry.gaia-x.eu:CorpusOffering:a8ed833f-ddff-4d03-8aaa-2f3eea00f084'] } },
      { n: { claimsGraphUri: ['did:web:registry.gaia-x.eu:CorpusOffering:f7922736-d219-4978-9c0f-4276e61cb51a'] } },
    ];
    const claims = collectClaimsGraphUris(sdItems);

    const plainMinio = {
      '@id': '2e7464d0-fd2d-4a39-9c81-23b35778a9be',
      properties: { id: '2e7464d0-fd2d-4a39-9c81-23b35778a9be' },
    } as unknown as Asset;

    const pruebaMario = {
      '@id': '0868093e-0c4f-44e7-9a50-4ce1aa76f9d6',
      properties: {
        sdId: 'did:web:registry.gaia-x.eu:CorpusOffering:1ee39136-6508-4b88-9c21-cb7235a74ddb',
        'offer.offerID': 'did:web:registry.gaia-x.eu:CorpusOffering:1ee39136-6508-4b88-9c21-cb7235a74ddb',
        'offer.offer_name': 'PruebaMario',
      },
    } as unknown as Asset;

    const aaa = {
      '@id': '11c02ca8-39da-4182-ae2c-fab05238cc52',
      properties: {
        sdId: 'did:web:registry.gaia-x.eu:CorpusOffering:a8ed833f-ddff-4d03-8aaa-2f3eea00f084',
        'offer.offerID': 'did:web:registry.gaia-x.eu:CorpusOffering:a8ed833f-ddff-4d03-8aaa-2f3eea00f084',
      },
    } as unknown as Asset;

    const pruebaMario2 = {
      '@id': 'f7e8ba8c-1368-4d7f-9a83-ebb1f69dbe8e',
      properties: {
        sdId: 'did:web:registry.gaia-x.eu:CorpusOffering:4d82a619-3b3d-40c9-aa2b-67053643bb61',
        'offer.offerID': 'did:web:registry.gaia-x.eu:CorpusOffering:4d82a619-3b3d-40c9-aa2b-67053643bb61',
      },
    } as unknown as Asset;

    expect(assetMatchesClaims(plainMinio, claims)).toBe(false);
    expect(assetMatchesClaims(pruebaMario, claims)).toBe(true);
    expect(assetMatchesClaims(aaa, claims)).toBe(true);
    expect(assetMatchesClaims(pruebaMario2, claims)).toBe(true);

    const all = [plainMinio, pruebaMario, aaa, pruebaMario2];
    expect(all.filter(a => assetMatchesClaims(a, claims)).length).toBe(3);
  });

  it('createMockMatchedAssetsForCache returns one asset with sdId aligned to mock URI', () => {
    const assets = createMockMatchedAssetsForCache();
    expect(assets.length).toBe(1);
    expect(getAssetSdId(assets[0])).toBe(SD_MATCHED_ASSETS_MOCK_CLAIMS_URI);
    expect((assets[0] as unknown as { accessPolicyId?: string }).accessPolicyId).toBe(
      SD_MATCHED_ASSETS_MOCK_ACCESS_POLICY_ID,
    );
    expect((assets[0] as unknown as { contractPolicyId?: string }).contractPolicyId).toBe(
      SD_MATCHED_ASSETS_MOCK_CONTRACT_POLICY_ID,
    );
    const props = (assets[0] as unknown as { properties: Record<string, unknown> }).properties;
    expect(typeof props['createdAt']).toBe('string');
    expect(props['assetType']).toBe('ms:Corpus');
    expect(props['offer.currency']).toBe('EUR');
    expect(props['offer.license']).toBe('https://ftp.gnu.org/pub/gnu/Licenses/gpl-3.0.txt?utm_source=chatgpt.com');
  });

  it('resolveAssetEntityId prefers top-level id then @id', () => {
    expect(resolveAssetEntityId({ id: 'a', '@id': 'b' } as unknown as Asset)).toBe('a');
    expect(resolveAssetEntityId({ '@id': 'urn:x' } as unknown as Asset)).toBe('urn:x');
    expect(resolveAssetEntityId({ properties: {} } as unknown as Asset)).toBeUndefined();
  });

  it('normalizeAssetsSelector handles single criterion or array', () => {
    const single = { assetsSelector: { operandLeft: 'id', operator: '=', operandRight: 'x' } };
    expect(normalizeAssetsSelector(single)).toEqual([{ operandLeft: 'id', operator: '=', operandRight: 'x' }]);
    const multi = {
      assetsSelector: [
        { operandLeft: 'title', operator: 'like', operandRight: '%a%' },
        {
          operandLeft: 'https://w3id.org/edc/v0.0.1/ns/id',
          operator: '=',
          operandRight: 'uuid-1',
        },
      ],
    };
    expect(normalizeAssetsSelector(multi).length).toBe(2);
  });

  it('getContractDefinitionTargetAssetId uses EDC id IRI criterion with operator =', () => {
    const def = {
      assetsSelector: {
        operandLeft: 'https://w3id.org/edc/v0.0.1/ns/id',
        operator: '=',
        operandRight: 'e3a2a362-06f5-46f2-b22d-70bb30d1c641',
      },
    };
    expect(getContractDefinitionTargetAssetId(def)).toBe('e3a2a362-06f5-46f2-b22d-70bb30d1c641');
  });

  it('readContractPolicyIds requires both string ids', () => {
    expect(readContractPolicyIds({ accessPolicyId: 'a', contractPolicyId: 'b' })).toEqual({
      accessPolicyId: 'a',
      contractPolicyId: 'b',
    });
    expect(readContractPolicyIds({ accessPolicyId: 'a' })).toBeUndefined();
  });

  it('mergeContractDefinitionPageIntoPolicyMap keeps first definition per asset id', () => {
    const matched = new Set(['asset-1']);
    const map = new Map<string, { accessPolicyId: string; contractPolicyId: string }>();
    mergeContractDefinitionPageIntoPolicyMap(
      [
        {
          accessPolicyId: 'acc-first',
          contractPolicyId: 'con-first',
          assetsSelector: {
            operandLeft: 'https://w3id.org/edc/v0.0.1/ns/id',
            operator: '=',
            operandRight: 'asset-1',
          },
        },
        {
          accessPolicyId: 'acc-second',
          contractPolicyId: 'con-second',
          assetsSelector: {
            operandLeft: 'https://w3id.org/edc/v0.0.1/ns/id',
            operator: '=',
            operandRight: 'asset-1',
          },
        },
      ],
      matched,
      map,
    );
    expect(map.get('asset-1')).toEqual({ accessPolicyId: 'acc-first', contractPolicyId: 'con-first' });
  });

  it('mergeContractPolicyIdsOntoAsset is a no-op when policy ids are missing', () => {
    const asset = { '@id': 'x' } as unknown as Asset;
    expect(mergeContractPolicyIdsOntoAsset(asset, undefined)).toBe(asset);
  });

  it('enrichMatchedAssetsWithContractPolicies merges by resolved asset id', () => {
    const matched = [{ '@id': 'aid-1', properties: { sdId: 'did:x' } }] as unknown as Asset[];
    const policyMap = new Map([['aid-1', { accessPolicyId: 'pa', contractPolicyId: 'pc' }]]);
    const out = enrichMatchedAssetsWithContractPolicies(matched, policyMap);
    expect((out[0] as unknown as { accessPolicyId: string }).accessPolicyId).toBe('pa');
    expect((out[0] as unknown as { contractPolicyId: string }).contractPolicyId).toBe('pc');
  });
});
