import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import Keycloak from 'keycloak-js';
import { KEYCLOAK_RUNTIME_CONFIG, resolveAuthMode } from './keycloak-config-loader.service';
import { ManualTokenService } from './manual-token.service';

@Injectable({
  providedIn: 'root',
})
export class KeycloakTokenService {
  private readonly keycloak = inject(Keycloak);
  private readonly router = inject(Router);
  private readonly runtimeConfig = inject(KEYCLOAK_RUNTIME_CONFIG);
  private readonly manualTokenService = inject(ManualTokenService);
  private redirectInProgress = false;

  async getValidAccessToken(minValiditySeconds = 30): Promise<string> {
    const authMode = resolveAuthMode(this.runtimeConfig);
    if (authMode === 'bypass') {
      throw new Error('Auth bypass mode is enabled; Keycloak token is not required.');
    }
    if (authMode === 'manual-token') {
      const token = this.manualTokenService.getToken();
      if (!token) {
        throw new Error('Manual token auth mode is enabled, but no development token has been provided yet.');
      }
      return token;
    }

    if (!this.keycloak.authenticated) {
      await this.triggerLogin();
      throw new Error('User is not authenticated.');
    }

    try {
      await this.keycloak.updateToken(minValiditySeconds);
    } catch (error) {
      await this.triggerLogin();
      throw new Error(`Could not refresh Keycloak token: ${String(error)}`);
    }

    if (!this.keycloak.token) {
      await this.triggerLogin();
      throw new Error('Keycloak token is missing after refresh.');
    }

    return this.keycloak.token;
  }

  async handleUnauthorizedResponse(): Promise<void> {
    const authMode = resolveAuthMode(this.runtimeConfig);
    if (authMode === 'bypass') {
      return;
    }
    if (authMode === 'manual-token') {
      this.manualTokenService.clearToken();
      return;
    }
    await this.triggerLogin();
  }

  async logout(): Promise<void> {
    const authMode = resolveAuthMode(this.runtimeConfig);
    if (authMode === 'manual-token') {
      this.manualTokenService.clearToken();
      await this.router.navigateByUrl('/manual-token-login');
      return;
    }
    if (authMode === 'bypass') {
      return;
    }
    await this.keycloak.logout({
      redirectUri: `${window.location.origin}${window.location.pathname}`,
    });
  }

  private async triggerLogin(): Promise<void> {
    if (resolveAuthMode(this.runtimeConfig) !== 'keycloak') {
      return;
    }

    if (this.redirectInProgress) {
      return;
    }
    this.redirectInProgress = true;
    await this.keycloak.login({ redirectUri: window.location.href });
  }
}
