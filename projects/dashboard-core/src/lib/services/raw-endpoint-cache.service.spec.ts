import 'fake-indexeddb/auto';

import { TestBed } from '@angular/core/testing';
import { deleteRawEndpointCacheDatabaseForTests } from './raw-endpoint-cache-idb';
import { RawEndpointCacheService } from './raw-endpoint-cache.service';

describe('RawEndpointCacheService', () => {
  let service: RawEndpointCacheService;

  beforeEach(async () => {
    await deleteRawEndpointCacheDatabaseForTests();
    TestBed.configureTestingModule({
      providers: [RawEndpointCacheService],
    });
    service = TestBed.inject(RawEndpointCacheService);
    service.setNamespace('test-ns');
  });

  afterEach(async () => {
    await service.clear('assets/request');
    await service.clear('policydefinitions/request');
    await deleteRawEndpointCacheDatabaseForTests();
  });

  it('getOrFetch should call fetcher once while entry is not expired', async () => {
    const fetcher = jasmine.createSpy('fetcher').and.returnValue(Promise.resolve([{ id: 'a' }]));
    const ttl = 60_000;

    await service.getOrFetch('assets/request', fetcher, ttl);
    await service.getOrFetch('assets/request', fetcher, ttl);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('getOrFetch should call fetcher again after TTL expires', async () => {
    const fetcher = jasmine.createSpy('fetcher').and.returnValue(Promise.resolve([{ id: 'a' }]));
    const ttl = 50;

    await service.getOrFetch('assets/request', fetcher, ttl);
    expect(fetcher).toHaveBeenCalledTimes(1);

    await new Promise(r => setTimeout(r, ttl + 30));

    await service.getOrFetch('assets/request', fetcher, ttl);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('forceRefresh should persist to IndexedDB and clear should remove', async () => {
    const fetcher = jasmine.createSpy('fetcher').and.returnValue(Promise.resolve([{ x: 1 }]));
    await service.forceRefresh('assets/request', fetcher, 60_000);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [RawEndpointCacheService],
    });
    const service2 = TestBed.inject(RawEndpointCacheService);
    service2.setNamespace('test-ns');
    const fetcher2 = jasmine.createSpy('fetcher2').and.returnValue(Promise.resolve([{ y: 2 }]));
    await service2.getOrFetch('assets/request', fetcher2, 60_000);
    expect(fetcher2).not.toHaveBeenCalled();

    await service2.clear('assets/request');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [RawEndpointCacheService],
    });
    const service3 = TestBed.inject(RawEndpointCacheService);
    service3.setNamespace('test-ns');
    const fetcher3 = jasmine.createSpy('fetcher3').and.returnValue(Promise.resolve([{ z: 3 }]));
    await service3.getOrFetch('assets/request', fetcher3, 60_000);
    expect(fetcher3).toHaveBeenCalledTimes(1);
  });

  it('namespaces should isolate storage keys', async () => {
    const fetcherA = jasmine.createSpy('fetcherA').and.returnValue(Promise.resolve([1]));
    const fetcherB = jasmine.createSpy('fetcherB').and.returnValue(Promise.resolve([2]));

    service.setNamespace('user-a');
    await service.forceRefresh('assets/request', fetcherA, 60_000);

    service.setNamespace('user-b');
    await service.forceRefresh('assets/request', fetcherB, 60_000);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [RawEndpointCacheService],
    });
    const svcA = TestBed.inject(RawEndpointCacheService);
    svcA.setNamespace('user-a');
    const verifyA = jasmine.createSpy('verifyA').and.returnValue(Promise.resolve([9]));
    await svcA.getOrFetch('assets/request', verifyA, 60_000);
    expect(verifyA).not.toHaveBeenCalled();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [RawEndpointCacheService],
    });
    const svcB = TestBed.inject(RawEndpointCacheService);
    svcB.setNamespace('user-b');
    const verifyB = jasmine.createSpy('verifyB').and.returnValue(Promise.resolve([9]));
    await svcB.getOrFetch('assets/request', verifyB, 60_000);
    expect(verifyB).not.toHaveBeenCalled();
  });
});
