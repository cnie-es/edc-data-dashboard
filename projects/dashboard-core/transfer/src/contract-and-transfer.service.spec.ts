/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  This program and the accompanying materials are made available under the
 *  terms of the Apache License, Version 2.0 which is available at
 *  https://www.apache.org/licenses/LICENSE-2.0
 *
 *  SPDX-License-Identifier: Apache-2.0
 *
 *  Contributors:
 *       Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V. - initial API and implementation
 *
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpEventType } from '@angular/common/http';
import { ContractAndTransferService } from './contract-and-transfer.service';
import { EdcClientService } from '@eclipse-edc/dashboard-core';
import { ContractAgreement, ContractNegotiation, JsonLdObject } from '@think-it-labs/edc-connector-client';

describe('ContractAgreementService', () => {
  let service: ContractAndTransferService;
  let edcClientServiceSpy: jasmine.SpyObj<EdcClientService>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    const edcClientServiceMock = jasmine.createSpyObj('EdcClientService', ['getClient']);
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ContractAndTransferService, { provide: EdcClientService, useValue: edcClientServiceMock }],
    });

    service = TestBed.inject(ContractAndTransferService);
    edcClientServiceSpy = TestBed.inject(EdcClientService) as jasmine.SpyObj<EdcClientService>;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should retrieve all contract agreements', async () => {
    const mockAgreements: ContractAgreement[] = [{ id: '1' } as ContractAgreement];
    const mockApi = {
      management: {
        contractAgreements: {
          queryAll: jasmine.createSpy().and.returnValue(Promise.resolve(mockAgreements)),
        },
      },
    };
    edcClientServiceSpy.getClient.and.returnValue(Promise.resolve(mockApi as any));

    const result = await service.getAllContractAgreements();
    expect(result).toEqual(mockAgreements);
    expect(mockApi.management.contractAgreements.queryAll).toHaveBeenCalled();
  });

  it('should retrieve a contract agreement by ID', async () => {
    const mockAgreement: ContractAgreement = { id: '1' } as ContractAgreement;
    const mockApi = {
      management: {
        contractAgreements: {
          get: jasmine.createSpy().and.returnValue(Promise.resolve(mockAgreement)),
        },
      },
    };
    edcClientServiceSpy.getClient.and.returnValue(Promise.resolve(mockApi as any));

    const result = await service.getContractAgreement('1');
    expect(result).toEqual(mockAgreement);
    expect(mockApi.management.contractAgreements.get).toHaveBeenCalledWith('1');
  });

  it('should retrieve a contract negotiation by agreement ID', async () => {
    const mockNegotiation: ContractNegotiation = { id: '1' } as ContractNegotiation;
    const mockApi = {
      management: {
        contractAgreements: {
          getNegotiation: jasmine.createSpy().and.returnValue(Promise.resolve(mockNegotiation)),
        },
      },
    };
    edcClientServiceSpy.getClient.and.returnValue(Promise.resolve(mockApi as any));

    const result = await service.getNegotiationByAgreement('1');
    expect(result).toEqual(mockNegotiation);
    expect(mockApi.management.contractAgreements.getNegotiation).toHaveBeenCalledWith('1');
  });

  it('should retrieve EDR data address for a transfer ID', async () => {
    const mockEdr = { '@type': 'DataAddress', type: 'HttpData' } as unknown as JsonLdObject;
    const mockApi = {
      management: {
        edrs: {
          dataAddress: jasmine.createSpy().and.returnValue(Promise.resolve(mockEdr)),
        },
      },
    };
    edcClientServiceSpy.getClient.and.returnValue(Promise.resolve(mockApi as any));

    const result = await service.getEdrDataAddress('transfer-1');
    expect(result).toEqual(mockEdr);
    expect(mockApi.management.edrs.dataAddress).toHaveBeenCalledWith('transfer-1');
  });

  it('should throw when no EDR data address is found', async () => {
    const mockApi = {
      management: {
        edrs: {
          dataAddress: jasmine.createSpy().and.returnValue(Promise.resolve(undefined)),
        },
      },
    };
    edcClientServiceSpy.getClient.and.returnValue(Promise.resolve(mockApi as any));

    await expectAsync(service.getEdrDataAddress('transfer-1')).toBeRejectedWithError(
      'No EDR found for transfer ID transfer-1',
    );
  });

  it('should throw when executePullTransfer has no transfer ID', async () => {
    await expectAsync(
      service.executePullTransfer({
        transferId: undefined,
        method: 'GET',
        queryParams: {},
        body: undefined,
      }),
    ).toBeRejectedWithError('No transfer ID provided');
  });

  it('should execute pull transfer with GET and query params', async () => {
    const mockEdr = {
      mandatoryValue: jasmine.createSpy().and.callFake((_ns: string, key: string) => {
        if (key === 'endpoint') {
          return 'https://public.test/data';
        }
        if (key === 'authorization') {
          return 'token-123';
        }
        return '';
      }),
    } as unknown as JsonLdObject;

    spyOn(service, 'getEdrDataAddress').and.returnValue(Promise.resolve(mockEdr));

    const download$ = await service.executePullTransfer({
      transferId: 'transfer-1',
      method: 'GET',
      queryParams: { foo: 'bar' },
      body: undefined,
    });

    let completed = false;
    download$.subscribe(event => {
      if (event.type === HttpEventType.Response) {
        completed = true;
      }
    });

    const req = httpMock.expectOne('https://public.test/data?foo=bar');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('token-123');
    req.flush(new Blob(['test']));
    expect(completed).toBeTrue();
  });

  it('should execute pull transfer with POST and JSON body', async () => {
    const mockEdr = {
      mandatoryValue: jasmine.createSpy().and.callFake((_ns: string, key: string) => {
        if (key === 'endpoint') {
          return 'https://public.test/data';
        }
        if (key === 'authorization') {
          return 'token-456';
        }
        return '';
      }),
    } as unknown as JsonLdObject;

    spyOn(service, 'getEdrDataAddress').and.returnValue(Promise.resolve(mockEdr));

    const body = { key: 'value' };
    const download$ = await service.executePullTransfer({
      transferId: 'transfer-2',
      method: 'POST',
      queryParams: {},
      body,
    });

    download$.subscribe();

    const req = httpMock.expectOne('https://public.test/data');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('token-456');
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    expect(req.request.body).toEqual(body);
    req.flush(new Blob(['ok']));
  });
});
