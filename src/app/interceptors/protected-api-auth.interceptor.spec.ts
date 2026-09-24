import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { protectedApiAuthInterceptor } from './protected-api-auth.interceptor';
import { GeneralTokenService } from '../services/general-token.service';
import { KEYCLOAK_RUNTIME_CONFIG, type KeycloakRuntimeConfig } from '../services/keycloak-config-loader.service';

describe('protectedApiAuthInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let generalTokenService: jasmine.SpyObj<GeneralTokenService>;
  let runtimeConfig: KeycloakRuntimeConfig;

  beforeEach(() => {
    generalTokenService = jasmine.createSpyObj<GeneralTokenService>('GeneralTokenService', [
      'getValidAccessToken',
      'handleUnauthorizedResponse',
    ]);
    generalTokenService.getValidAccessToken.and.resolveTo('kc-token');
    generalTokenService.handleUnauthorizedResponse.and.resolveTo();
    runtimeConfig = {
      url: 'https://keycloak.example.com',
      realm: 'example',
      clientId: 'dashboard',
      authMode: 'keycloak',
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([protectedApiAuthInterceptor])),
        provideHttpClientTesting(),
        {
          provide: GeneralTokenService,
          useValue: generalTokenService,
        },
        {
          provide: KEYCLOAK_RUNTIME_CONFIG,
          useValue: runtimeConfig,
        },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('adds bearer token for backend API URLs', fakeAsync(() => {
    http.get('/xfsc-advsearch-be/v1/selfDescriptions?q=a').subscribe();
    flushMicrotasks();

    const req = httpMock.expectOne('/xfsc-advsearch-be/v1/selfDescriptions?q=a');
    expect(generalTokenService.getValidAccessToken).toHaveBeenCalled();
    expect(req.request.headers.get('Authorization')).toBe('Bearer kc-token');
    req.flush({ items: [] });
  }));

  it('does not override an existing Authorization header', fakeAsync(() => {
    const edrToken = 'eyJraWQiOiJlZGMtdHJhbnNmZXIta2V5In0.edr-signature';
    http
      .get('https://public.example.com/public', {
        headers: { Authorization: edrToken },
      })
      .subscribe();
    flushMicrotasks();

    const req = httpMock.expectOne('https://public.example.com/public');
    expect(generalTokenService.getValidAccessToken).not.toHaveBeenCalled();
    expect(req.request.headers.get('Authorization')).toBe(edrToken);
    req.flush(new Blob());
  }));

  it('adds bearer token for SD Tooling URLs', fakeAsync(() => {
    http.get('/sdtooling-api/v1/schemas').subscribe();
    flushMicrotasks();

    const req = httpMock.expectOne('/sdtooling-api/v1/schemas');
    expect(generalTokenService.getValidAccessToken).toHaveBeenCalled();
    expect(req.request.headers.get('Authorization')).toBe('Bearer kc-token');
    req.flush({ Service: [] });
  }));

  it('adds bearer token for SD Tooling v2 URLs', fakeAsync(() => {
    http.get('/sdtooling-api/v2/schemas').subscribe();
    flushMicrotasks();

    const req = httpMock.expectOne('/sdtooling-api/v2/schemas');
    expect(generalTokenService.getValidAccessToken).toHaveBeenCalled();
    expect(req.request.headers.get('Authorization')).toBe('Bearer kc-token');
    req.flush({ schemas: [] });
  }));

  it('adds bearer token for signer URLs', fakeAsync(() => {
    http.post('/signer/v1/credential', { credentialSubject: { '@id': 'did:web:example' } }).subscribe();
    flushMicrotasks();

    const req = httpMock.expectOne('/signer/v1/credential');
    expect(generalTokenService.getValidAccessToken).toHaveBeenCalled();
    expect(req.request.headers.get('Authorization')).toBe('Bearer kc-token');
    req.flush({ id: 'signed' });
  }));

  it('adds bearer token for contract-consumption URLs', fakeAsync(() => {
    http.get('/contract-consumption-api/v1/contracts/neg-001').subscribe();
    flushMicrotasks();

    const req = httpMock.expectOne('/contract-consumption-api/v1/contracts/neg-001');
    expect(generalTokenService.getValidAccessToken).toHaveBeenCalled();
    expect(req.request.headers.get('Authorization')).toBe('Bearer kc-token');
    req.flush({ '@id': 'neg-001', state: 'REQUESTED' });
  }));

  it('adds bearer token for contract-consumption URLs without api suffix', fakeAsync(() => {
    http.get('/contract-consumption/v1/contracts/neg-001').subscribe();
    flushMicrotasks();

    const req = httpMock.expectOne('/contract-consumption/v1/contracts/neg-001');
    expect(generalTokenService.getValidAccessToken).toHaveBeenCalled();
    expect(req.request.headers.get('Authorization')).toBe('Bearer kc-token');
    req.flush({ '@id': 'neg-001', state: 'REQUESTED' });
  }));

  it('adds bearer token for generic same-origin API URLs', fakeAsync(() => {
    http.get('/api/health').subscribe();
    flushMicrotasks();

    const req = httpMock.expectOne('/api/health');
    expect(generalTokenService.getValidAccessToken).toHaveBeenCalled();
    expect(req.request.headers.get('Authorization')).toBe('Bearer kc-token');
    req.flush({ status: 'ok' });
  }));

  it('does not add bearer token for static assets URLs', () => {
    http.get('/assets/logo.svg').subscribe();

    const req = httpMock.expectOne('/assets/logo.svg');
    expect(generalTokenService.getValidAccessToken).not.toHaveBeenCalled();
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush('<svg></svg>');
  });

  it('does not add bearer token for config resource URLs', () => {
    http.get('/config/APP_BASE_HREF.txt').subscribe();

    const req = httpMock.expectOne('/config/APP_BASE_HREF.txt');
    expect(generalTokenService.getValidAccessToken).not.toHaveBeenCalled();
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush('/');
  });

  it('adds bearer token for absolute API URLs', fakeAsync(() => {
    http.get('https://example.com/api/test').subscribe();
    flushMicrotasks();

    const req = httpMock.expectOne('https://example.com/api/test');
    expect(generalTokenService.getValidAccessToken).toHaveBeenCalled();
    expect(req.request.headers.get('Authorization')).toBe('Bearer kc-token');
    req.flush({ status: 'ok' });
  }));

  it('skips token injection in bypass mode for protected URLs', () => {
    runtimeConfig.authMode = 'bypass';

    http.get('/xfsc-advsearch-be/v1/selfDescriptions?q=a').subscribe();

    const req = httpMock.expectOne('/xfsc-advsearch-be/v1/selfDescriptions?q=a');
    expect(generalTokenService.getValidAccessToken).not.toHaveBeenCalled();
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ items: [] });
  });

  it('triggers unauthorized handler on 401 response from XFSC endpoint', fakeAsync(() => {
    http.get('/xfsc-advsearch-be/v1/schemas').subscribe({
      error: () => {
        // expected by test
      },
    });
    flushMicrotasks();

    const req = httpMock.expectOne('/xfsc-advsearch-be/v1/schemas');
    req.flush({ title: 'The user is not authenticated' }, { status: 401, statusText: 'Unauthorized' });

    expect(generalTokenService.handleUnauthorizedResponse).toHaveBeenCalled();
  }));

  it('triggers unauthorized handler on 401 response from SD Tooling endpoint', fakeAsync(() => {
    http.get('/sdtooling-api/v1/schemas').subscribe({
      error: () => {
        // expected by test
      },
    });
    flushMicrotasks();

    const req = httpMock.expectOne('/sdtooling-api/v1/schemas');
    req.flush({ title: 'The user is not authenticated' }, { status: 401, statusText: 'Unauthorized' });

    expect(generalTokenService.handleUnauthorizedResponse).toHaveBeenCalled();
  }));

  it('triggers unauthorized handler on 401 response from SD Tooling v2 endpoint', fakeAsync(() => {
    http.get('/sdtooling-api/v2/schemas').subscribe({
      error: () => {
        // expected by test
      },
    });
    flushMicrotasks();

    const req = httpMock.expectOne('/sdtooling-api/v2/schemas');
    req.flush({ title: 'The user is not authenticated' }, { status: 401, statusText: 'Unauthorized' });

    expect(generalTokenService.handleUnauthorizedResponse).toHaveBeenCalled();
  }));

  it('triggers unauthorized handler on 401 response from signer endpoint', fakeAsync(() => {
    http.post('/signer/v1/credential', { credentialSubject: { '@id': 'did:web:example' } }).subscribe({
      error: () => {
        // expected by test
      },
    });
    flushMicrotasks();

    const req = httpMock.expectOne('/signer/v1/credential');
    req.flush({ title: 'The user is not authenticated' }, { status: 401, statusText: 'Unauthorized' });

    expect(generalTokenService.handleUnauthorizedResponse).toHaveBeenCalled();
  }));

  it('triggers unauthorized handler on 401 response from contract-consumption endpoint', fakeAsync(() => {
    http.get('/contract-consumption-api/v1/contracts/neg-001').subscribe({
      error: () => {
        // expected by test
      },
    });
    flushMicrotasks();

    const req = httpMock.expectOne('/contract-consumption-api/v1/contracts/neg-001');
    req.flush({ title: 'The user is not authenticated' }, { status: 401, statusText: 'Unauthorized' });

    expect(generalTokenService.handleUnauthorizedResponse).toHaveBeenCalled();
  }));

  it('triggers unauthorized handler on 401 response from generic backend API endpoint', fakeAsync(() => {
    http.get('/api/health').subscribe({
      error: () => {
        // expected by test
      },
    });
    flushMicrotasks();

    const req = httpMock.expectOne('/api/health');
    req.flush({ title: 'The user is not authenticated' }, { status: 401, statusText: 'Unauthorized' });

    expect(generalTokenService.handleUnauthorizedResponse).toHaveBeenCalled();
  }));

  it('still requests token in manual-token mode for protected URLs', fakeAsync(() => {
    runtimeConfig.authMode = 'manual-token';
    generalTokenService.getValidAccessToken.and.resolveTo('manual-dev-token');

    http.get('/sdtooling-api/v1/schemas').subscribe();
    flushMicrotasks();

    const req = httpMock.expectOne('/sdtooling-api/v1/schemas');
    expect(generalTokenService.getValidAccessToken).toHaveBeenCalled();
    expect(req.request.headers.get('Authorization')).toBe('Bearer manual-dev-token');
    req.flush({ Service: [] });
  }));
});
