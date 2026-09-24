import { Injectable, inject } from '@angular/core';
import Keycloak from 'keycloak-js';
import { decodeJwtPayload } from '@eclipse-edc/dashboard-core';
import { KEYCLOAK_RUNTIME_CONFIG, resolveAuthMode } from './keycloak-config-loader.service';
import { ManualTokenService } from './manual-token.service';
import type { ConnectorPerspective } from '@eclipse-edc/dashboard-core';
import { SD_CONSUMER, SD_PUBLISHER } from '../constants/roles.constants';

export function readRealmRoles(payload: Record<string, unknown> | undefined): string[] {
  const realmAccess = payload?.['realm_access'];
  if (!realmAccess || typeof realmAccess !== 'object') {
    return [];
  }
  const roles = (realmAccess as Record<string, unknown>)['roles'];
  return Array.isArray(roles) ? roles.filter((role): role is string => typeof role === 'string') : [];
}

@Injectable({
  providedIn: 'root',
})
export class UserRolesService {
  private readonly keycloak = inject(Keycloak);
  private readonly runtimeConfig = inject(KEYCLOAK_RUNTIME_CONFIG);
  private readonly manualTokenService = inject(ManualTokenService);

  hasPublisherRole(): boolean {
    if (resolveAuthMode(this.runtimeConfig) === 'bypass') {
      return true;
    }

    return this.getRealmRoles().includes(SD_PUBLISHER);
  }

  hasConsumerRole(): boolean {
    if (resolveAuthMode(this.runtimeConfig) === 'bypass') {
      return true;
    }

    return this.getRealmRoles().includes(SD_CONSUMER);
  }

  getConnectorPerspective(): ConnectorPerspective {
    return this.hasPublisherRole() ? 'PROVIDER' : 'CONSUMER';
  }

  /**
   * Every perspective the user can act in. Holding both roles means the user is provider *and*
   * consumer, so both must be reported: reducing to `getConnectorPerspective()` would hide the
   * negotiations and transfers where they act as consumer.
   */
  getConnectorPerspectives(): ConnectorPerspective[] {
    const perspectives: ConnectorPerspective[] = [];
    if (this.hasPublisherRole()) {
      perspectives.push('PROVIDER');
    }
    if (this.hasConsumerRole()) {
      perspectives.push('CONSUMER');
    }
    return perspectives.length > 0 ? perspectives : ['CONSUMER'];
  }

  getRealmRoles(): string[] {
    const authMode = resolveAuthMode(this.runtimeConfig);
    if (authMode === 'bypass') {
      return [SD_PUBLISHER, SD_CONSUMER];
    }

    if (authMode === 'manual-token') {
      const token = this.manualTokenService.getToken();
      if (!token) {
        return [];
      }
      return readRealmRoles(decodeJwtPayload(token));
    }

    const parsed = this.keycloak.tokenParsed as Record<string, unknown> | undefined;
    return readRealmRoles(parsed);
  }
}
