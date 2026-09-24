import { mapCorpusOfferingSelfDescription } from './corpus-offering-self-description.mapper';

const flatCorpusOfferingFixture: Record<string, unknown> = {
  '@id': 'mock-corpus-offering-001',
  'dct:conformsTo': {
    '@id': 'https://simpl.example.org/schema/corpus-offeringShape',
    '@type': 'dct:Standard',
    'dct:description': 'Schema for corpus offerings in the edval dataspace',
    'dct:hasVersion': '1.0.0',
    'dct:schemaName': 'CorpusOfferingShape',
    'dct:title': 'Corpus Offering Schema',
  },
  'edval:corpusAsset': {
    'dcat:distribution': {
      'dcat:byteSize': { '@type': 'xsd:integer', '@value': 2110372 },
      'dcat:packageFormat': { '@id': 'omtd:zip' },
      'dct:format': { '@id': 'omtd:xml' },
      'ms:size': {
        'ms:amount': { '@type': 'xsd:float', '@value': '828597' },
        'ms:sizeUnit': { '@id': 'ms:tokens' },
      },
    },
    'dcat:keyword': [
      { '@language': 'en', '@value': 'reviews' },
      { '@language': 'en', '@value': 'Spanish' },
    ],
    'dcat:version': '1.0.0',
    'dct:description': { '@language': 'en', '@value': 'The ABSITA dataset contains 4,121 reviews.' },
    'dct:title': { '@language': 'en', '@value': 'ABSITA dataset1' },
    'ms:anonymized': { '@id': 'ms:yesA' },
    'ms:isDocumentedBy': {
      'ms:citationText': {
        '@language': 'en',
        '@value': "Felice Dell'Orletta and Malvina Nissim. Overview of the EVALITA 2018.",
      },
    },
    'ms:language': {
      'ms:languageCode': { '@id': 'ms:spa' },
      'ms:languageVarietyName': 'catalan',
      'ms:region': { '@id': 'ms:ES' },
    },
    'ms:lingualityType': { '@id': 'ms:monolingual' },
    'ms:mediaType': { '@id': 'ms:text' },
    'ms:personalDataIncluded': { '@id': 'ms:yesP' },
    'ms:sensitiveDataIncluded': { '@id': 'ms:yesS' },
  },
  'edval:isPublicOffering': { '@type': 'xsd:boolean', '@value': true },
  'simpl:contractTemplate': {
    'simpl:contractTemplateURL': 'https://files.example.com/static/contract/ContractTemplate1.json',
  },
  'simpl:generalServiceProperties': {
    'simpl:name': 'ABSITA dataset1',
    'simpl:description': 'The ABSITA dataset contains 4,121 reviews.',
    'simpl:offeringType': 'data',
  },
  'simpl:offeringPrice': {
    'simpl:currency': 'EUR',
    'simpl:license': { '@type': 'xsd:anyURI', '@value': 'https://licence.test.com' },
    'simpl:price': { '@type': 'xsd:decimal', '@value': 0 },
    'simpl:priceType': 'free',
  },
  'simpl:providerInformation': {
    'simpl:providedBy': '019d0543-7115-739f-829a-99ca5edcba2c',
  },
};

