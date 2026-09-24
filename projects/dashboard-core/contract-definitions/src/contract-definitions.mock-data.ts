import type { Asset, ContractDefinition, PolicyDefinition } from '@think-it-labs/edc-connector-client';
import {
  getMockSelfDescriptionBody,
  MOCK_CORPUS_OFFERING_SELF_DESCRIPTION,
  MOCK_SELF_DESCRIPTION_SD_ID,
} from '@eclipse-edc/dashboard-core';
import { getMockSelfDescriptionFromRegistry } from './mock-offer-resources.registry';

// Mock data copied from bearer-token-endpoints.md while endpoint integration is unavailable.

/** Same value as `offer.offerID` on mock assets, `@id` on `MOCK_CORPUS_OFFERING_SELF_DESCRIPTION`, and the route `:offerId` when opening that mock from Mis ofertas (plain string, no `:` so the URL segment stays unambiguous). */
export const MOCK_OFFER_SELF_DESCRIPTION_ID = MOCK_SELF_DESCRIPTION_SD_ID;

export { MOCK_CORPUS_OFFERING_SELF_DESCRIPTION };

/** Resolves a mock self-description from `/resources/*.json` fixtures, then legacy corpus mock ids. */
export function getMockOfferSelfDescriptionBody(offerId: string): Record<string, unknown> | undefined {
  return getMockSelfDescriptionFromRegistry(offerId) ?? getMockSelfDescriptionBody(offerId);
}

export const MOCK_CONTRACT_DEFINITIONS = [
  {
    '@id': '401b28d7-9a1c-459e-888c-c5002c523695',
    id: '401b28d7-9a1c-459e-888c-c5002c523695',
    '@type': 'ContractDefinition',
    accessPolicyId: '2b6b6b64-4c11-48d3-b8c1-51676e46b2b0',
    contractPolicyId: '551275b6-616b-4648-b235-312d86567572',
    assetsSelector: {
      '@type': 'Criterion',
      operandLeft: 'https://w3id.org/edc/v0.0.1/ns/id',
      operator: '=',
      operandRight: '408de5d6-f834-49f8-9fc2-fce122487cfe',
    },
  },
] as unknown as ContractDefinition[];

export const MOCK_ASSETS = [
  {
    '@id': '408de5d6-f834-49f8-9fc2-fce122487cfe',
    id: '408de5d6-f834-49f8-9fc2-fce122487cfe',
    accessPolicyId: '2b6b6b64-4c11-48d3-b8c1-51676e46b2b0',
    contractPolicyId: '551275b6-616b-4648-b235-312d86567572',
    '@type': 'Asset',
    properties: {
      name: 'Asset 03',
      id: '408de5d6-f834-49f8-9fc2-fce122487cfe',
      'offer.offer_name': 'Asset 03 (mock)',
      'offer.offerID': MOCK_OFFER_SELF_DESCRIPTION_ID,
      'offer.isPublic': 'true',
      'offer.isFree': 'true',
      assetType: 'ms:Corpus',
      assetDescription: 'Mock offer row for Mis ofertas when fixture mocks are enabled.',
      createdAt: '2026-01-15T10:00:00.000Z',
    },
    dataAddress: {
      '@type': 'DataAddress',
      method: 'GET',
      type: 'HttpData',
      name: 'edc-dashboard-6369cd4c-0c77-4c56-b33f-de2ba4aa9a7f',
      baseUrl: 'https://data.test.com',
    },
  },
] as unknown as Asset[];

export const MOCK_POLICIES = [
  {
    '@id': '551275b6-616b-4648-b235-312d86567572',
    id: '551275b6-616b-4648-b235-312d86567572',
    '@type': 'PolicyDefinition',
    createdAt: 1771252803929,
    policy: {
      '@id': '82b4e68d-f099-4b8b-8671-c5d7f2adbd88',
      '@type': 'odrl:Set',
      'odrl:permission': {
        'odrl:action': {
          '@id': 'odrl:use',
        },
        'odrl:constraint': {
          'odrl:leftOperand': {
            '@id': 'odrl:count',
          },
          'odrl:operator': {
            '@id': 'odrl:lteq',
          },
          'odrl:rightOperand': '10',
        },
      },
      'odrl:prohibition': [],
      'odrl:obligation': [],
      'odrl:assigner': 'dataprovider03',
      'odrl:target': {
        '@id': '408de5d6-f834-49f8-9fc2-fce122487cfe',
      },
    },
  },
  {
    '@id': '2b6b6b64-4c11-48d3-b8c1-51676e46b2b0',
    id: '2b6b6b64-4c11-48d3-b8c1-51676e46b2b0',
    '@type': 'PolicyDefinition',
    createdAt: 1771252803631,
    policy: {
      '@id': 'f0a68fdf-025e-43b7-b65a-b5efb591218f',
      '@type': 'odrl:Set',
      'odrl:permission': {
        'odrl:action': {
          '@id': 'http://simpl.eu/odrl/actions/consume',
        },
        'odrl:constraint': [
          {
            'odrl:leftOperand': {
              '@id': 'odrl:dateTime',
            },
            'odrl:operator': {
              '@id': 'odrl:gteq',
            },
            'odrl:rightOperand': '2026-02-01T14:38:40Z',
          },
          {
            'odrl:leftOperand': {
              '@id': 'odrl:dateTime',
            },
            'odrl:operator': {
              '@id': 'odrl:lteq',
            },
            'odrl:rightOperand': '2026-03-31T13:39:31Z',
          },
        ],
      },
      'odrl:prohibition': [],
      'odrl:obligation': [],
      'odrl:assigner': 'dataprovider03',
      'odrl:target': {
        '@id': '408de5d6-f834-49f8-9fc2-fce122487cfe',
      },
    },
  },
] as unknown as PolicyDefinition[];

