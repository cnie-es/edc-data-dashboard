import { InjectionToken } from '@angular/core';

export type ConnectorPerspective = 'CONSUMER' | 'PROVIDER';

export interface ConnectorPerspectiveProvider {
  /** Primary perspective, used where a single role must be picked. */
  getPerspective(): ConnectorPerspective;
  /**
   * Every perspective the user can act in. A user holding both the publisher and the consumer
   * role acts as provider *and* consumer, so lists must not be reduced to `getPerspective()`.
   * Optional so existing providers keep working.
   */
  getPerspectives?(): ConnectorPerspective[];
}

/**
 * De-duplicated list of perspectives the user can act in, falling back to the single
 * `getPerspective()` value for providers that don't implement `getPerspectives()`.
 */
export function resolveConnectorPerspectives(provider: ConnectorPerspectiveProvider): ConnectorPerspective[] {
  const declared = provider.getPerspectives?.() ?? [];
  const unique = [...new Set(declared.filter(p => p === 'PROVIDER' || p === 'CONSUMER'))];
  return unique.length > 0 ? unique : [provider.getPerspective()];
}

export const DASHBOARD_CONNECTOR_PERSPECTIVE = new InjectionToken<ConnectorPerspectiveProvider>(
  'DASHBOARD_CONNECTOR_PERSPECTIVE',
  {
    providedIn: 'root',
    factory: () => ({
      getPerspective: () => 'CONSUMER' as ConnectorPerspective,
      getPerspectives: () => ['CONSUMER' as ConnectorPerspective],
    }),
  },
);
