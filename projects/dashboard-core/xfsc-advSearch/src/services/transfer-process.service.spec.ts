import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { DashboardStateService } from '@eclipse-edc/dashboard-core';
import { TransferProcessService } from './transfer-process.service';

describe('TransferProcessService', () => {
  let service: TransferProcessService;
  let httpMock: HttpTestingController;
  let currentEdcConfig$: BehaviorSubject<Record<string, unknown> | undefined>;

  beforeEach(() => {
    currentEdcConfig$ = new BehaviorSubject<Record<string, unknown> | undefined>(undefined);

    TestBed.configureTestingModule({
      providers: [
        TransferProcessService,
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

    service = TestBed.inject(TransferProcessService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should call transfers endpoint with default base and version', () => {
    service
      .startTransferProcess({
        contractAgreementId: 'agreement-001',
        counterPartyAddress: 'https://provider.example/protocol',
        templateId: 'HttpData-PULL',
        dataDestination: {
          type: 'HttpData',
          baseUrl: 'https://consumer.example/destination',
        },
      })
      .subscribe();

    const req = httpMock.expectOne('/contract-consumption-api/v1/transfers');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      contractId: 'agreement-001',
      providerEndpoint: 'https://provider.example/protocol',
      templateId: 'HttpData-PULL',
      dataDestination: {
        type: 'HttpData',
        baseUrl: 'https://consumer.example/destination',
      },
    });
    expect(req.request.body.contractAgreementId).toBeUndefined();
    expect(req.request.body.counterPartyAddress).toBeUndefined();
    req.flush({ transferProcessId: 'transfer-001' });
  });

  it('should call transfer endpoint with connector-specific base and version', () => {
    currentEdcConfig$.next({
      contractConsumptionApiBaseUrl: '/custom-contract-api/',
      contractConsumptionApiVersion: '/v2/',
    });

    service.fetchTransferProcessStatus('transfer-001').subscribe();

    const req = httpMock.expectOne('/custom-contract-api/v2/transfers/transfer-001');
    expect(req.request.method).toBe('GET');
    req.flush({ '@id': 'transfer-001', state: 'STARTED' });
  });

  it('should map backend error payload to UiError', () => {
    let capturedTitle = '';
    let capturedDescription = '';

    service.fetchTransferProcessStatus('transfer-404').subscribe({
      next: () => fail('expected error'),
      error: error => {
        capturedTitle = error.title;
        capturedDescription = error.description;
      },
    });

    const req = httpMock.expectOne('/contract-consumption-api/v1/transfers/transfer-404');
    req.flush(
      {
        title: 'Transfer status failed',
        description: 'No transfer found for id transfer-404',
      },
      { status: 404, statusText: 'Not Found' },
    );

    expect(capturedTitle).toBe('Transfer status failed');
    expect(capturedDescription).toBe('No transfer found for id transfer-404');
  });
});
