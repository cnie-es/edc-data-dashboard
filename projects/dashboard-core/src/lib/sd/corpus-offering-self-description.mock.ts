/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

/** Same value as `offer.offerID` on mock assets and the route `:sdId` when opening that mock from Mis activos / Mis ofertas. */
export const MOCK_SELF_DESCRIPTION_SD_ID = 'mock-corpus-offering-001';

/** Sample corpus-offering JSON-LD for local / offline self-description detail when mocks are enabled. */
export const MOCK_CORPUS_OFFERING_SELF_DESCRIPTION: Record<string, unknown> = {
  '@id': MOCK_SELF_DESCRIPTION_SD_ID,
  'dct:conformsTo': {
    '@id': 'https://simpl.example.org/schema/corpus-offeringShape',
    '@type': 'dct:Standard',
    'dct:description': 'Schema for corpus offerings in the edval dataspace',
    'dct:hasVersion': '1.0.0',
    'dct:schemaName': 'CorpusOfferingShape',
    'dct:title': 'Corpus Offering Schema',
  },
  'edval:corpusAsset': {
    'dct:identifier': {
      '@type': 'xsd:anyURI',
      '@value': 'https://doi.org/10.1234/aurora-neural-lm-0001',
      'simpl:registrationAgency': 'European Language Grid',
    },
    'dcat:distribution': {
      'dcat:byteSize': { '@type': 'xsd:integer', '@value': 2110372 },
      'dcat:packageFormat': { '@id': 'omtd:zip' },
      'dct:format': [{ '@id': 'omtd:xml' }, { '@id': 'ms:mp3' }],
      'ms:size': {
        'ms:amount': { '@type': 'xsd:float', '@value': '828597' },
        'ms:sizeUnit': { '@id': 'ms:tokens' },
      },
    },
    'dcat:keyword': [
      { '@language': 'es', '@value': 'generación de lenguaje natural' },
      { '@language': 'es', '@value': 'comprensión del lenguaje natural' },
    ],
    'dcat:version': '1.0.0',
    'dct:description': {
      '@language': 'es',
      '@value': 'The ABSITA dataset contains 4,121 reviews (mock). Descripción extendida del activo.',
    },
    'dct:title': { '@language': 'en', '@value': 'ABSITA dataset (mock)' },
    'ms:anonymized': { '@id': 'ms:yesA' },
    'ms:isDocumentedBy': [
      {
        'ms:citationText': {
          '@language': 'es',
          '@value':
            "Felice Dell'Orletta y Malvina Nissim. Visión general de la tarea EVALITA 2018 Cross-Genre Gender Prediction (GxG) (mock).",
        },
        'ms:identifier': {
          'schema:url': { '@type': 'xsd:anyURI', '@value': 'https://doi.org/10.1234/aurora-lm-docs' },
          'simpl:registrationAgency': 'DOI',
        },
      },
      {
        'ms:citationText': {
          '@language': 'es',
          '@value': 'Tanaka, M., Patel, A., & Dubois, C. (2025). Aurora-LM: Referencia técnica (mock).',
        },
        'ms:identifier': {
          'schema:url': { '@type': 'xsd:anyURI', '@value': 'https://doi.org/10.1234/aurora-lm-docs' },
          'simpl:registrationAgency': 'DOI',
        },
      },
    ],
    'ms:language': {
      'ms:languageCode': { '@id': 'ms:spa' },
      'ms:languageVarietyName': 'catalan',
      'ms:region': { '@id': 'ms:ES' },
    },
    'ms:lingualityType': { '@id': 'ms:monolingual' },
    'ms:mediaType': [{ '@id': 'ms:text' }, { '@id': 'ms:audio' }],
    'ms:personalDataIncluded': { '@id': 'ms:noP' },
    'ms:sensitiveDataIncluded': { '@id': 'ms:noS' },
    'ms:modelFunction': [
      { '@language': 'es', '@value': 'generación de lenguaje natural' },
      { '@id': 'ms:naturalLanguageUnderstanding' },
    ],
    'ms:modelType': { '@id': 'ms:DeepLearningModel' },
    'simpl:variantOfModel': 'Llama 3',
    'ms:modelDetailsPage': { '@type': 'xsd:anyURI', '@value': 'https://example.com/model-details' },
  },
  'edval:isPublicOffering': { '@type': 'xsd:boolean', '@value': true },
  'simpl:contractTemplate': {
    'simpl:contractTemplateURL': 'https://files.example.com/static/contract/ContractTemplate1.json',
  },
  'simpl:generalServiceProperties': {
    'simpl:name': 'ABSITA dataset (mock)',
    'simpl:description': 'The ABSITA dataset contains 4,121 reviews (mock).',
    'simpl:offeringType': 'Corpus',
  },
  'simpl:offeringPrice': {
    'simpl:currency': 'EUR',
    'simpl:license': { '@type': 'xsd:anyURI', '@value': 'https://licence.test.com' },
    'simpl:price': { '@type': 'xsd:decimal', '@value': 0 },
    'simpl:priceType': 'free',
  },
  'simpl:providerInformation': {
    'simpl:providedBy': 'mock-provider-participant',
  },
  'ms:originalSource': {
    'simpl:displayName': 'AI para todos',
    'ms:identifier': { '@id': 'https://ror.org/0986tYu_45' },
    'simpl:registrationAgency': 'ROR',
  },
  'ms:ipRightsHolder': [
    {
      'simpl:displayName': 'AI para todos',
      'ms:identifier': { '@id': 'https://ror.org/03yrm5c26' },
      'simpl:registrationAgency': 'ROR',
    },
    {
      'simpl:displayName': 'Haruto Yamamoto',
      'ms:identifier': { '@id': 'https://isni.org/isni/0000000121032683' },
      'simpl:registrationAgency': 'ISNI',
    },
  ],
};

export function getMockSelfDescriptionBody(sdId: string): Record<string, unknown> | undefined {
  const trimmed = sdId.trim();
  if (trimmed === MOCK_SELF_DESCRIPTION_SD_ID) {
    return { ...MOCK_CORPUS_OFFERING_SELF_DESCRIPTION };
  }
  try {
    if (decodeURIComponent(trimmed) === MOCK_SELF_DESCRIPTION_SD_ID) {
      return { ...MOCK_CORPUS_OFFERING_SELF_DESCRIPTION };
    }
  } catch {
    /* ignore */
  }
  return undefined;
}
