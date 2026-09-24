/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

import type { EdcConfig } from '../models/edc-config';

/** Strict opt-in: only explicit `true` enables dashboard mocks (`false` or omitted = off). */
export function allowDashboardMocks(config: EdcConfig | undefined): boolean {
  return config?.dashboardMocksEnabled === true;
}

/** Fixture-based self-description / contract-definition data (same gate as other dashboard mocks). */
export function useFixtureMocks(config: EdcConfig | undefined): boolean {
  return allowDashboardMocks(config);
}

/** Deterministic SD–asset warmup payloads (same single flag as fixtures and policy embedded mocks). */
export function useSdWarmupMock(config: EdcConfig | undefined): boolean {
  return allowDashboardMocks(config);
}
