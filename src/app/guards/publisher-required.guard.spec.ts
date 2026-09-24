import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { KEYCLOAK_RUNTIME_CONFIG, type KeycloakRuntimeConfig } from '../services/keycloak-config-loader.service';
import { UserRolesService } from '../services/user-roles.service';
import { publisherRequiredGuard } from './publisher-required.guard';

describe('publisherRequiredGuard', () => {
  let runtimeConfig: KeycloakRuntimeConfig;
  let userRolesService: jasmine.SpyObj<UserRolesService>;

  beforeEach(() => {
    userRolesService = jasmine.createSpyObj<UserRolesService>('UserRolesService', ['hasPublisherRole']);
    runtimeConfig = {
      url: 'https://keycloak.example.com',
      realm: 'example',
      clientId: 'dashboard',
      authMode: 'keycloak',
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: KEYCLOAK_RUNTIME_CONFIG, useValue: runtimeConfig },
        { provide: UserRolesService, useValue: userRolesService },
      ],
    });
  });

  it('allows route in bypass mode without role lookup', () => {
    runtimeConfig.authMode = 'bypass';
    const result = TestBed.runInInjectionContext(() => publisherRequiredGuard({} as never, {} as never));
    expect(result).toBeTrue();
    expect(userRolesService.hasPublisherRole).not.toHaveBeenCalled();
  });

  it('allows route when user has publisher role', () => {
    userRolesService.hasPublisherRole.and.returnValue(true);
    const result = TestBed.runInInjectionContext(() => publisherRequiredGuard({} as never, {} as never));
    expect(result).toBeTrue();
  });

  it('redirects to home when user lacks publisher role', () => {
    userRolesService.hasPublisherRole.and.returnValue(false);
    const result = TestBed.runInInjectionContext(() => publisherRequiredGuard({} as never, {} as never));
    const router = TestBed.inject(Router);
    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result as UrlTree)).toBe('/home');
  });
});
