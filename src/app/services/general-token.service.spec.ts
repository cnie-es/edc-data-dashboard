import { TestBed } from '@angular/core/testing';
import { GeneralTokenService } from './general-token.service';
import { KeycloakTokenService } from './keycloak-token.service';

describe('GeneralTokenService', () => {
  let service: GeneralTokenService;
  let keycloakTokenService: jasmine.SpyObj<KeycloakTokenService>;

  beforeEach(() => {
    keycloakTokenService = jasmine.createSpyObj<KeycloakTokenService>('KeycloakTokenService', [
      'getValidAccessToken',
      'handleUnauthorizedResponse',
      'logout',
    ]);
    keycloakTokenService.getValidAccessToken.and.resolveTo('delegated-token');
    keycloakTokenService.handleUnauthorizedResponse.and.resolveTo();
    keycloakTokenService.logout.and.resolveTo();

    TestBed.configureTestingModule({
      providers: [
        GeneralTokenService,
        {
          provide: KeycloakTokenService,
          useValue: keycloakTokenService,
        },
      ],
    });

    service = TestBed.inject(GeneralTokenService);
  });

  it('delegates token resolution to KeycloakTokenService', async () => {
    await expectAsync(service.getValidAccessToken(15)).toBeResolvedTo('delegated-token');
    expect(keycloakTokenService.getValidAccessToken).toHaveBeenCalledOnceWith(15);
  });

  it('delegates unauthorized handling to KeycloakTokenService', async () => {
    await service.handleUnauthorizedResponse();
    expect(keycloakTokenService.handleUnauthorizedResponse).toHaveBeenCalled();
  });

  it('delegates logout to KeycloakTokenService', async () => {
    await service.logout();
    expect(keycloakTokenService.logout).toHaveBeenCalled();
  });
});
