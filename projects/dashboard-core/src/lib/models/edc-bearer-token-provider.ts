import { InjectionToken } from '@angular/core';

export interface EdcBearerTokenProvider {
  getBearerToken: () => Promise<string | undefined>;
}

export const DASHBOARD_EDC_BEARER_TOKEN_PROVIDER = new InjectionToken<EdcBearerTokenProvider>(
  'DASHBOARD_EDC_BEARER_TOKEN_PROVIDER',
  {
    providedIn: 'root',
    factory: () => ({
      getBearerToken: async () => undefined,
    }),
  },
);
