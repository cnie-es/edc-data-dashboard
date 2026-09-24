export type PolicyEnrichmentStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface PolicyApi {
  '@id': string;
  '@type'?: string;
  createdAt?: number;
  name?: string;

  policy?: {
    'odrl:permission'?: ODRLPermission | ODRLPermission[];
    'odrl:target'?: {
      '@id'?: string;
    };
  };
}

export interface ODRLPermission {
  'odrl:action'?: {
    '@id'?: string;
  };
}

export interface PolicyUI {
  /** Stable unique key for `@for` track (e.g. assetId + role + policy id). */
  id: string;
  /** Policy definition id used for `/policies/detail/:id` navigation. */
  policyDefinitionId: string;
  name: string;
  type: 'Contratación' | 'Publicación' | 'Otro';
  description: string;
  date: string;
  /** Human-readable title from the linked asset (catalog name priority). */
  assetDisplayName: string;
  enrichmentStatus: PolicyEnrichmentStatus;
}

/** dd/MM/yyyy aligned with `PolicyViewComponent` spec mock asset `properties.createdAt` (2026-05-13). */
export const POLICY_LIST_DATE_TEST_FIXTURE = '13/05/2026';
