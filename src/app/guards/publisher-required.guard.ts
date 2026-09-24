import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { KEYCLOAK_RUNTIME_CONFIG, resolveAuthMode } from '../services/keycloak-config-loader.service';
import { UserRolesService } from '../services/user-roles.service';

export const publisherRequiredGuard: CanActivateFn = () => {
  const runtimeConfig = inject(KEYCLOAK_RUNTIME_CONFIG);
  const router = inject(Router);
  const userRolesService = inject(UserRolesService);

  if (resolveAuthMode(runtimeConfig) === 'bypass') {
    return true;
  }

  if (userRolesService.hasPublisherRole()) {
    return true;
  }

  return router.createUrlTree(['/home']);
};
