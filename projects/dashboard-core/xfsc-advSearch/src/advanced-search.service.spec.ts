import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { DashboardStateService } from '@eclipse-edc/dashboard-core';
import { SimplAdvancedSearchService, type AdvancedSearchPayload } from './advanced-search.service';
import type { EdcConfig } from '../../src/lib/models/edc-config';

describe('SimplAdvancedSearchService', () => {
  let service: SimplAdvancedSearchService;
  let httpMock: HttpTestingController;
  let currentEdcConfig$: BehaviorSubject<EdcConfig | undefined>;

  beforeEach(() => {
    currentEdcConfig$ = new BehaviorSubject<EdcConfig | undefined>(undefined);

    TestBed.configureTestingModule({
      providers: [
        SimplAdvancedSearchService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: DashboardStateService,
          useValue: {
            currentEdcConfig$: currentEdcConfig$.asObservable(),
          },
        },
      ],
    });

    service = TestBed.inject(SimplAdvancedSearchService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should use default gateway base URL without auth header by default', () => {
    service.simpleSearchSD('alpha').subscribe();

    const req = httpMock.expectOne(
      r => r.url === '/xfsc-advsearch-be/v1/selfDescriptions' && r.params.get('q') === 'alpha',
    );
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ items: [] });
  });

  it('should pass page and pageSize when paging is provided', () => {
    service.simpleSearchSD('asset-id', { page: 1, pageSize: 1 }).subscribe();

    const req = httpMock.expectOne(
      r =>
        r.url === '/xfsc-advsearch-be/v1/selfDescriptions' &&
        r.params.get('q') === 'asset-id' &&
        r.params.get('page') === '1' &&
        r.params.get('pageSize') === '1',
    );
    req.flush({ items: [] });
  });

  it('should use connector-specific base URL from current connector config', () => {
    currentEdcConfig$.next({
      connectorName: 'dp03',
      managementUrl: 'https://example.com/management',
      defaultUrl: 'https://example.com/api',
      protocolUrl: 'https://example.com/protocol',
      federatedCatalogEnabled: false,
      xfscAdvSearchApiBaseUrl: '/custom-gateway/xfsc',
    });

    service.simpleSearchSD('abc').subscribe();

    const req = httpMock.expectOne(
      r => r.url === '/custom-gateway/xfsc/selfDescriptions' && r.params.get('q') === 'abc',
    );
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ items: [] });
  });

  it('should encode self-description id in detail endpoint', () => {
    const id = 'did:web:test:one/two?three';
    service.detailedSearchSD(id).subscribe();

    const req = httpMock.expectOne('/xfsc-advsearch-be/v1/selfDescriptions/did%3Aweb%3Atest%3Aone%2Ftwo%3Fthree');
    req.flush({});
  });

  it('should call advanced endpoint with payload', () => {
    currentEdcConfig$.next({
      connectorName: 'dp03',
      managementUrl: 'https://example.com/management',
      defaultUrl: 'https://example.com/api',
      protocolUrl: 'https://example.com/protocol',
      federatedCatalogEnabled: false,
      xfscAdvSearchApiBaseUrl: '/custom-gateway/xfsc',
    });
    const payload: AdvancedSearchPayload = {
      'simpl:OfferingPrice': {
        '@type': 'simpl:offeringPrice',
        priceType: 'free',
      },
    };

    service.advancedSearchSD(payload).subscribe();

    const req = httpMock.expectOne('/custom-gateway/xfsc/selfDescriptions/advanced');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ items: [] });
  });
});
