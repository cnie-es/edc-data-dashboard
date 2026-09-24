import { TestBed } from '@angular/core/testing';
import Keycloak from 'keycloak-js';
import { KEYCLOAK_RUNTIME_CONFIG, type KeycloakRuntimeConfig } from './keycloak-config-loader.service';
import { ManualTokenService } from './manual-token.service';
import { SD_CONSUMER, SD_PUBLISHER } from '../constants/roles.constants';
import { UserRolesService } from './user-roles.service';

function jwtWithRoles(roles: string[]): string {
  const header = btoa(JSON.stringify({ alg: 'none' })).replace(/=/g, '');
  const payload = btoa(JSON.stringify({ realm_access: { roles } })).replace(/=/g, '');
  return `${header}.${payload}.sig`;
}

describe('UserRolesService', () => {
  let runtimeConfig: KeycloakRuntimeConfig;
  let keycloakMock: { tokenParsed?: Record<string, unknown> };
  let manualTokenService: ManualTokenService;

  beforeEach(() => {
    runtimeConfig = {
      url: 'https://keycloak.example.com',
      realm: 'example',
      clientId: 'dashboard',
      authMode: 'keycloak',
    };
    keycloakMock = {
      tokenParsed: { realm_access: { roles: [SD_PUBLISHER, 'CATALOG_R'] } },
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: KEYCLOAK_RUNTIME_CONFIG, useValue: runtimeConfig },
        { provide: Keycloak, useValue: keycloakMock },
        ManualTokenService,
        UserRolesService,
      ],
    });

    manualTokenService = TestBed.inject(ManualTokenService);
  });

  it('returns true for publisher role in keycloak mode', () => {
    const service = TestBed.inject(UserRolesService);
    expect(service.hasPublisherRole()).toBeTrue();
    expect(service.getRealmRoles()).toContain(SD_PUBLISHER);
  });

  it('returns false when only consumer role is present', () => {
    keycloakMock.tokenParsed = { realm_access: { roles: [SD_CONSUMER, 'CATALOG_R'] } };
    const service = TestBed.inject(UserRolesService);
    expect(service.hasPublisherRole()).toBeFalse();
  });

  it('treats bypass mode as publisher', () => {
    runtimeConfig.authMode = 'bypass';
    const service = TestBed.inject(UserRolesService);
    expect(service.hasPublisherRole()).toBeTrue();
  });

  it('maps connector perspective from publisher role', () => {
    const service = TestBed.inject(UserRolesService);
    expect(service.getConnectorPerspective()).toBe('PROVIDER');

    keycloakMock.tokenParsed = { realm_access: { roles: [SD_CONSUMER, 'CATALOG_R'] } };
    expect(TestBed.inject(UserRolesService).getConnectorPerspective()).toBe('CONSUMER');
  });

  it('reads roles from manual token JWT', () => {
    runtimeConfig.authMode = 'manual-token';
    manualTokenService.setToken(jwtWithRoles([SD_CONSUMER]));
    const service = TestBed.inject(UserRolesService);
    expect(service.hasPublisherRole()).toBeFalse();

    manualTokenService.setToken(jwtWithRoles([SD_PUBLISHER]));
    expect(service.hasPublisherRole()).toBeTrue();
  });

  it('returns true for consumer role in keycloak mode', () => {
    keycloakMock.tokenParsed = { realm_access: { roles: [SD_CONSUMER] } };
    const service = TestBed.inject(UserRolesService);
    expect(service.hasConsumerRole()).toBeTrue();
  });

  it('returns false for consumer role when only publisher is present', () => {
    const service = TestBed.inject(UserRolesService);
    expect(service.hasConsumerRole()).toBeFalse();
  });

  it('returns true for both roles when a hybrid participant has both', () => {
    keycloakMock.tokenParsed = { realm_access: { roles: [SD_PUBLISHER, SD_CONSUMER] } };
    const service = TestBed.inject(UserRolesService);
    expect(service.hasPublisherRole()).toBeTrue();
    expect(service.hasConsumerRole()).toBeTrue();
  });

  it('treats bypass mode as both publisher and consumer', () => {
    runtimeConfig.authMode = 'bypass';
    const service = TestBed.inject(UserRolesService);
    expect(service.hasPublisherRole()).toBeTrue();
    expect(service.hasConsumerRole()).toBeTrue();
  });
});
