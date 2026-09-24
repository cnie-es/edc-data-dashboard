import { Injectable, InjectionToken, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export type KeycloakOnLoad = 'login-required' | 'check-sso';
export type AuthMode = 'keycloak' | 'bypass' | 'manual-token';

export interface KeycloakInitOptions {
  onLoad?: KeycloakOnLoad;
  checkLoginIframe?: boolean;
  pkceMethod?: 'S256' | false;
  silentCheckSsoRedirectUri?: string;
}

export interface KeycloakRuntimeConfig {
  url: string;
  realm: string;
  clientId: string;
  authMode: AuthMode;
  initOptions?: KeycloakInitOptions;
}

export const KEYCLOAK_CONFIG_PATH = 'config/keycloak-config.json';
export const KEYCLOAK_RUNTIME_CONFIG = new InjectionToken<KeycloakRuntimeConfig>('KEYCLOAK_RUNTIME_CONFIG');

const AUTH_MODES: ReadonlySet<AuthMode> = new Set<AuthMode>(['keycloak', 'bypass', 'manual-token']);

export function resolveAuthMode(config: KeycloakRuntimeConfig): AuthMode {
  return config.authMode;
}

export function assertValidKeycloakRuntimeConfig(
  config: unknown,
  source: string = KEYCLOAK_CONFIG_PATH,
): asserts config is KeycloakRuntimeConfig {
  if (!config || typeof config !== 'object') {
    throw new Error(`Invalid Keycloak config in '${source}': expected a JSON object.`);
  }

  const value = config as Partial<KeycloakRuntimeConfig>;
  const missing: string[] = [];
  if (!value.url?.trim()) missing.push('url');
  if (!value.realm?.trim()) missing.push('realm');
  if (!value.clientId?.trim()) missing.push('clientId');

  if (missing.length > 0) {
    throw new Error(`Invalid Keycloak config in '${source}'. Missing required field(s): ${missing.join(', ')}`);
  }

  if (typeof value.authMode !== 'undefined' && !AUTH_MODES.has(value.authMode)) {
    throw new Error(
      `Invalid Keycloak config in '${source}'. 'authMode' must be one of: 'keycloak', 'bypass', 'manual-token'.`,
    );
  }
  if (!value.authMode) {
    throw new Error(
      `Invalid Keycloak config in '${source}'. Missing required field 'authMode' ('keycloak' | 'bypass' | 'manual-token').`,
    );
  }

  if (
    value.initOptions?.onLoad &&
    value.initOptions.onLoad !== 'login-required' &&
    value.initOptions.onLoad !== 'check-sso'
  ) {
    throw new Error(
      `Invalid Keycloak config in '${source}'. 'initOptions.onLoad' must be either 'login-required' or 'check-sso'.`,
    );
  }
}

@Injectable({
  providedIn: 'root',
})
export class KeycloakConfigLoaderService {
  private readonly http = inject(HttpClient);
  private config?: KeycloakRuntimeConfig;

  async load(): Promise<void> {
    const loaded = await firstValueFrom(this.http.get<unknown>(KEYCLOAK_CONFIG_PATH)).catch(error => {
      throw new Error(
        `[${this.constructor.name}] Failed to load '${KEYCLOAK_CONFIG_PATH}'. Ensure the file exists in 'public/config' and is mounted in deployment. Cause: ${error?.message ?? error}`,
      );
    });

    assertValidKeycloakRuntimeConfig(loaded, KEYCLOAK_CONFIG_PATH);
    this.config = loaded;
  }

  getConfig(): KeycloakRuntimeConfig {
    if (!this.config) {
      throw new Error(
        `[${this.constructor.name}] Keycloak config was requested before being loaded. Call load() during app initialization.`,
      );
    }
    return this.config;
  }
}
