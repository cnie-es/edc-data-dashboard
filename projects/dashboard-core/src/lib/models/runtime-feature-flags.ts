import { InjectionToken } from '@angular/core';

export interface RuntimeFeatureFlags {
  authMode: 'keycloak' | 'bypass' | 'manual-token';
}

export const DASHBOARD_RUNTIME_FEATURE_FLAGS = new InjectionToken<RuntimeFeatureFlags>(
  'DASHBOARD_RUNTIME_FEATURE_FLAGS',
  {
    providedIn: 'root',
    factory: () => ({
      authMode: 'keycloak',
    }),
  },
);
