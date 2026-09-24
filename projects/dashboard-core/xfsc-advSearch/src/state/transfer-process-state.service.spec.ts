import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { REST_API_DATA_TEMPLATE_ID } from '../services/transfer-template.util';
import { TransferProcessService } from '../services/transfer-process.service';
import { TransferProcessStateService } from './transfer-process-state.service';

const restApiTransferRequestData = {
  contractAgreementId: 'agreement-001',
  counterPartyAddress: 'https://provider.example/protocol',
  templateId: REST_API_DATA_TEMPLATE_ID,
  dataDestination: {
    type: 'RestApi',
    baseUrl: 'https://consumer.example/destination',
  },
};

describe('TransferProcessStateService', () => {
  let service: TransferProcessStateService;
  let api: jasmine.SpyObj<TransferProcessService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<TransferProcessService>('TransferProcessService', [
      'startTransferProcess',
      'fetchTransferProcessStatus',
    ]);

    TestBed.configureTestingModule({
      providers: [
        TransferProcessStateService,
        {
          provide: TransferProcessService,
          useValue: api,
        },
      ],
    });

    service = TestBed.inject(TransferProcessStateService);
  });

  afterEach(() => {
    service.resetTransferState();
  });

  it('should start transfer process and set transfer process id', () => {
    service.setTransferRequestData({
      contractAgreementId: 'agreement-001',
      counterPartyAddress: 'https://provider.example/protocol',
      templateId: 'HttpData-PULL',
      dataDestination: {
        type: 'HttpData',
        baseUrl: 'https://consumer.example/destination',
      },
    });
    api.startTransferProcess.and.returnValue(of({ transferProcessId: 'transfer-123' }));

    service.initiateTransferProcess();

    expect(api.startTransferProcess).toHaveBeenCalledTimes(1);
    expect(service.transferProcessId).toBe('transfer-123');
  });

  it('should update status and derived flags when polling succeeds', () => {
    service.setTransferProcessId('transfer-123');
    api.fetchTransferProcessStatus.and.returnValue(
      of({
        '@id': 'transfer-123',
        state: 'COMPLETED',
      }),
    );

    service.fetchNewTransferProcessStatus();

    expect(service.transferProcessStatus?.state).toBe('COMPLETED');
    expect(service.isTransferProcessFinalized).toBeTrue();
    expect(service.isTransferProcessTerminated).toBeFalse();
    expect(service.isTransferProcessEnded).toBeTrue();
    expect(service.isNextTransferProcessStatusLoading).toBeFalse();
  });

  it('should stop progression on polling error', () => {
    service.setTransferProcessId('transfer-123');
    api.fetchTransferProcessStatus.and.returnValue(
      throwError(() => ({
        title: 'Transfer process status failed',
        description: 'Unexpected backend error',
      })),
    );

    service.fetchNewTransferProcessStatus();

    expect(service.transferProcessStatusError).toEqual({
      title: 'Transfer process status failed',
      description: 'Unexpected backend error',
    });
    expect(service.isTransferProcessEnded).toBeTrue();
    expect(service.isNextTransferProcessStatusLoading).toBeFalse();
  });

  it('should poll every 3 seconds and avoid overlapping in-flight requests', fakeAsync(() => {
    const statusSubject = new Subject<{
      '@id': string;
      state: string;
    }>();
    service.setTransferProcessId('transfer-123');
    api.fetchTransferProcessStatus.and.returnValue(statusSubject.asObservable());

    service.resumePolling();

    tick(3000);
    expect(api.fetchTransferProcessStatus).toHaveBeenCalledTimes(1);

    tick(3000);
    expect(api.fetchTransferProcessStatus).toHaveBeenCalledTimes(1);

    statusSubject.next({ '@id': 'transfer-123', state: 'STARTED' });
    statusSubject.complete();
    tick(1);

    tick(3000);
    expect(api.fetchTransferProcessStatus).toHaveBeenCalledTimes(2);
  }));

  it('should finalize REST API template transfer when state is STARTED', () => {
    service.setTransferRequestData(restApiTransferRequestData);
    service.setTransferProcessId('transfer-123');
    api.fetchTransferProcessStatus.and.returnValue(
      of({
        '@id': 'transfer-123',
        state: 'STARTED',
      }),
    );

    service.fetchNewTransferProcessStatus();

    expect(service.transferProcessStatus?.state).toBe('STARTED');
    expect(service.isTransferProcessFinalized).toBeTrue();
    expect(service.isTransferProcessTerminated).toBeFalse();
    expect(service.isTransferProcessEnded).toBeTrue();
  });

  it('should not finalize non-REST API template transfer when state is STARTED', () => {
    service.setTransferRequestData({
      contractAgreementId: 'agreement-001',
      counterPartyAddress: 'https://provider.example/protocol',
      templateId: '5',
      dataDestination: {
        type: 'MinioS3',
        bucketName: 'test-bucket',
      },
    });
    service.setTransferProcessId('transfer-123');
    api.fetchTransferProcessStatus.and.returnValue(
      of({
        '@id': 'transfer-123',
        state: 'STARTED',
      }),
    );

    service.fetchNewTransferProcessStatus();

    expect(service.transferProcessStatus?.state).toBe('STARTED');
    expect(service.isTransferProcessFinalized).toBeFalse();
    expect(service.isTransferProcessEnded).toBeFalse();
  });

  it('should still finalize REST API template transfer when state is COMPLETED', () => {
    service.setTransferRequestData(restApiTransferRequestData);
    service.setTransferProcessId('transfer-123');
    api.fetchTransferProcessStatus.and.returnValue(
      of({
        '@id': 'transfer-123',
        state: 'COMPLETED',
      }),
    );

    service.fetchNewTransferProcessStatus();

    expect(service.isTransferProcessFinalized).toBeTrue();
    expect(service.isTransferProcessEnded).toBeTrue();
  });

  it('should terminate REST API template transfer without finalizing on TERMINATED', () => {
    service.setTransferRequestData(restApiTransferRequestData);
    service.setTransferProcessId('transfer-123');
    api.fetchTransferProcessStatus.and.returnValue(
      of({
        '@id': 'transfer-123',
        state: 'TERMINATED',
      }),
    );

    service.fetchNewTransferProcessStatus();

    expect(service.isTransferProcessFinalized).toBeFalse();
    expect(service.isTransferProcessTerminated).toBeTrue();
    expect(service.isTransferProcessEnded).toBeTrue();
  });

  it('should stop polling after STARTED for REST API template', fakeAsync(() => {
    const statusSubject = new Subject<{
      '@id': string;
      state: string;
    }>();
    service.setTransferRequestData(restApiTransferRequestData);
    service.setTransferProcessId('transfer-123');
    api.fetchTransferProcessStatus.and.returnValue(statusSubject.asObservable());

    service.resumePolling();

    tick(3000);
    expect(api.fetchTransferProcessStatus).toHaveBeenCalledTimes(1);

    statusSubject.next({ '@id': 'transfer-123', state: 'STARTED' });
    statusSubject.complete();
    tick(1);

    tick(3000);
    expect(api.fetchTransferProcessStatus).toHaveBeenCalledTimes(1);
    expect(service.isTransferProcessFinalized).toBeTrue();
    expect(service.isTransferProcessEnded).toBeTrue();
  }));

  it('should reset transfer and polling state', () => {
    service.setTransferRequestData({
      contractAgreementId: 'agreement-001',
      counterPartyAddress: 'https://provider.example/protocol',
      templateId: 'HttpData-PULL',
      dataDestination: {
        type: 'HttpData',
        baseUrl: 'https://consumer.example/destination',
      },
    });
    service.setTransferProcessId('transfer-123');
    service.setTransferProcessStatus({
      '@id': 'transfer-123',
      state: 'COMPLETED',
    });

    service.resetTransferState();

    expect(service.transferRequestData).toBeNull();
    expect(service.transferProcessId).toBeNull();
    expect(service.transferProcessStatus).toBeNull();
    expect(service.transferProcessStatusError).toBeNull();
    expect(service.isTransferProcessFinalized).toBeFalse();
    expect(service.isTransferProcessTerminated).toBeFalse();
    expect(service.isTransferProcessEnded).toBeFalse();
    expect(service.isNextTransferProcessStatusLoading).toBeFalse();
  });
});
