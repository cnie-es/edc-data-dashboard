import {
  SD_MATCHED_ASSETS_MOCK_ACCESS_POLICY_ID,
  SD_MATCHED_ASSETS_MOCK_CONTRACT_POLICY_ID,
} from '@eclipse-edc/dashboard-core';

const MOCK_CONTEXT = {
  '@vocab': 'https://w3id.org/edc/v0.0.1/ns/',
  edc: 'https://w3id.org/edc/v0.0.1/ns/',
  odrl: 'http://www.w3.org/ns/odrl/2/',
} as const;

/** ODRL payload aligned with Cypress `policy-definition-get-200.json` (contract / mock asset). */
const CONTRACT_POLICY_DEFINITION_MOCK: Record<string, unknown> = {
  '@id': SD_MATCHED_ASSETS_MOCK_CONTRACT_POLICY_ID,
  '@type': 'PolicyDefinition',
  createdAt: 1771252803631,
  policy: {
    '@id': '171292af-f8a2-4337-9b70-af5b9fe8c4ef',
    '@type': 'odrl:Set',
    'odrl:permission': {
      'odrl:action': {
        '@id': 'http://simpl.eu/odrl/actions/consume',
      },
      'odrl:constraint': [
        {
          'odrl:leftOperand': { '@id': 'odrl:dateTime' },
          'odrl:operator': { '@id': 'odrl:gteq' },
          'odrl:rightOperand': '2026-02-01T14:38:40Z',
        },
        {
          'odrl:leftOperand': { '@id': 'odrl:dateTime' },
          'odrl:operator': { '@id': 'odrl:lteq' },
          'odrl:rightOperand': '2026-03-31T13:39:31Z',
        },
      ],
    },
    'odrl:prohibition': [],
    'odrl:obligation': [],
    'odrl:assigner': 'dataprovider03',
    'odrl:target': { '@id': '408de5d6-f834-49f8-9fc2-fce122487cfe' },
  },
  '@context': { ...MOCK_CONTEXT },
};

/** Publication-style mock (access policy on matched-asset cache). */
const ACCESS_POLICY_DEFINITION_MOCK: Record<string, unknown> = {
  '@id': SD_MATCHED_ASSETS_MOCK_ACCESS_POLICY_ID,
  '@type': 'PolicyDefinition',
  createdAt: 1771252804000,
  policy: {
    '@id': 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    '@type': 'odrl:Set',
    'odrl:permission': {
      'odrl:action': { '@id': 'odrl:use' },
    },
    'odrl:prohibition': [],
    'odrl:obligation': [],
  },
  '@context': { ...MOCK_CONTEXT },
};

/**
 * When the policy id matches offline SD–matched asset mocks, return a stable PolicyDefinition-shaped
 * object so **Formato ODRL** renders without calling the management API.
 */
export function getMockPolicyDefinitionForRouteId(policyDefinitionId: string): Record<string, unknown> | null {
  if (policyDefinitionId === SD_MATCHED_ASSETS_MOCK_CONTRACT_POLICY_ID) {
    return CONTRACT_POLICY_DEFINITION_MOCK;
  }
  if (policyDefinitionId === SD_MATCHED_ASSETS_MOCK_ACCESS_POLICY_ID) {
    return ACCESS_POLICY_DEFINITION_MOCK;
  }
  return null;
}
