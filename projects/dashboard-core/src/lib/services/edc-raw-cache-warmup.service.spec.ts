import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import type { EdcConfig } from '../models/edc-config';
import { DashboardStateService } from './dashboard-state.service';
import { EdcRawCacheWarmupService } from './edc-raw-cache-warmup.service';
import { CACHE_REFRESH_MS, RawEndpointCacheService } from './raw-endpoint-cache.service';
import { SdMatchedAssetsWarmupService } from './sd-matched-assets-warmup.service';

describe('EdcRawCacheWarmupService', () => {
  const sampleConfig: EdcConfig = {
    connectorName: 'test',
    managementUrl: 'http://management.local',
    defaultUrl: 'http://default.local',
    protocolUrl: 'http://protocol.local',
    federatedCatalogEnabled: false,
  };

  const otherConnectorConfig: EdcConfig = {
    connectorName: 'other',
    managementUrl: 'http://management.other',
    defaultUrl: 'http://default.other',
    protocolUrl: 'http://protocol.other',
    federatedCatalogEnabled: false,
  };

  let service: EdcRawCacheWarmupService;
  let rawCache: jasmine.SpyObj<RawEndpointCacheService>;
  let sdMatchedAssets: jasmine.SpyObj<SdMatchedAssetsWarmupService>;
  let currentConfig$: BehaviorSubject<EdcConfig | undefined>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    currentConfig$ = new BehaviorSubject<EdcConfig | undefined>(undefined);

    rawCache = jasmine.createSpyObj<RawEndpointCacheService>('RawEndpointCacheService', [
      'setNamespace',
      'getOrFetch',
      'forceRefresh',
      'getNamespace',
    ]);
    rawCache.getOrFetch.and.returnValue(Promise.resolve([]));
    rawCache.forceRefresh.and.returnValue(Promise.resolve([]));
    rawCache.getNamespace.and.returnValue('anonymous');

    sdMatchedAssets = jasmine.createSpyObj<SdMatchedAssetsWarmupService>('SdMatchedAssetsWarmupService', ['run']);
    sdMatchedAssets.run.and.returnValue(Promise.resolve());

    const dashboardStateStub = {
      currentEdcConfig$: currentConfig$.asObservable(),
    };

    TestBed.configureTestingModule({
      providers: [
        EdcRawCacheWarmupService,
        { provide: RawEndpointCacheService, useValue: rawCache },
        { provide: SdMatchedAssetsWarmupService, useValue: sdMatchedAssets },
        { provide: DashboardStateService, useValue: dashboardStateStub },
      ],
    });

    service = TestBed.inject(EdcRawCacheWarmupService);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  it('should set cache namespace from token', () => {
    service.scheduleAfterAuth('not-a-jwt-token');
    expect(rawCache.setNamespace).toHaveBeenCalledWith(jasmine.stringMatching(/^opaque:[a-f0-9]+$/));
  });

  it('should set namespace from JWT sub when token is a JWT', () => {
    const header = btoa(JSON.stringify({ alg: 'none' })).replace(/=/g, '');
    const payload = btoa(JSON.stringify({ sub: 'user-123' })).replace(/=/g, '');
    const jwt = `${header}.${payload}.sig`;
    service.scheduleAfterAuth(jwt);
    expect(rawCache.setNamespace).toHaveBeenCalledWith('sub:user-123');
  });

  it('should run SD-matched assets warmup after connector config exists', fakeAsync(() => {
    currentConfig$.next(sampleConfig);
    service.scheduleAfterAuth('token');
    flushMicrotasks();

    expect(sdMatchedAssets.run).toHaveBeenCalled();
    expect(rawCache.forceRefresh).not.toHaveBeenCalled();
    expect(rawCache.getOrFetch).not.toHaveBeenCalled();
  }));

  it('should not re-run warmup for repeated auth scheduling with same namespace and connector', fakeAsync(() => {
    currentConfig$.next(sampleConfig);
    service.scheduleAfterAuth('token');
    flushMicrotasks();
    expect(sdMatchedAssets.run).toHaveBeenCalledTimes(1);

    sdMatchedAssets.run.calls.reset();
    service.scheduleAfterAuth('token');
    flushMicrotasks();

    expect(sdMatchedAssets.run).not.toHaveBeenCalled();
  }));

  it('should run warmup when auth runs before connector config is available', fakeAsync(() => {
    service.scheduleAfterAuth('token');
    flushMicrotasks();
    expect(sdMatchedAssets.run).not.toHaveBeenCalled();

    currentConfig$.next(sampleConfig);
    flushMicrotasks();

    expect(sdMatchedAssets.run).toHaveBeenCalledTimes(1);
  }));

  it('should run warmup on interval without depending on route', fakeAsync(() => {
    currentConfig$.next(sampleConfig);
    service.scheduleAfterAuth('token');
    flushMicrotasks();
    sdMatchedAssets.run.calls.reset();

    tick(CACHE_REFRESH_MS);
    flushMicrotasks();

    expect(sdMatchedAssets.run).toHaveBeenCalledTimes(1);
  }));

  it('should coalesce overlapping initial warmup triggers', fakeAsync(() => {
    service.scheduleAfterAuth('same-token');
    service.scheduleAfterAuth('same-token');
    currentConfig$.next(sampleConfig);
    flushMicrotasks();

    expect(sdMatchedAssets.run).toHaveBeenCalledTimes(1);
  }));

  it('should warm again when connector identity changes', fakeAsync(() => {
    currentConfig$.next(sampleConfig);
    service.scheduleAfterAuth('token');
    flushMicrotasks();
    expect(sdMatchedAssets.run).toHaveBeenCalledTimes(1);

    sdMatchedAssets.run.calls.reset();
    currentConfig$.next(otherConnectorConfig);
    flushMicrotasks();

    expect(sdMatchedAssets.run).toHaveBeenCalledTimes(1);
  }));

  it('should warm again when auth namespace changes with same connector', fakeAsync(() => {
    rawCache.getNamespace.and.returnValue('ns-a');
    currentConfig$.next(sampleConfig);
    service.scheduleAfterAuth('token-a');
    flushMicrotasks();
    expect(sdMatchedAssets.run).toHaveBeenCalledTimes(1);

    rawCache.getNamespace.and.returnValue('ns-b');
    sdMatchedAssets.run.calls.reset();
    service.scheduleAfterAuth('token-b');
    flushMicrotasks();

    expect(sdMatchedAssets.run).toHaveBeenCalledTimes(1);
  }));
});
