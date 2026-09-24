/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

import type { Pair } from '@eclipse-edc/dashboard-core';
import type { Asset, ContractAgreement, ContractNegotiation } from '@think-it-labs/edc-connector-client';

const BASE_CONTEXT = {
  '@vocab': 'https://w3id.org/edc/v0.0.1/ns/',
  edc: 'https://w3id.org/edc/v0.0.1/ns/',
  odrl: 'http://www.w3.org/ns/odrl/2/',
} as const;

/** Catalog row used only for fixture mocks (aligned with Mis ofertas mock asset id for consistent demos). */
export const MOCK_ASSET_ID = '408de5d6-f834-49f8-9fc2-fce122487cfe';

export const NEGOTIATION_FIXTURE_CATALOG_ASSETS: readonly Asset[] = [
  {
    '@id': MOCK_ASSET_ID,
    id: MOCK_ASSET_ID,
    '@type': 'Asset',
    properties: {
      name: 'Asset 03',
      id: MOCK_ASSET_ID,
      'offer.offer_name': 'Asset 03 (mock)',
      assetType: 'ms:Corpus',
      assetDescription: 'Negotiations fixture catalog asset.',
    },
    dataAddress: {
      '@type': 'DataAddress',
      method: 'GET',
      type: 'HttpData',
      baseUrl: 'https://data.test.com',
    },
  } as unknown as Asset,
];

const PROVIDER_STATES: NonNullable<ContractNegotiation['state']>[] = [
  'INITIAL',
  'REQUESTING',
  'REQUESTED',
  'OFFERING',
  'OFFERED',
  'ACCEPTING',
  'ACCEPTED',
  'AGREEING',
  'AGREED',
  'VERIFYING',
  'VERIFIED',
  'FINALIZING',
  'FINALIZED',
  'TERMINATING',
  'TERMINATED',
];

function baseNegotiation(
  id: string,
  type: 'CONSUMER' | 'PROVIDER',
  state: NonNullable<ContractNegotiation['state']>,
  createdAt: number,
  extra?: Partial<ContractNegotiation>,
): ContractNegotiation {
  return {
    '@context': { ...BASE_CONTEXT },
    '@id': id,
    '@type': 'ContractNegotiation',
    id,
    type,
    state,
    protocol: 'dataspace-protocol-http',
    counterPartyId: 'consumer03',
    callbackAddresses: [],
    createdAt,
    ...extra,
  } as unknown as ContractNegotiation;
}

function baseAgreement(agreementId: string, assetId: string, policyId: string): ContractAgreement {
  return {
    id: agreementId,
    assetId,
    providerId: 'dataprovider',
    consumerId: 'consumer03',
    policy: { '@id': policyId, '@type': 'odrl:Agreement' },
    contractSigningDate: 1_776_329_624,
  } as unknown as ContractAgreement;
}

const createdAt = (i: number) => 1_771_200_000_000 + i * 60_000;

let _cachedProviderPairs: Pair<ContractAgreement, ContractNegotiation>[] | undefined;

function buildProviderFixturePairs(): Pair<ContractAgreement, ContractNegotiation>[] {
  if (_cachedProviderPairs) {
    return _cachedProviderPairs;
  }
  const pairs: Pair<ContractAgreement, ContractNegotiation>[] = PROVIDER_STATES.map((state, i) => {
    const nid = `mock-neg-provider-${state.toLowerCase()}`;
    const useUnknownAsset = state === 'TERMINATED';
    const assetId = useUnknownAsset ? 'unknown' : MOCK_ASSET_ID;
    const negotiation = baseNegotiation(nid, 'PROVIDER', state, createdAt(i), {
      contractAgreementId: state === 'FINALIZED' ? `mock-agr-${state}` : undefined,
      errorDetail:
        state === 'TERMINATED'
          ? JSON.stringify({
              '@type': 'dspace:ContractNegotiationError',
              'dspace:code': '400',
              'dspace:reason': 'Policy in the contract agreement is not equal to the one in the contract offer',
            })
          : undefined,
    });
    const agreement = baseAgreement(`mock-agr-${state}`, assetId, `mock-pol-${state}`);
    return [agreement, negotiation] as Pair<ContractAgreement, ContractNegotiation>;
  });
  _cachedProviderPairs = pairs;
  return pairs;
}

const CONSUMER_PAIRS: Pair<ContractAgreement, ContractNegotiation>[] = [
  [
    baseAgreement('mock-agr-consumer-req', MOCK_ASSET_ID, 'mock-pol-consumer-1'),
    baseNegotiation('mock-neg-consumer-requested', 'CONSUMER', 'REQUESTED', createdAt(100)),
  ],
  [
    baseAgreement('mock-agr-consumer-fin', MOCK_ASSET_ID, 'mock-pol-consumer-2'),
    baseNegotiation('mock-neg-consumer-finalized', 'CONSUMER', 'FINALIZED', createdAt(101), {
      contractAgreementId: 'mock-agr-consumer-fin',
    }),
  ],
];

/**
 * Fixture rows for the negotiations table when `dashboardMocksEnabled` is on (same flag as Mis ofertas).
 */
export function getFixtureNegotiationPairs(
  contractType: 'CONSUMER' | 'PROVIDER',
): Pair<ContractAgreement, ContractNegotiation>[] {
  if (contractType === 'CONSUMER') {
    return [...CONSUMER_PAIRS];
  }
  return buildProviderFixturePairs();
}
