import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { EdcRawCacheWarmupService } from '@eclipse-edc/dashboard-core';
import { KEYCLOAK_RUNTIME_CONFIG, resolveAuthMode } from '../services/keycloak-config-loader.service';
import { GeneralTokenService } from '../services/general-token.service';

export const authRequiredGuard: CanActivateFn = async (_route, state) => {
  const runtimeConfig = inject(KEYCLOAK_RUNTIME_CONFIG);
  const router = inject(Router);
  const generalTokenService = inject(GeneralTokenService);
  const rawCacheWarmup = inject(EdcRawCacheWarmupService);
  const authMode = resolveAuthMode(runtimeConfig);
  if (authMode === 'bypass') {
    return true;
  }

  try {
    const token = await generalTokenService.getValidAccessToken();
    console.debug('[authRequiredGuard] Valid token resolved, scheduling raw cache warmup');
    rawCacheWarmup.scheduleAfterAuth(token);
    return true;
  } catch {
    console.debug('[authRequiredGuard] Unable to resolve valid token', { authMode });
    if (authMode === 'manual-token') {
      return router.createUrlTree(['/manual-token-login'], {
        queryParams: {
          returnUrl: state.url || '/home',
        },
      });
    }
    return false;
  }
};
