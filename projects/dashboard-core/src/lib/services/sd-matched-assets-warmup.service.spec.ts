import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import type { Asset } from '@think-it-labs/edc-connector-client';
import type { EdcConfig } from '../models/edc-config';
import { DashboardStateService } from './dashboard-state.service';
import { EdcClientService } from './edc-client.service';
import { RawEndpointCacheService } from './raw-endpoint-cache.service';
import { SdMatchedAssetsWarmupService } from './sd-matched-assets-warmup.service';
import {
  SD_MATCHED_ASSETS_MOCK_ACCESS_POLICY_ID,
  SD_MATCHED_ASSETS_MOCK_CONTRACT_POLICY_ID,
} from './sd-matched-assets-warmup.util';
import { createResourceDescriptionsRequestParams } from '../sd-tooling/sd-resource-descriptions.model';

describe('SdMatchedAssetsWarmupService', () => {
  const sampleConfig: EdcConfig = {
    connectorName: 'test',
    managementUrl: 'http://management.local',
    defaultUrl: 'http://default.local',
    protocolUrl: 'http://protocol.local',
    federatedCatalogEnabled: false,
  };

  let service: SdMatchedAssetsWarmupService;
  let rawCache: jasmine.SpyObj<RawEndpointCacheService>;
  let edc: jasmine.SpyObj<EdcClientService>;
  let httpMock: HttpTestingController;
  let currentConfig$: BehaviorSubject<EdcConfig | undefined>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    currentConfig$ = new BehaviorSubject<EdcConfig | undefined>(sampleConfig);

    rawCache = jasmine.createSpyObj<RawEndpointCacheService>('RawEndpointCacheService', ['clear', 'forceRefresh']);
    rawCache.forceRefresh.and.returnValue(Promise.resolve([]));

    const assetsQueryAll = jasmine.createSpy('assetsQueryAll');
    assetsQueryAll.and.callFake(async (spec: { offset?: number }) => {
      const offset = spec?.offset ?? 0;
      if (offset === 0) {
        return [
          {
            '@id': 'e3a2a362-06f5-46f2-b22d-70bb30d1c641',
            properties: { sdId: 'did:match-a' },
          },
          { properties: { sdId: 'did:unmatched' } },
        ] as unknown as Asset[];
      }
      return [] as Asset[];
    });

    const contractDefinitionsQueryAll = jasmine.createSpy('contractDefinitionsQueryAll');
    contractDefinitionsQueryAll.and.callFake(async (spec: { offset?: number }) => {
      const offset = spec?.offset ?? 0;
      if (offset === 0) {
        return [
          {
            accessPolicyId: 'acc-warmup-test',
            contractPolicyId: 'con-warmup-test',
            assetsSelector: {
              operandLeft: 'https://w3id.org/edc/v0.0.1/ns/id',
              operator: '=',
              operandRight: 'e3a2a362-06f5-46f2-b22d-70bb30d1c641',
            },
          },
        ];
      }
      return [];
    });

    const mockClient = {
      management: {
        assets: { queryAll: assetsQueryAll },
        contractDefinitions: { queryAll: contractDefinitionsQueryAll },
      },
    };

    edc = jasmine.createSpyObj<EdcClientService>('EdcClientService', ['getClient']);
    edc.getClient.and.returnValue(Promise.resolve(mockClient as never));

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SdMatchedAssetsWarmupService,
        { provide: RawEndpointCacheService, useValue: rawCache },
        { provide: EdcClientService, useValue: edc },
        {
          provide: DashboardStateService,
          useValue: { currentEdcConfig$: currentConfig$.asObservable() },
        },
      ],
    });

    service = TestBed.inject(SdMatchedAssetsWarmupService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('clears policy cache, pages SD + assets, and caches only sdId matches', async () => {
    const p = service.run({ trigger: 'test' });
    await Promise.resolve();
    await Promise.resolve();
    const matches = httpMock.match(req => req.url.includes('resourceDescriptions'));
    expect(matches.length).toBe(1);
    expect(matches[0].request.method).toBe('GET');
    expect(matches[0].request.params.keys().sort()).toEqual(
      Object.keys(createResourceDescriptionsRequestParams()).sort(),
    );
    expect(matches[0].request.params.get('orderBy')).toBe('publicationDate');
    matches[0].flush({
      totalCount: 2,
      items: [{ n: { claimsGraphUri: ['did:match-a'] } }, { n: { claimsGraphUri: ['did:other-claim'] } }],
    });

    await p;

    expect(rawCache.clear).toHaveBeenCalledWith('policydefinitions/request');
    expect(edc.getClient).toHaveBeenCalled();

    const forceArgs = rawCache.forceRefresh.calls.mostRecent().args;
    expect(forceArgs[0]).toBe('assets/request');
    const fetcher = forceArgs[1] as () => Promise<readonly unknown[]>;
    const written = await fetcher();
    expect(written.length).toBe(1);
    expect((written[0] as unknown as { properties: { sdId: string } }).properties.sdId).toBe('did:match-a');
    expect((written[0] as unknown as { accessPolicyId?: string }).accessPolicyId).toBe('acc-warmup-test');
    expect((written[0] as unknown as { contractPolicyId?: string }).contractPolicyId).toBe('con-warmup-test');
  });

  it('mock mode skips SD and EDC calls and writes mock asset', async () => {
    currentConfig$.next({ ...sampleConfig, dashboardMocksEnabled: true });

    await service.run({ trigger: 'mock' });

    expect(rawCache.clear).toHaveBeenCalledWith('policydefinitions/request');
    expect(httpMock.match(() => true).length).toBe(0);
    expect(edc.getClient).not.toHaveBeenCalled();

    const fetcher = rawCache.forceRefresh.calls.mostRecent().args[1] as () => Promise<readonly unknown[]>;
    const written = await fetcher();
    expect(written.length).toBe(1);
    expect((written[0] as unknown as { accessPolicyId?: string }).accessPolicyId).toBe(
      SD_MATCHED_ASSETS_MOCK_ACCESS_POLICY_ID,
    );
    expect((written[0] as unknown as { contractPolicyId?: string }).contractPolicyId).toBe(
      SD_MATCHED_ASSETS_MOCK_CONTRACT_POLICY_ID,
    );
  });

  it('does not use SD warmup mock when dashboardMocksEnabled is false', async () => {
    currentConfig$.next({ ...sampleConfig, dashboardMocksEnabled: false });

    const p = service.run({ trigger: 'test' });
    await Promise.resolve();
    await Promise.resolve();
    const matches = httpMock.match(req => req.url.includes('resourceDescriptions'));
    expect(matches.length).toBe(1);
    matches[0].flush({
      totalCount: 1,
      items: [{ n: { claimsGraphUri: ['did:match-a'] } }],
    });

    await p;

    expect(edc.getClient).toHaveBeenCalled();
    const fetcher = rawCache.forceRefresh.calls.mostRecent().args[1] as () => Promise<readonly unknown[]>;
    const written = await fetcher();
    expect(written.length).toBe(1);
    expect((written[0] as unknown as { properties: { sdId: string } }).properties.sdId).toBe('did:match-a');
  });

  it('caches three CorpusOffering assets when SD lists five claims', async () => {
    const corpusUri1 = 'did:web:registry.gaia-x.eu:CorpusOffering:1ee39136-6508-4b88-9c21-cb7235a74ddb';
    const corpusUri2 = 'did:web:registry.gaia-x.eu:CorpusOffering:a8ed833f-ddff-4d03-8aaa-2f3eea00f084';
    const corpusUri3 = 'did:web:registry.gaia-x.eu:CorpusOffering:4d82a619-3b3d-40c9-aa2b-67053643bb61';

    const assetsQueryAll = jasmine.createSpy('assetsQueryAll');
    assetsQueryAll.and.resolveTo([
      { '@id': 'minio-1', properties: { id: 'minio-1' } },
      { '@id': 'minio-2', properties: { id: 'minio-2' } },
      {
        '@id': '0868093e-0c4f-44e7-9a50-4ce1aa76f9d6',
        properties: { sdId: corpusUri1, 'offer.offerID': corpusUri1 },
      },
      {
        '@id': '11c02ca8-39da-4182-ae2c-fab05238cc52',
        properties: { sdId: corpusUri2, 'offer.offerID': corpusUri2 },
      },
      {
        '@id': 'f7e8ba8c-1368-4d7f-9a83-ebb1f69dbe8e',
        properties: { sdId: corpusUri3, 'offer.offerID': corpusUri3 },
      },
    ] as unknown as import('@think-it-labs/edc-connector-client').Asset[]);

    const contractDefinitionsQueryAll = jasmine.createSpy('contractDefinitionsQueryAll').and.resolveTo([]);
    const mockClient = {
      management: {
        assets: { queryAll: assetsQueryAll },
        contractDefinitions: { queryAll: contractDefinitionsQueryAll },
      },
    };
    edc.getClient.and.returnValue(Promise.resolve(mockClient as never));

    const p = service.run({ trigger: 'corpus-sample' });
    await Promise.resolve();
    await Promise.resolve();
    const sdReq = httpMock.expectOne(req => req.url.includes('resourceDescriptions'));
    sdReq.flush({
      totalCount: 5,
      items: [
        { n: { claimsGraphUri: [corpusUri1] } },
        { n: { claimsGraphUri: ['did:web:registry.gaia-x.eu:CorpusOffering:3de89378-e459-4310-86c7-8ceeb5d83d0c'] } },
        { n: { claimsGraphUri: [corpusUri3] } },
        { n: { claimsGraphUri: [corpusUri2] } },
        { n: { claimsGraphUri: ['did:web:registry.gaia-x.eu:CorpusOffering:f7922736-d219-4978-9c0f-4276e61cb51a'] } },
      ],
    });

    await p;

    const fetcher = rawCache.forceRefresh.calls.mostRecent().args[1] as () => Promise<readonly unknown[]>;
    const written = await fetcher();
    expect(written.length).toBe(3);
    const sdIds = written.map(w => (w as unknown as { properties: { sdId: string } }).properties.sdId);
    expect(sdIds).toContain(corpusUri1);
    expect(sdIds).toContain(corpusUri2);
    expect(sdIds).toContain(corpusUri3);
  });

  it('fetches SD resource descriptions in a single GET (no offset/limit)', async () => {
    const p = service.run({ trigger: 'single-sd' });
    await Promise.resolve();
    await Promise.resolve();

    const sdReqs = httpMock.match(req => req.url.includes('resourceDescriptions'));
    expect(sdReqs.length).toBe(1);
    expect(sdReqs[0].request.method).toBe('GET');
    expect(sdReqs[0].request.params.get('orderBy')).toBe('publicationDate');
    expect(sdReqs[0].request.params.keys().length).toBe(1);
    sdReqs[0].flush({
      items: Array.from({ length: 50 }, () => ({ n: { claimsGraphUri: ['did:p'] } })),
    });

    await p;
  });
});
