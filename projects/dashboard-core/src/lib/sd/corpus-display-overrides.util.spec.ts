import type { OfferSelfDescriptionDetailViewModel } from './corpus-offering-self-description.mapper';
import { applyCorpusDetailDisplayOverrides } from './corpus-display-overrides.util';

describe('applyCorpusDetailDisplayOverrides', () => {
  // Fixture de test: se castea en lugar de anotar. El view model tiene ~60 campos
  // (incluida la seccion `sections`), y enumerarlos aqui solo para satisfacer al
  // compilador haria que este fixture se rompiera en cada cambio del modelo.
  const baseVm = {
    documentId: '',
    title: '',
    providerLabel: '408de5d6-f834-49f8-9fc2-fce122487cfe',
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

  it('fills empty title and UUID provider from overrides', () => {
    const result = applyCorpusDetailDisplayOverrides(baseVm, {
      title: 'PruebaMario2',
      providerLabel: 'counterparty-connector',
    });
    expect(result.title).toBe('PruebaMario2');
    expect(result.providerLabel).toBe('counterparty-connector');
  });

  it('applies asset type label override from list card', () => {
    const result = applyCorpusDetailDisplayOverrides(
      { ...baseVm, offeringTypeLabel: 'data' },
      { offeringTypeLabel: 'corpus' },
    );
    expect(result.offeringTypeLabel).toBe('corpus');
  });

  it('keeps non-empty corpus title and non-UUID provider', () => {
    const result = applyCorpusDetailDisplayOverrides(
      { ...baseVm, title: 'Corpus title', providerLabel: 'Provider GmbH' },
      { title: 'Row name', providerLabel: 'cp-1' },
    );
    expect(result.title).toBe('Corpus title');
    expect(result.providerLabel).toBe('Provider GmbH');
  });
});
