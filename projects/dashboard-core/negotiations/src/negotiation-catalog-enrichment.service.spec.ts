import { TestBed } from '@angular/core/testing';
import { delay, of } from 'rxjs';
import type { Asset } from '@think-it-labs/edc-connector-client';
import { AssetService } from '@eclipse-edc/dashboard-core/assets';
import { SimplAdvancedSearchService } from '@eclipse-edc/dashboard-core/xfsc-advSearch';
import { ContractAgreement, ContractNegotiation } from '@think-it-labs/edc-connector-client';
import { NegotiationCatalogEnrichmentService } from './negotiation-catalog-enrichment.service';
import { NegotiationsService } from './negotiations.service';
import type { NegotiationRow } from './negotiation-row.model';

describe('NegotiationCatalogEnrichmentService', () => {
  let service: NegotiationCatalogEnrichmentService;
  let negotiationsService: jasmine.SpyObj<NegotiationsService>;
  let xfscSearch: jasmine.SpyObj<SimplAdvancedSearchService>;
  let assetService: jasmine.SpyObj<AssetService>;

  const placeholderAgreement = (neg: ContractNegotiation): ContractAgreement =>
    ({ id: 'ph-1', assetId: 'unknown' }) as ContractAgreement;

  function baseRow(overrides: Partial<NegotiationRow> = {}): NegotiationRow {
    return {
      negotiationId: 'neg-1',
      counterPartyId: 'cp',
      state: 'FINALIZED',
      createdAt: 1,
      displayName: 'pending',
      enrichmentStatus: 'idle',
      negotiation: { id: 'neg-1' } as ContractNegotiation,
      ...overrides,
    };
  }

  beforeEach(() => {
    negotiationsService = jasmine.createSpyObj('NegotiationsService', ['getAgreementForNegotiation']);
    xfscSearch = jasmine.createSpyObj('SimplAdvancedSearchService', ['simpleSearchSD']);
    assetService = jasmine.createSpyObj('AssetService', ['getAssetsCacheSnapshotOrLoad', 'getCachedOrFetchAssets']);
    assetService.getAssetsCacheSnapshotOrLoad.and.resolveTo(undefined);
    assetService.getCachedOrFetchAssets.and.resolveTo([]);

    TestBed.configureTestingModule({
      providers: [
        NegotiationCatalogEnrichmentService,
        { provide: NegotiationsService, useValue: negotiationsService },
        { provide: SimplAdvancedSearchService, useValue: xfscSearch },
        { provide: AssetService, useValue: assetService },
      ],
    });

    service = TestBed.inject(NegotiationCatalogEnrichmentService);
  });

  it('prefers local EDC offer.offerID over catalog simpleSearchSD', async () => {
    const edcAssetId = '408de5d6-f834-49f8-9fc2-fce122487cfe';
    const corpusSdId = 'did:web:registry:CorpusOffering:from-edc';
    const edcAsset = {
      id: edcAssetId,
      properties: { name: 'PruebaMario2', 'offer.offerID': corpusSdId },
    } as unknown as Asset;

    negotiationsService.getAgreementForNegotiation.and.resolveTo({
      id: 'a-edc',
      assetId: edcAssetId,
    } as ContractAgreement);
    assetService.getAssetsCacheSnapshotOrLoad.and.resolveTo({
      data: [edcAsset],
      fetchedAt: 0,
      expiresAt: Number.MAX_SAFE_INTEGER,
      isRefreshing: false,
    });

    const row = baseRow();
    await service.enrichRows([row], {
      createPlaceholderAgreement: placeholderAgreement,
      assetPendingLabel: 'Pending asset',
    });

    expect(row.selfDescriptionId).toBe(corpusSdId);
    expect(row.displayName).toBe('PruebaMario2');
    expect(xfscSearch.simpleSearchSD).not.toHaveBeenCalled();
  });

  it('resolves catalog name and selfDescriptionId from n wrapper', async () => {
    negotiationsService.getAgreementForNegotiation.and.resolveTo({
      id: 'a-1',
      assetId: 'asset-uuid-1',
    } as ContractAgreement);
    xfscSearch.simpleSearchSD.and.returnValue(
      of({
        totalCount: 1,
        items: [
          {
            n: {
              name: 'test offer',
              claimsGraphUri: ['did:web:registry:CorpusOffering:abc'],
            },
          },
        ],
      }),
    );

    const row = baseRow();
    await service.enrichRows([row], {
      createPlaceholderAgreement: placeholderAgreement,
      assetPendingLabel: 'Pending asset',
    });

    expect(row.displayName).toBe('test offer');
    expect(row.selfDescriptionId).toBe('did:web:registry:CorpusOffering:abc');
    expect(row.assetId).toBe('asset-uuid-1');
    expect(row.enrichmentStatus).toBe('done');
    expect(xfscSearch.simpleSearchSD).toHaveBeenCalledWith('asset-uuid-1', { page: 1, pageSize: 1 });
  });

  it('skips xfsc when assetId is cached', async () => {
    service.seedCache([['asset-cached', { displayName: 'Cached name', selfDescriptionId: 'did:cached' }]]);
    negotiationsService.getAgreementForNegotiation.and.resolveTo({
      id: 'a-2',
      assetId: 'asset-cached',
    } as ContractAgreement);

    const row = baseRow({ negotiationId: 'neg-2' });
    await service.enrichRows([row], {
      createPlaceholderAgreement: placeholderAgreement,
      assetPendingLabel: 'Pending asset',
    });

    expect(row.displayName).toBe('Cached name');
    expect(row.selfDescriptionId).toBe('did:cached');
    expect(xfscSearch.simpleSearchSD).not.toHaveBeenCalled();
  });

  it('parses flat item shape without n wrapper', async () => {
    negotiationsService.getAgreementForNegotiation.and.resolveTo({
      id: 'a-3',
      assetId: 'asset-flat',
    } as ContractAgreement);
    xfscSearch.simpleSearchSD.and.returnValue(
      of({
        items: [
          {
            name: 'flat offer',
            claimsGraphUri0: ['did:web:flat'],
          },
        ],
      }),
    );

    const row = baseRow({ negotiationId: 'neg-3' });
    await service.enrichRows([row], {
      createPlaceholderAgreement: placeholderAgreement,
      assetPendingLabel: 'Pending asset',
    });

    expect(row.displayName).toBe('flat offer');
    expect(row.selfDescriptionId).toBe('did:web:flat');
  });

  it('fetches catalog once when parallel rows share the same assetId', async () => {
    const sharedAssetId = 'asset-shared';
    negotiationsService.getAgreementForNegotiation.and.resolveTo({
      id: 'a-shared',
      assetId: sharedAssetId,
    } as ContractAgreement);
    xfscSearch.simpleSearchSD.and.returnValue(
      of({
        items: [{ n: { name: 'shared offer', claimsGraphUri: ['did:web:shared'] } }],
      }).pipe(delay(50)),
    );

    const row1 = baseRow({ negotiationId: 'neg-a' });
    const row2 = baseRow({ negotiationId: 'neg-b' });
    await service.enrichRows([row1, row2], {
      createPlaceholderAgreement: placeholderAgreement,
      assetPendingLabel: 'Pending asset',
    });

    expect(xfscSearch.simpleSearchSD).toHaveBeenCalledTimes(1);
    expect(xfscSearch.simpleSearchSD).toHaveBeenCalledWith(sharedAssetId, { page: 1, pageSize: 1 });
    expect(row1.displayName).toBe('shared offer');
    expect(row2.displayName).toBe('shared offer');
  });
});
