import type { Asset } from '@think-it-labs/edc-connector-client';
import type { OfferSelfDescriptionDetailViewModel } from './corpus-offering-self-description.mapper';
import { mergeEdcAssetIntoCorpusDetailVm } from './corpus-edc-asset-detail-merge.util';

describe('mergeEdcAssetIntoCorpusDetailVm', () => {
  // Fixture de test: se castea en lugar de anotar. El view model tiene ~60 campos
  // (incluida la seccion `sections`), y enumerarlos aqui solo para satisfacer al
  // compilador haria que este fixture se rompiera en cada cambio del modelo.
  const sparseVm = {
    documentId: '',
    title: '',
    providerLabel: 'provider-uuid',
    offeringTypeLabel: '',
    version: '',
    isPublicOffering: false,
    description: '',
    keywords: [],
    mediaTypeLabels: [],
    lingualityLabel: '',
    modelFunctionLabels: [],
    personalDataLabel: '',
    sensitiveDataLabel: '',
    anonymizedLabel: '',
    licenseUrl: '',
    priceAmount: '',
    priceCurrency: '',
    priceType: '',
    contractTemplateUrl: '',
    usagePolicyRaw: '',
    issuanceDateIso: '',
    byteSize: '',
    packageFormat: '',
    fileFormatLabels: [],
    sizeAmount: '',
    sizeUnit: '',
    citationText: '',
    languages: [],
    relatedDocuments: [],
    provenanceBlocks: [],
  } as unknown as OfferSelfDescriptionDetailViewModel;

  it('fills title and description from EDC asset when corpus fields are empty', () => {
    const asset = {
      id: 'a1',
      properties: {
        name: 'My API asset',
        assetDescription: 'Full description from connector',
        assetType: 'ms:Corpus',
      },
    } as unknown as Asset;

    const merged = mergeEdcAssetIntoCorpusDetailVm(sparseVm, asset);
    expect(merged.title).toBe('My API asset');
    expect(merged.description).toBe('Full description from connector');
    expect(merged.offeringTypeLabel).toBe('ms:Corpus');
    expect(merged.providerLabel).toBe('provider-uuid');
  });

  it('does not overwrite non-empty corpus fields', () => {
    const asset = {
      id: 'a1',
      properties: { name: 'EDC name' },
    } as unknown as Asset;
    const merged = mergeEdcAssetIntoCorpusDetailVm({ ...sparseVm, title: 'Corpus title' }, asset);
    expect(merged.title).toBe('Corpus title');
  });
});
