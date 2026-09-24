import {
  SD_MATCHED_ASSETS_MOCK_ACCESS_POLICY_ID,
  SD_MATCHED_ASSETS_MOCK_CONTRACT_POLICY_ID,
} from '@eclipse-edc/dashboard-core';

import { getMockPolicyDefinitionForRouteId } from './policy-definition-mock.response';

describe('getMockPolicyDefinitionForRouteId', () => {
  it('returns ODRL-shaped mock for contract policy id', () => {
    const m = getMockPolicyDefinitionForRouteId(SD_MATCHED_ASSETS_MOCK_CONTRACT_POLICY_ID);
    expect(m).not.toBeNull();
    expect(m?.['@id']).toBe(SD_MATCHED_ASSETS_MOCK_CONTRACT_POLICY_ID);
    expect((m?.['policy'] as Record<string, unknown>)?.['@type']).toBe('odrl:Set');
  });

  it('returns ODRL-shaped mock for access policy id', () => {
    const m = getMockPolicyDefinitionForRouteId(SD_MATCHED_ASSETS_MOCK_ACCESS_POLICY_ID);
    expect(m).not.toBeNull();
    expect(m?.['@id']).toBe(SD_MATCHED_ASSETS_MOCK_ACCESS_POLICY_ID);
  });

  it('returns null for unknown ids', () => {
    expect(getMockPolicyDefinitionForRouteId('unknown-uuid')).toBeNull();
  });
});
