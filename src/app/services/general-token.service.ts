import { Injectable, inject } from '@angular/core';
import { KeycloakTokenService } from './keycloak-token.service';

@Injectable({
  providedIn: 'root',
})
export class GeneralTokenService {
  private readonly keycloakTokenService = inject(KeycloakTokenService);

  async getValidAccessToken(minValiditySeconds = 30): Promise<string> {
    return this.keycloakTokenService.getValidAccessToken(minValiditySeconds);
  }

  async handleUnauthorizedResponse(): Promise<void> {
    await this.keycloakTokenService.handleUnauthorizedResponse();
  }

  async logout(): Promise<void> {
    await this.keycloakTokenService.logout();
  }
}
