/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

import type { EdcConfig } from '../models/edc-config';
import { allowDashboardMocks, useFixtureMocks, useSdWarmupMock } from './dashboard-mocks.util';

describe('dashboard-mocks.util', () => {
  const base: EdcConfig = {
    connectorName: 'c',
    managementUrl: 'https://x/m',
    defaultUrl: 'https://x/a',
    protocolUrl: 'https://x/p',
    federatedCatalogEnabled: false,
  };

  it('allowDashboardMocks is false when config is undefined', () => {
    expect(allowDashboardMocks(undefined)).toBeFalse();
  });

  it('allowDashboardMocks is false when dashboardMocksEnabled is omitted', () => {
    expect(allowDashboardMocks({ ...base })).toBeFalse();
  });

  it('allowDashboardMocks is true when dashboardMocksEnabled is true', () => {
    expect(allowDashboardMocks({ ...base, dashboardMocksEnabled: true })).toBeTrue();
  });

  it('allowDashboardMocks is false when dashboardMocksEnabled is false', () => {
    expect(allowDashboardMocks({ ...base, dashboardMocksEnabled: false })).toBeFalse();
  });

  it('useSdWarmupMock matches allowDashboardMocks (single flag)', () => {
    expect(useSdWarmupMock({ ...base, dashboardMocksEnabled: true })).toBeTrue();
    expect(useSdWarmupMock({ ...base })).toBeFalse();
    expect(useSdWarmupMock({ ...base, dashboardMocksEnabled: false })).toBeFalse();
  });

  it('useFixtureMocks matches allowDashboardMocks', () => {
    expect(useFixtureMocks({ ...base, dashboardMocksEnabled: true })).toBeTrue();
    expect(useFixtureMocks({ ...base })).toBeFalse();
    expect(useFixtureMocks({ ...base, dashboardMocksEnabled: false })).toBeFalse();
  });
});
