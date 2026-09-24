/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

import type { Asset, TransferProcess } from '@think-it-labs/edc-connector-client';

const BASE_CONTEXT = {
  '@vocab': 'https://w3id.org/edc/v0.0.1/ns/',
  edc: 'https://w3id.org/edc/v0.0.1/ns/',
  odrl: 'http://www.w3.org/ns/odrl/2/',
} as const;

export const MOCK_TRANSFER_ASSET_ID = '408de5d6-f834-49f8-9fc2-fce122487cfe';

/** Agreement id shared by fixture transfer rows (maps to mock external connector label). */
export const MOCK_TRANSFER_CONTRACT_AGREEMENT_ID = 'b15f6afa-6860-4377-982f-3a5ca6fc2b81';

/** Static counterparty labels when fixture mocks avoid HTTP negotiation calls. */
export const TRANSFER_FIXTURE_CONNECTOR_BY_CONTRACT_ID: ReadonlyMap<string, string> = new Map([
  [MOCK_TRANSFER_CONTRACT_AGREEMENT_ID.toLowerCase(), 'Mock External Connector'],
]);

/** Catalog row for resolving asset names when transfer fixture mocks are on. */
export const TRANSFER_FIXTURE_CATALOG_ASSETS: readonly Asset[] = [
  {
    '@id': MOCK_TRANSFER_ASSET_ID,
    id: MOCK_TRANSFER_ASSET_ID,
    '@type': 'Asset',
    properties: {
      name: 'Asset 03',
      id: MOCK_TRANSFER_ASSET_ID,
      assetDescription: 'Transfer history fixture catalog asset.',
    },
    dataAddress: {
      '@type': 'DataAddress',
      type: 'HttpData',
      baseUrl: 'https://data.test.com',
    },
  } as unknown as Asset,
];

const STATES = [
  'INITIAL',
  'PROVISIONED',
  'REQUESTED',
  'STARTED',
  'COMPLETED',
  'SUSPENDED',
  'TERMINATED',
  'DEPROVISIONED',
] as const;

function mockProcess(
  id: string,
  type: 'CONSUMER' | 'PROVIDER',
  state: string,
  createdAt: number,
  extra?: Record<string, unknown>,
): TransferProcess {
  const edc = BASE_CONTEXT.edc;
  return {
    '@context': { ...BASE_CONTEXT },
    '@id': id,
    '@type': 'TransferProcess',
    id,
    type,
    state,
    stateTimestamp: createdAt,
    createdAt,
    correlationId: `corr-${id}`,
    assetId: MOCK_TRANSFER_ASSET_ID,
    contractId: MOCK_TRANSFER_CONTRACT_AGREEMENT_ID,
    /** Expanded JSON-LD keys (some client shapes only expose these). */
    [`${edc}assetId`]: MOCK_TRANSFER_ASSET_ID,
    [`${edc}contractAgreementId`]: MOCK_TRANSFER_CONTRACT_AGREEMENT_ID,
    transferType: 'HttpData-PUSH',
    callbackAddresses: [],
    ...extra,
  } as unknown as TransferProcess;
}

function buildConsumerFixtures(): TransferProcess[] {
  return STATES.map((state, i) =>
    mockProcess(`mock-tp-consumer-${state.toLowerCase()}`, 'CONSUMER', state, 1_771_500_000_000 + i * 60_000, {
      transferType: i % 2 === 0 ? 'HttpData-PUSH' : 'HttpData-PULL',
    }),
  );
}

function buildProviderDeprovisionedSample(): TransferProcess {
  return mockProcess('626729d5-c193-4a87-987a-30b1a7858160', 'PROVIDER', 'DEPROVISIONED', 1_771_442_631_564, {
    correlationId: '9a44420f-23f6-4578-b4d1-be93abb3e0b3',
    errorDetail:
      'GENERAL_ERROR: Error processing data transfer request - Request ID: 626729d5-c193-4a87-987a-30b1a7858160. Message: org.eclipse.edc.spi.EdcException: java.net.UnknownHostException: data.test.com',
    dataDestination: {
      '@type': 'DataAddress',
      type: 'HttpData',
      baseUrl: 'https://data.test.com',
    },
  });
}

function buildProviderFixtures(): TransferProcess[] {
  const rest = STATES.filter(s => s !== 'DEPROVISIONED').map((state, i) =>
    mockProcess(`mock-tp-provider-${state.toLowerCase()}`, 'PROVIDER', state, 1_771_600_000_000 + i * 60_000),
  );
  return [buildProviderDeprovisionedSample(), ...rest];
}

/**
 * Fixture rows when `dashboardMocksEnabled` is on (same flag as Mis ofertas / negotiations).
 */
export function getFixtureTransferProcesses(contractType: 'CONSUMER' | 'PROVIDER'): TransferProcess[] {
  if (contractType === 'PROVIDER') {
    return buildProviderFixtures();
  }
  return buildConsumerFixtures();
}
