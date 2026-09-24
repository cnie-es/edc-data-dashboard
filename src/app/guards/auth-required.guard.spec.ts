import { TestBed } from '@angular/core/testing';
import { EdcRawCacheWarmupService } from '@eclipse-edc/dashboard-core';
import { authRequiredGuard } from './auth-required.guard';
import { KEYCLOAK_RUNTIME_CONFIG, type KeycloakRuntimeConfig } from '../services/keycloak-config-loader.service';
import { GeneralTokenService } from '../services/general-token.service';
import { provideRouter, Router, UrlTree } from '@angular/router';

describe('authRequiredGuard', () => {
  let generalTokenService: jasmine.SpyObj<GeneralTokenService>;
  let rawCacheWarmup: jasmine.SpyObj<EdcRawCacheWarmupService>;
  let runtimeConfig: KeycloakRuntimeConfig;

  beforeEach(() => {
    generalTokenService = jasmine.createSpyObj<GeneralTokenService>('GeneralTokenService', ['getValidAccessToken']);
    rawCacheWarmup = jasmine.createSpyObj<EdcRawCacheWarmupService>('EdcRawCacheWarmupService', ['scheduleAfterAuth']);
    runtimeConfig = {
      url: 'https://keycloak.example.com',
      realm: 'example',
      clientId: 'dashboard',
      authMode: 'keycloak',
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: KEYCLOAK_RUNTIME_CONFIG,
          useValue: runtimeConfig,
        },
        {
          provide: GeneralTokenService,
          useValue: generalTokenService,
        },
        {
          provide: EdcRawCacheWarmupService,
          useValue: rawCacheWarmup,
        },
      ],
    });
  });

  it('allows route in bypass mode without token lookup', async () => {
    runtimeConfig.authMode = 'bypass';

    const result = await TestBed.runInInjectionContext(() => authRequiredGuard({} as never, {} as never));

    expect(result).toBeTrue();
    expect(generalTokenService.getValidAccessToken).not.toHaveBeenCalled();
  });

  it('allows route in keycloak mode when token is valid', async () => {
    runtimeConfig.authMode = 'keycloak';
    generalTokenService.getValidAccessToken.and.resolveTo('kc-token');

    const result = await TestBed.runInInjectionContext(() => authRequiredGuard({} as never, {} as never));

    expect(result).toBeTrue();
    expect(generalTokenService.getValidAccessToken).toHaveBeenCalled();
    expect(rawCacheWarmup.scheduleAfterAuth).toHaveBeenCalledWith('kc-token');
  });

  it('redirects to manual token login in manual-token mode when token is missing', async () => {
    runtimeConfig.authMode = 'manual-token';
    generalTokenService.getValidAccessToken.and.rejectWith(new Error('manual token missing'));

    const result = await TestBed.runInInjectionContext(() =>
      authRequiredGuard({} as never, { url: '/catalog' } as never),
    );
    const router = TestBed.inject(Router);

    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result as UrlTree)).toBe('/manual-token-login?returnUrl=%2Fcatalog');
    expect(generalTokenService.getValidAccessToken).toHaveBeenCalled();
  });

  it('blocks route in keycloak mode when token resolution fails', async () => {
    runtimeConfig.authMode = 'keycloak';
    generalTokenService.getValidAccessToken.and.rejectWith(new Error('not authenticated'));

    const result = await TestBed.runInInjectionContext(() =>
      authRequiredGuard({} as never, { url: '/catalog' } as never),
    );

    expect(result).toBeFalse();
  });
});