describe('mapCorpusOfferingSelfDescription', () => {
  it('reads issuanceDate from verifiable credential root with nanosecond precision', () => {
    const vm = mapCorpusOfferingSelfDescription({
      issuanceDate: '2026-05-15T09:20:06.009023252Z',
      credentialSubject: flatCorpusOfferingFixture,
    });
    expect(vm.issuanceDateIso).toBe('2026-05-15T09:20:06.009Z');
  });

  it('maps flat corpus offering JSON-LD', () => {
    const vm = mapCorpusOfferingSelfDescription(flatCorpusOfferingFixture);
    expect(vm.title).toBe('ABSITA dataset1');
    expect(vm.version).toBe('1.0.0');
    expect(vm.offeringTypeLabel).toBe('corpus');
    expect(vm.isPublicOffering).toBe(true);
    expect(vm.keywords).toEqual(['reviews', 'Spanish']);
    expect(vm.mediaTypeLabels).toEqual(['text']);
    expect(vm.lingualityLabel).toBe('monolingual');
    expect(vm.personalDataLabel).toBe('yes');
    expect(vm.sensitiveDataLabel).toBe('yes');
    expect(vm.anonymizedLabel).toBe('yes');
    expect(vm.licenseUrl).toBe('https://licence.test.com');
    expect(vm.priceAmount).toBe('0');
    expect(vm.priceCurrency).toBe('EUR');
    expect(vm.byteSize).toBe('2110372');
    expect(vm.packageFormat).toBe('zip');
    expect(vm.fileFormatLabels).toEqual(['xml']);
    expect(vm.sizeAmount).toBe('828597');
    expect(vm.sizeUnit).toBe('tokens');
    expect(vm.languages.length).toBe(1);
    expect(vm.languages[0].regionCode).toBe('ES');
    expect(vm.languages[0].regionDisplay).toBe('España');
    expect(vm.languages[0].varietyLine).toBe('catalan');
    expect(vm.languages[0].hasDisplayContent).toBe(true);
    expect(vm.languages[0].regionLabel).toBe('ES');
    expect(vm.citationText).toContain('EVALITA');
    expect(vm.relatedDocuments.length).toBe(1);
    expect(vm.modelFunctionLabels).toEqual([]);
    expect(vm.provenanceBlocks).toEqual([]);
  });

  it('maps GDPR noA flags to no', () => {
    const json: Record<string, unknown> = {
      ...flatCorpusOfferingFixture,
      'edval:corpusAsset': {
        ...(flatCorpusOfferingFixture['edval:corpusAsset'] as Record<string, unknown>),
        'ms:anonymized': { '@id': 'ms:noA' },
        'ms:sensitiveDataIncluded': { '@id': 'ms:noA' },
        'ms:personalDataIncluded': { '@id': 'ms:noP' },
      },
    };
    const vm = mapCorpusOfferingSelfDescription(json);
    expect(vm.anonymizedLabel).toBe('no');
    expect(vm.sensitiveDataLabel).toBe('no');
    expect(vm.personalDataLabel).toBe('no');
  });

  it('derives asset type and version from dct:conformsTo', () => {
    const vm = mapCorpusOfferingSelfDescription(flatCorpusOfferingFixture);
    expect(vm.version).toBe('1.0.0');
    expect(vm.offeringTypeLabel).toBe('corpus');
  });

  it('maps model, api, and lcr offering assets', () => {
    const modelVc = {
      credentialSubject: {
        '@type': 'edval:ModelOffering',
        'dct:conformsTo': { 'dct:schemaName': 'Model', 'dct:hasVersion': '1.0.0' },
        'simpl:generalServiceProperties': { 'simpl:name': 'Model offer', 'simpl:offeringType': 'data' },
        'edval:modelAsset': {
          'dct:title': { '@language': 'en', '@value': 'Model title' },
          'dct:description': { '@language': 'en', '@value': 'Model body' },
          'dcat:keyword': [{ '@language': 'en', '@value': 'kw' }],
          'ms:mediaType': { '@id': 'ms:text' },
        },
        'simpl:offeringPrice': { 'simpl:currency': 'EUR' },
        'simpl:providerInformation': { 'simpl:providedBy': 'provider' },
      },
    };
    const modelVm = mapCorpusOfferingSelfDescription(modelVc);
    expect(modelVm.title).toBe('Model offer');
    expect(modelVm.description).toBe('Model body');
    expect(modelVm.offeringTypeLabel).toBe('mlmodel');
    expect(modelVm.keywords).toEqual(['kw']);

    const apiVc = {
      credentialSubject: {
        '@type': 'edval:ApiOffering',
        'dct:conformsTo': { 'dct:schemaName': 'API REST', 'dct:hasVersion': '1.0.0' },
        'simpl:generalServiceProperties': { 'simpl:name': 'API offer' },
        'edval:apiAsset': {
          'dct:description': { '@language': 'en', '@value': 'API body' },
        },
        'simpl:providerInformation': { 'simpl:providedBy': 'provider' },
      },
    };
    const apiVm = mapCorpusOfferingSelfDescription(apiVc);
    expect(apiVm.description).toBe('API body');
    expect(apiVm.offeringTypeLabel).toBe('api');
  });

  it('falls back to corpus dcat:version and simpl:offeringType when dct:conformsTo is absent', () => {
    const { 'dct:conformsTo': _removed, ...withoutConformsTo } = flatCorpusOfferingFixture;
    const vm = mapCorpusOfferingSelfDescription(withoutConformsTo);
    expect(vm.version).toBe('1.0.0');
    expect(vm.offeringTypeLabel).toBe('data');
  });

  it('unwraps credentialSubject when present', () => {
    const wrapped = {
      credentialSubject: flatCorpusOfferingFixture,
    } as Record<string, unknown>;
    const vm = mapCorpusOfferingSelfDescription(wrapped);
    expect(vm.title).toBe('ABSITA dataset1');
  });

  it('maps extended corpus fields', () => {
    const extended: Record<string, unknown> = {
      ...flatCorpusOfferingFixture,
      'edval:corpusAsset': {
        ...(flatCorpusOfferingFixture['edval:corpusAsset'] as Record<string, unknown>),
        'dct:identifier': {
          '@type': 'xsd:anyURI',
          '@value': 'https://doi.org/10.1234/test',
          'simpl:registrationAgency': 'DOI Registry',
        },
        'ms:modelFunction': [{ '@language': 'en', '@value': 'NLG' }, { '@id': 'ms:parse' }],
        'ms:modelType': { '@id': 'ms:Transformer' },
        'simpl:variantOfModel': 'Base-X',
        'ms:modelDetailsPage': { '@type': 'xsd:anyURI', '@value': 'https://example.com/details' },
      },
      'ms:originalSource': {
        'simpl:displayName': 'Org A',
        'ms:identifier': { '@id': 'https://ror.org/abc' },
        'simpl:registrationAgency': 'ROR',
      },
      'ms:ipRightsHolder': {
        'simpl:displayName': 'Person B',
        'ms:identifier': { '@id': 'https://isni.org/isni/000' },
        'simpl:registrationAgency': 'ISNI',
      },
    };
    const vm = mapCorpusOfferingSelfDescription(extended);
    expect(vm.corpusPrimaryIdentifier?.referenceUrl).toBe('https://doi.org/10.1234/test');
    expect(vm.corpusPrimaryIdentifier?.agency).toBe('DOI Registry');
    expect(vm.modelFunctionLabels).toEqual(['NLG', 'parse']);
    expect(vm.modelProperties?.modelType).toBe('Transformer');
    expect(vm.modelProperties?.variantOf).toBe('Base-X');
    expect(vm.modelProperties?.detailsUrl).toBe('https://example.com/details');
    expect(vm.provenanceBlocks.length).toBe(2);
    expect(vm.provenanceBlocks[0].kind).toBe('originalSource');
    expect(vm.provenanceBlocks[0].displayName).toBe('Org A');
    expect(vm.provenanceBlocks[0].agency).toBe('ROR');
    expect(vm.provenanceBlocks[1].kind).toBe('ipRightsHolder');
    expect(vm.provenanceBlocks[1].displayName).toBe('Person B');
  });
});
