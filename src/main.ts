import { bootstrapApplication } from '@angular/platform-browser';
import { createAppConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

import { registerLocaleData } from '@angular/common';
import localeCa from '@angular/common/locales/ca';
import localeEs from '@angular/common/locales/es';
import localeEu from '@angular/common/locales/eu';
import localeGl from '@angular/common/locales/gl';

import {
  KEYCLOAK_CONFIG_PATH,
  assertValidKeycloakRuntimeConfig,
  resolveAuthMode,
  type KeycloakRuntimeConfig,
} from './app/services/keycloak-config-loader.service';

async function bootstrap(): Promise<void> {
  registerLocaleData(localeEs);
  registerLocaleData(localeCa);
  registerLocaleData(localeGl);
  registerLocaleData(localeEu);

  const response = await fetch(KEYCLOAK_CONFIG_PATH);
  if (!response.ok) {
    throw new Error(
      `Failed to load '${KEYCLOAK_CONFIG_PATH}' before bootstrap (status ${response.status}). Ensure the file exists in 'public/config'.`,
    );
  }

  const keycloakConfig: unknown = await response.json();
  assertValidKeycloakRuntimeConfig(keycloakConfig, KEYCLOAK_CONFIG_PATH);

  const resolvedConfig = keycloakConfig as KeycloakRuntimeConfig;

  const effectiveOnLoad = resolvedConfig.initOptions?.onLoad ?? 'login-required';
  const effectiveAuthMode = resolveAuthMode(resolvedConfig);

  console.info(
    `[Keycloak] Loaded runtime config (realm='${resolvedConfig.realm}', clientId='${resolvedConfig.clientId}', onLoad='${effectiveOnLoad}', authMode='${effectiveAuthMode}')`,
  );

  await bootstrapApplication(AppComponent, createAppConfig(resolvedConfig));
}

bootstrap().catch(err => console.error(err));