export async function mockRequestContractDefinitions(): Promise<ContractDefinition[]> {
  return clone(MOCK_CONTRACT_DEFINITIONS);
}

export const MOCK_CREATE_ASSETS = [
  {
    '@id': 'asset-create-01',
    id: 'asset-create-01',
    '@type': 'Asset',
    properties: {
      name: 'Modelo de crecimiento de poblacion en ciudades',
      description: '24 documents from three different genres (Twitter, YouTube, news/journalism) annotated by gender.',
      createdAt: '2025-12-05',
      offerType: 'Modelo',
    },
    dataAddress: { '@type': 'DataAddress', type: 'HttpData' },
  },
  {
    '@id': 'asset-create-02',
    id: 'asset-create-02',
    '@type': 'Asset',
    properties: {
      name: 'Corpus of reviews',
      description: 'A corpus of English and French articles published in medical journals.',
      createdAt: '2025-10-15',
      offerType: 'Recurso',
    },
    dataAddress: { '@type': 'DataAddress', type: 'MinioS3' },
  },
  {
    '@id': 'asset-create-03',
    id: 'asset-create-03',
    '@type': 'Asset',
    properties: {
      name: 'Collection of Articles on Deforestation on Amazonia and prospects',
      description: 'The dataset contains 24 documents from three different genres.',
      createdAt: '2025-07-08',
      offerType: 'Corpus',
    },
    dataAddress: { '@type': 'DataAddress', type: 'MinioS3' },
  },
] as unknown as Asset[];

export async function mockRequestAssetsForCreate(): Promise<Asset[]> {
  return clone(MOCK_CREATE_ASSETS);
}

export const MOCK_CREATE_CONTRACT_POLICIES = [
  {
    '@id': 'policy-create-01',
    id: 'policy-create-01',
    '@type': 'PolicyDefinition',
    createdAt: '2025-12-05',
    policy: {
      '@id': 'policy-set-01',
      '@type': 'odrl:Set',
      'odrl:permission': { '@id': 'odrl:use' },
    },
    properties: {
      name: 'Lorem Ipsum fake policy license, Version 2.0',
      description: 'Apache License Version 2.0, January 2004 http://www.apache.org/licenses',
      policyType: 'Contratación',
    },
  },
  {
    '@id': 'policy-create-02',
    id: 'policy-create-02',
    '@type': 'PolicyDefinition',
    createdAt: '2025-07-12',
    policy: {
      '@id': 'policy-set-02',
      '@type': 'odrl:Set',
      'odrl:permission': { '@id': 'http://simpl.eu/odrl/actions/consume' },
    },
    properties: {
      name: 'Licencia LDS',
      description: 'LANGUAGE DATA SPACE STANDARD LICENCE',
      policyType: 'Contratación',
    },
  },
  {
    '@id': 'policy-create-03',
    id: 'policy-create-03',
    '@type': 'PolicyDefinition',
    createdAt: '2025-07-08',
    policy: {
      '@id': 'policy-set-03',
      '@type': 'odrl:Set',
      'odrl:permission': { '@id': 'odrl:use' },
    },
    properties: {
      name: 'Dominio público',
      description: 'El recurso está libre de todas las restricciones legales conocidas.',
      policyType: 'Contratación',
    },
  },
] as unknown as PolicyDefinition[];

export async function mockRequestPoliciesForCreateStep2(): Promise<PolicyDefinition[]> {
  return clone(MOCK_CREATE_CONTRACT_POLICIES);
}

export const MOCK_CREATE_PUBLICATION_POLICIES = [
  {
    '@id': 'publication-policy-01',
    id: 'publication-policy-01',
    '@type': 'PolicyDefinition',
    createdAt: '2025-10-15',
    policy: {
      '@id': 'publication-set-01',
      '@type': 'odrl:Set',
      'odrl:permission': { '@id': 'odrl:use' },
    },
    properties: {
      name: 'Union Europea',
      description: 'Activos ofertado sólo para conectores de la Unión Europea',
      policyType: 'Publicación',
    },
  },
  {
    '@id': 'publication-policy-02',
    id: 'publication-policy-02',
    '@type': 'PolicyDefinition',
    createdAt: '2025-05-15',
    policy: {
      '@id': 'publication-set-02',
      '@type': 'odrl:Set',
      'odrl:permission': { '@id': 'odrl:use' },
    },
    properties: {
      name: 'España',
      description: 'Activo ofertado sólo para conectores de España',
      policyType: 'Publicación',
    },
  },
  {
    '@id': 'publication-policy-03',
    id: 'publication-policy-03',
    '@type': 'PolicyDefinition',
    createdAt: '2025-05-10',
    policy: {
      '@id': 'publication-set-03',
      '@type': 'odrl:Set',
      'odrl:permission': { '@id': 'odrl:use' },
    },
    properties: {
      name: 'Sin restricción',
      description: 'Sin restricción',
      policyType: 'Publicación',
    },
  },
] as unknown as PolicyDefinition[];

export async function mockRequestPoliciesForCreateStep3(): Promise<PolicyDefinition[]> {
  return clone(MOCK_CREATE_PUBLICATION_POLICIES);
}

export async function mockGetAssetById(id: string): Promise<Asset | undefined> {
  const asset = MOCK_ASSETS.find(item => item.id === id);
  return asset ? clone(asset) : undefined;
}

export async function mockGetPolicyById(id: string): Promise<PolicyDefinition | undefined> {
  const policy = MOCK_POLICIES.find(item => item.id === id);
  return policy ? clone(policy) : undefined;
}

function clone<T>(input: T): T {
  return JSON.parse(JSON.stringify(input)) as T;
}
