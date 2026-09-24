import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import Keycloak from 'keycloak-js';
import { KEYCLOAK_RUNTIME_CONFIG, type KeycloakRuntimeConfig } from './keycloak-config-loader.service';
import { KeycloakTokenService } from './keycloak-token.service';
import { ManualTokenService } from './manual-token.service';

describe('KeycloakTokenService', () => {
  let runtimeConfig: KeycloakRuntimeConfig;
  let keycloakMock: {
    authenticated: boolean;
    token?: string;
    updateToken: jasmine.Spy<(minValidity: number) => Promise<boolean>>;
    login: jasmine.Spy<(options?: { redirectUri?: string }) => Promise<void>>;
    logout: jasmine.Spy<(options?: { redirectUri?: string }) => Promise<void>>;
  };
  let routerMock: jasmine.SpyObj<Router>;
  let manualTokenService: ManualTokenService;
  let service: KeycloakTokenService;

  beforeEach(() => {
    runtimeConfig = {
      url: 'https://keycloak.example.com',
      realm: 'example',
      clientId: 'dashboard',
      authMode: 'keycloak',
    };
    keycloakMock = {
      authenticated: true,
      token: 'kc-token',
      updateToken: jasmine.createSpy('updateToken').and.resolveTo(true),
      login: jasmine.createSpy('login').and.resolveTo(),
      logout: jasmine.createSpy('logout').and.resolveTo(),
    };
    routerMock = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    routerMock.navigateByUrl.and.resolveTo(true);

    TestBed.configureTestingModule({
      providers: [
        KeycloakTokenService,
        ManualTokenService,
        {
          provide: Router,
          useValue: routerMock,
        },
        {
          provide: KEYCLOAK_RUNTIME_CONFIG,
          useValue: runtimeConfig,
        },
        {
          provide: Keycloak,
          useValue: keycloakMock,
        },
      ],
    });

    manualTokenService = TestBed.inject(ManualTokenService);
    service = TestBed.inject(KeycloakTokenService);
  });

  it('throws in bypass mode because token is not required', async () => {
    runtimeConfig.authMode = 'bypass';

    await expectAsync(service.getValidAccessToken()).toBeRejectedWithError(
      'Auth bypass mode is enabled; Keycloak token is not required.',
    );
  });

  it('returns manual token in manual-token mode', async () => {
    runtimeConfig.authMode = 'manual-token';
    manualTokenService.setToken('manual-dev-token');

    await expectAsync(service.getValidAccessToken()).toBeResolvedTo('manual-dev-token');
  });

  it('rejects when manual-token mode is active and no token exists', async () => {
    runtimeConfig.authMode = 'manual-token';

    await expectAsync(service.getValidAccessToken()).toBeRejectedWithError(
      'Manual token auth mode is enabled, but no development token has been provided yet.',
    );
  });

  it('uses Keycloak token flow in keycloak mode', async () => {
    runtimeConfig.authMode = 'keycloak';
    keycloakMock.authenticated = true;
    keycloakMock.token = 'fresh-token';

    await expectAsync(service.getValidAccessToken()).toBeResolvedTo('fresh-token');
    expect(keycloakMock.updateToken).toHaveBeenCalledWith(30);
  });

  it('triggers keycloak login when user is not authenticated in keycloak mode', async () => {
    runtimeConfig.authMode = 'keycloak';
    keycloakMock.authenticated = false;

    await expectAsync(service.getValidAccessToken()).toBeRejectedWithError('User is not authenticated.');
    expect(keycloakMock.login).toHaveBeenCalled();
  });

  it('triggers keycloak login when token refresh fails', async () => {
    runtimeConfig.authMode = 'keycloak';
    keycloakMock.authenticated = true;
    keycloakMock.updateToken.and.rejectWith('refresh failed');

    await expectAsync(service.getValidAccessToken()).toBeRejectedWithError(
      'Could not refresh Keycloak token: refresh failed',
    );
    expect(keycloakMock.login).toHaveBeenCalled();
  });

  it('clears manual token on unauthorized response in manual-token mode', async () => {
    runtimeConfig.authMode = 'manual-token';
    manualTokenService.setToken('manual-dev-token');

    await service.handleUnauthorizedResponse();

    expect(manualTokenService.getToken()).toBeNull();
    expect(keycloakMock.login).not.toHaveBeenCalled();
  });

  it('does nothing on unauthorized response in bypass mode', async () => {
    runtimeConfig.authMode = 'bypass';

    await service.handleUnauthorizedResponse();

    expect(keycloakMock.login).not.toHaveBeenCalled();
  });

  it('redirects to keycloak on unauthorized response in keycloak mode', async () => {
    runtimeConfig.authMode = 'keycloak';

    await service.handleUnauthorizedResponse();

    expect(keycloakMock.login).toHaveBeenCalled();
  });

  it('clears manual token and routes to manual login on logout in manual-token mode', async () => {
    runtimeConfig.authMode = 'manual-token';
    manualTokenService.setToken('manual-dev-token');

    await service.logout();

    expect(manualTokenService.getToken()).toBeNull();
    expect(routerMock.navigateByUrl).toHaveBeenCalledOnceWith('/manual-token-login');
    expect(keycloakMock.logout).not.toHaveBeenCalled();
  });

  it('does nothing on logout in bypass mode', async () => {
    runtimeConfig.authMode = 'bypass';

    await service.logout();

    expect(routerMock.navigateByUrl).not.toHaveBeenCalled();
    expect(keycloakMock.logout).not.toHaveBeenCalled();
  });

  it('calls keycloak logout in keycloak mode', async () => {
    runtimeConfig.authMode = 'keycloak';

    await service.logout();

    expect(keycloakMock.logout).toHaveBeenCalledOnceWith({
      redirectUri: `${window.location.origin}${window.location.pathname}`,
    });
    expect(routerMock.navigateByUrl).not.toHaveBeenCalled();
  });
});
