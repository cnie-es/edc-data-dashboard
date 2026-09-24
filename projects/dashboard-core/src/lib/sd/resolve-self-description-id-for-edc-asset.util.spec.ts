import type { Asset } from '@think-it-labs/edc-connector-client';
import {
  findEdcAssetByConnectorId,
  resolveSelfDescriptionIdForEdcAsset,
  resolveSelfDescriptionIdFromEdcAssets,
} from './resolve-self-description-id-for-edc-asset.util';

describe('resolve-self-description-id-for-edc-asset', () => {
  const edcAssetId = '408de5d6-f834-49f8-9fc2-fce122487cfe';
  const corpusSdId = 'did:web:registry:CorpusOffering:from-asset';

  const asset = {
    '@id': edcAssetId,
    id: edcAssetId,
    '@type': 'Asset',
    properties: {
      name: 'Asset 03',
      'offer.offerID': corpusSdId,
    },
  } as unknown as Asset;

  it('findEdcAssetByConnectorId matches by entity id', () => {
    expect(findEdcAssetByConnectorId([asset], edcAssetId)).toBe(asset);
  });

  it('resolveSelfDescriptionIdFromEdcAssets uses offer.offerID', () => {
    expect(resolveSelfDescriptionIdFromEdcAssets(edcAssetId, [asset])).toBe(corpusSdId);
  });

  it('resolveSelfDescriptionIdForEdcAsset prefers EDC asset over catalog fallback', async () => {
    const catalog = jasmine.createSpy('catalog').and.resolveTo('did:web:catalog-only');
    const sdId = await resolveSelfDescriptionIdForEdcAsset(edcAssetId, async () => [asset], catalog);
    expect(sdId).toBe(corpusSdId);
    expect(catalog).not.toHaveBeenCalled();
  });

  it('resolveSelfDescriptionIdForEdcAsset uses catalog when asset has no sd id', async () => {
    const bare = { id: 'other-asset', properties: { name: 'x' } } as unknown as Asset;
    const catalog = jasmine.createSpy('catalog').and.resolveTo('did:web:catalog-only');
    const sdId = await resolveSelfDescriptionIdForEdcAsset('other-asset', async () => [bare], catalog);
    expect(sdId).toBe('did:web:catalog-only');
    expect(catalog).toHaveBeenCalled();
  });
});
