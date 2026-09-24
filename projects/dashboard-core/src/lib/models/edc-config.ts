/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  This program and the accompanying materials are made available under the
 *  terms of the Apache License, Version 2.0 which is available at
 *  https://www.apache.org/licenses/LICENSE-2.0
 *
 *  SPDX-License-Identifier: Apache-2.0
 *
 *  Contributors:
 *       Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V. - initial API and implementation
 *
 */

export interface EdcConfig {
  connectorName: string;
  managementUrl: string;
  defaultUrl: string;
  protocolUrl: string;
  xfscAdvSearchApiBaseUrl?: string; // Default: '/xfsc-advsearch-be/v1'
  contractConsumptionApiBaseUrl?: string; // Default: '/contract-consumption-api'
  contractConsumptionApiVersion?: string; // Default: 'v1'
  sdToolingApiBaseUrl?: string; // Default: '/sdtooling-api/v2'
  /**
   * Base URL of the Data Dashboard participant API (does NOT go through the EDC management API).
   * The participant lookup endpoint is built as `${dashboardApiBaseUrl}/tier1/v2/participants/{id}`.
   * Default: '/datashboardApi'
   */
  dashboardApiBaseUrl?: string;
  /**
   * Optional override for the GET schema catalog used on offer creation.
   * When omitted, the URL is `${resolved sdToolingApiBaseUrl}/schemas` (same v2 base as SD Tooling; default `/sdtooling-api/v2/schemas`).
   */
  offerCreationSchemasUrl?: string;
  signerApiBaseUrl?: string; // Default: '/signer'
  controlUrl?: string;
  federatedCatalogEnabled: boolean;
  federatedCatalogUrl?: string;
  did?: string;
  /**
   * Strict opt-in: when `true`, enables fixture mocks, SD matched-assets warmup mocks, embedded policy ODRL mocks
   * for known mock ids, and the static connector data locations table. Omitted or `false`: all off (no `ng serve` gate).
   */
  dashboardMocksEnabled?: boolean;
}
