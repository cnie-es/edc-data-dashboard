import type { Asset } from '@think-it-labs/edc-connector-client';
import { mapBodyToCorpusDetailVm } from './corpus-self-description-detail.loader';

const corpusBody: Record<string, unknown> = {
  credentialSubject: {
    'simpl:generalServiceProperties': { 'simpl:name': 'Corpus title' },
    'edval:corpusAsset': {
      'dcat:keyword': [{ '@language': 'en', '@value': 'kw1' }],
    },
  },
};

describe('mapBodyToCorpusDetailVm', () => {
  it('maps raw XFSC JSON without reshaping', () => {
    const vm = mapBodyToCorpusDetailVm(corpusBody);
    expect(vm.title).toBe('Corpus title');
    expect(vm.keywords).toEqual(['kw1']);
  });

  it('fills sparse fields from EDC asset after corpus mapping', () => {
    const asset = {
      id: 'a1',
      properties: { name: 'EDC title', assetDescription: 'EDC desc', assetType: 'data' },
    } as unknown as Asset;
    const vm = mapBodyToCorpusDetailVm(
      { credentialSubject: { 'simpl:generalServiceProperties': {}, 'edval:corpusAsset': {} } },
      asset,
    );
    expect(vm.title).toBe('EDC title');
    expect(vm.description).toBe('EDC desc');
    expect(vm.offeringTypeLabel).toBe('data');
  });
});
