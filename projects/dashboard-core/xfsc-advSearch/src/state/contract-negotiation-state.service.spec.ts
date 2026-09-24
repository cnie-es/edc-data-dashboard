import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { ContractConsumptionService } from '../services/contract-consumption.service';
import { ContractNegotiationStateService } from './contract-negotiation-state.service';

describe('ContractNegotiationStateService', () => {
  let service: ContractNegotiationStateService;
  let api: jasmine.SpyObj<ContractConsumptionService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ContractConsumptionService>('ContractConsumptionService', [
      'startContractNegotiation',
      'fetchContractNegotiationStatus',
      'getCatalogOffers',
    ]);

    TestBed.configureTestingModule({
      providers: [
        ContractNegotiationStateService,
        {
          provide: ContractConsumptionService,
          useValue: api,
        },
      ],
    });

    service = TestBed.inject(ContractNegotiationStateService);
  });

  afterEach(() => {
    service.resetNegotiationState();
  });

  it('should start negotiation and set negotiation id', () => {
    service.setNegotiationData({
      providerEndpoint: 'https://provider.example/protocol',
      assetId: 'asset-001',
      contractDefinitionId: 'contract-def-001',
    }, false);
    api.startContractNegotiation.and.returnValue(of({ contractNegotiationId: 'neg-123' }));

    service.initiateNegotiation();

    expect(api.startContractNegotiation).toHaveBeenCalledTimes(1);
    expect(service.negotiationId).toBe('neg-123');
  });

  it('should update status and derived flags when polling succeeds', () => {
    service.setNegotiationId('neg-123');
    api.fetchContractNegotiationStatus.and.returnValue(
      of({
        '@id': 'neg-123',
        state: 'FINALIZED',
        contractAgreementId: 'agr-001',
      }),
    );

    service.fetchNewNegotiationStatus();

    expect(service.negotiationStatus?.state).toBe('FINALIZED');
    expect(service.isNegotiationFinalized).toBeTrue();
    expect(service.isNegotiationTerminated).toBeFalse();
    expect(service.isNegotiationEnded).toBeTrue();
    expect(service.isNextNegotiationStatusLoading).toBeFalse();
  });

  it('should stop progression on polling error', () => {
    service.setNegotiationId('neg-123');
    api.fetchContractNegotiationStatus.and.returnValue(
      throwError(() => ({
        title: 'Negotiation status failed',
        description: 'Unexpected backend error',
      })),
    );

    service.fetchNewNegotiationStatus();

    expect(service.negotiationStatusError).toEqual({
      title: 'Negotiation status failed',
      description: 'Unexpected backend error',
    });
    expect(service.isNegotiationEnded).toBeTrue();
    expect(service.isNextNegotiationStatusLoading).toBeFalse();
  });

  it('should poll every 3 seconds and avoid overlapping in-flight requests', fakeAsync(() => {
    const statusSubject = new Subject<{
      '@id': string;
      state: string;
    }>();
    service.setNegotiationId('neg-123');
    api.fetchContractNegotiationStatus.and.returnValue(statusSubject.asObservable());

    service.resumePolling();

    tick(3000);
    expect(api.fetchContractNegotiationStatus).toHaveBeenCalledTimes(1);

    tick(3000);
    expect(api.fetchContractNegotiationStatus).toHaveBeenCalledTimes(1);

    statusSubject.next({ '@id': 'neg-123', state: 'REQUESTED' });
    statusSubject.complete();
    tick(1);

    tick(3000);
    expect(api.fetchContractNegotiationStatus).toHaveBeenCalledTimes(2);
  }));

  it('should seed finalized negotiation without calling startContractNegotiation', () => {
    service.seedFinalizedNegotiation({
      negotiationId: 'neg-existing',
      contractAgreementId: 'agr-existing',
      counterPartyAddress: 'https://provider.example/protocol',
    });

    expect(api.startContractNegotiation).not.toHaveBeenCalled();
    expect(service.negotiationId).toBe('neg-existing');
    expect(service.negotiationStatus?.state).toBe('FINALIZED');
    expect(service.negotiationStatus?.contractAgreementId).toBe('agr-existing');
    expect(service.negotiationStatus?.counterPartyAddress).toBe('https://provider.example/protocol');
    expect(service.isNegotiationFinalized).toBeTrue();
    expect(service.isNegotiationEnded).toBeTrue();
    expect(service.negotiationStatusError).toBeNull();
  });

  it('should reset negotiation and polling state', () => {
    service.setNegotiationData({
      providerEndpoint: 'https://provider.example/protocol',
      assetId: 'asset-001',
      contractDefinitionId: 'contract-def-001',
    }, false);
    service.setNegotiationId('neg-123');
    service.setNegotiationStatus({
      '@id': 'neg-123',
      state: 'FINALIZED',
    });

    service.resetNegotiationState();

    expect(service.negotiationData).toBeNull();
    expect(service.negotiationId).toBeNull();
    expect(service.negotiationStatus).toBeNull();
    expect(service.negotiationStatusError).toBeNull();
    expect(service.isNegotiationFinalized).toBeFalse();
    expect(service.isNegotiationTerminated).toBeFalse();
    expect(service.isNegotiationEnded).toBeFalse();
    expect(service.isNextNegotiationStatusLoading).toBeFalse();
  });
});
