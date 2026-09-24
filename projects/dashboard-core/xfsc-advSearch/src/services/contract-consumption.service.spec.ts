import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { DashboardStateService } from '@eclipse-edc/dashboard-core';
import { ContractConsumptionService } from './contract-consumption.service';

describe('ContractConsumptionService', () => {
  let service: ContractConsumptionService;
  let httpMock: HttpTestingController;
  let currentEdcConfig$: BehaviorSubject<Record<string, unknown> | undefined>;

  beforeEach(() => {
    currentEdcConfig$ = new BehaviorSubject<Record<string, unknown> | undefined>(undefined);

    TestBed.configureTestingModule({
      providers: [
        ContractConsumptionService,
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

    service = TestBed.inject(ContractConsumptionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should call offers endpoint with default base and version', () => {
    service
      .getCatalogOffers({
        providerEndpoint: 'https://provider.example/protocol',
        assetId: 'asset-001',
        contractDefinitionId: 'contract-def-001',
      })
      .subscribe();

    const req = httpMock.expectOne('/contract-consumption-api/v1/connectorCatalog/assets');
    expect(req.request.method).toBe('POST');
    req.flush({ offers: [] });
  });

  it('should call contracts endpoint with connector-specific base and version', () => {
    currentEdcConfig$.next({
      connectorName: 'consumer',
      managementUrl: 'https://example.com/management',
      defaultUrl: 'https://example.com/api',
      protocolUrl: 'https://example.com/protocol',
      federatedCatalogEnabled: false,
      contractConsumptionApiBaseUrl: '/custom-contract-api/',
      contractConsumptionApiVersion: '/v2/',
    });

    service
      .startContractNegotiation({
        providerEndpoint: 'https://provider.example/protocol',
        assetId: 'asset-001',
        contractDefinitionId: 'contract-def-001',
      })
      .subscribe();

    const req = httpMock.expectOne('/custom-contract-api/v2/contracts');
    expect(req.request.method).toBe('POST');
    req.flush({ contractNegotiationId: 'neg-001' });
  });

  it('should call negotiation status endpoint with negotiation id', () => {
    service.fetchContractNegotiationStatus('neg-001').subscribe();

    const req = httpMock.expectOne('/contract-consumption-api/v1/contracts/neg-001');
    expect(req.request.method).toBe('GET');
    req.flush({ '@id': 'neg-001', state: 'REQUESTED' });
  });

  it('should map backend error payload to UiError', () => {
    let capturedTitle = '';
    let capturedDescription = '';

    service.fetchContractNegotiationStatus('neg-404').subscribe({
      next: () => fail('expected error'),
      error: error => {
        capturedTitle = error.title;
        capturedDescription = error.description;
      },
    });

    const req = httpMock.expectOne('/contract-consumption-api/v1/contracts/neg-404');
    req.flush(
      {
        title: 'Negotiation failed',
        description: 'No negotiation found for id neg-404',
      },
      { status: 404, statusText: 'Not Found' },
    );

    expect(capturedTitle).toBe('Negotiation failed');
    expect(capturedDescription).toBe('No negotiation found for id neg-404');
  });

  it('should call resource address templates endpoint with connector-specific base', () => {
    currentEdcConfig$.next({
      contractConsumptionApiBaseUrl: '/contract-consumption',
      contractConsumptionApiVersion: 'v1',
    });

    let options: { value: string; label: string }[] = [];
    service.resourceAddressTemplates('MINIO_S3', 'data').subscribe(result => {
      options = result;
    });

    const req = httpMock.expectOne(
      request =>
        request.url === '/contract-consumption/v1/resourceAddresses/sharingMethods/MINIO_S3/templates' &&
        request.params.get('offeringType') === 'DATA',
    );
    expect(req.request.method).toBe('GET');
    req.flush([{ id: '5', label: 'Data Template MinioS3' }]);

    expect(options).toEqual([{ value: '5', label: 'Data Template MinioS3' }]);
  });

  it('should call resource address schema and uiSchema endpoints', () => {
    currentEdcConfig$.next({
      contractConsumptionApiBaseUrl: '/contract-consumption',
      contractConsumptionApiVersion: 'v1',
    });

    let schema: Record<string, unknown> | undefined;
    service.resourceAddressTemplateSchema('5').subscribe(result => {
      schema = result;
    });

    const schemaReq = httpMock.expectOne('/contract-consumption/v1/resourceAddresses/templates/5/schema');
    schemaReq.flush({ title: 'Destination', properties: { baseUrl: { type: 'string' } } });
    expect(schema?.['title']).toBe('Destination');

    let uiSchema: unknown;
    service.resourceAddressTemplateUiSchema('5').subscribe(result => {
      uiSchema = result;
    });

    const uiSchemaReq = httpMock.expectOne('/contract-consumption/v1/resourceAddresses/templates/5/uiSchema');
    uiSchemaReq.flush({ type: 'VerticalLayout', elements: [] });
    expect(uiSchema).toEqual(jasmine.objectContaining({ type: 'VerticalLayout' }));
  });
});
