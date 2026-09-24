// Karma for this library only runs specs under projects/dashboard-core/src/.
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import {
  DASHBOARD_CONNECTOR_PERSPECTIVE,
  DashboardStateService,
  ModalAndAlertService,
} from '@eclipse-edc/dashboard-core';
import { CorpusSelfDescriptionDetailModalComponent } from '../../../negotiations/src/corpus-self-description-detail-modal/corpus-self-description-detail-modal.component';
import { ContractAgreement, ContractNegotiation } from '@think-it-labs/edc-connector-client';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Subject, firstValueFrom } from 'rxjs';
import { ContractViewComponent } from '../../../negotiations/src/contract-agreement-view/contract-view.component';
import { AssetService } from '../../../assets/src/asset.service';
import { ContractConsumptionService } from '../../../xfsc-advSearch/src/services/contract-consumption.service';
import { ContractTransferModalComponent } from '../../../xfsc-advSearch/src/contract-transfer-modal/contract-transfer-modal.component';
import { NegotiationsService } from '../../../negotiations/src/negotiations.service';
import { NegotiationCatalogEnrichmentService } from '../../../negotiations/src/negotiation-catalog-enrichment.service';
import type { NegotiationRow } from '../../../negotiations/src/negotiation-row.model';

describe('ContractViewComponent mapping helpers', () => {
  function stubTranslate(): TranslateService {
    return {
      instant: (key: string) => {
        if (key === 'negotiation.assetPending') {
          return 'PENDING_I18N';
        }
        if (key === 'assets.detail.errorInvalidId') {
          return 'INVALID_SD_ID';
        }
        if (key === 'negotiation.stateUnknown') {
          return 'UNKNOWN_STATE';
        }
        if (key === 'negotiation.state.FINALIZED') {
          return 'Estado finalizado';
        }
        if (key === 'negotiation.state.WEIRD') {
          return key;
        }
        return key;
      },
    } as TranslateService;
  }

  function createComponent(): ContractViewComponent {
    const component = Object.create(ContractViewComponent.prototype) as ContractViewComponent;
    (component as unknown as { destroy$: Subject<void> }).destroy$ = new Subject<void>();
    (component as unknown as { searchInput$: Subject<string> }).searchInput$ = new Subject<string>();
    (component as unknown as { backgroundEnrichmentToken: number }).backgroundEnrichmentToken = 0;
    (component as unknown as { translate: TranslateService }).translate = stubTranslate();
    // Object.create bypasses field initializers, so wire the participant-name resolution deps manually.
    (component as unknown as { participantNameCache: Map<string, string> }).participantNameCache = new Map();
    (
      component as unknown as { participantNameService: { getName: (id: string) => Promise<string> } }
    ).participantNameService = { getName: async (id: string) => id };
    return component;
  }

  function row(overrides: Partial<NegotiationRow> = {}): NegotiationRow {
    return {
      negotiationId: 'negotiation-1',
      counterPartyId: 'acme',
      state: 'FINALIZED',
      createdAt: 0,
      type: 'PROVIDER',
      displayName: 'Catalog title',
      enrichmentStatus: 'done',
      negotiation: {
        id: 'negotiation-1',
        counterPartyId: 'acme',
        state: 'FINALIZED',
      } as unknown as ContractNegotiation,
      ...overrides,
    };
  }

  it('maps role from negotiation type', () => {
    const component = createComponent();
    expect(component.roleLabel(row({ type: 'PROVIDER' }))).toBe('Proveedor');
    expect(component.roleLabel(row({ type: 'CONSUMER' }))).toBe('Consumidor');
  });

  it('identifies finalized and terminated negotiations', () => {
    const component = createComponent();
    expect(component.isFinalized(row({ state: 'FINALIZED' }))).toBeTrue();
    expect(component.isFinalized(row({ state: 'REQUESTED' }))).toBeFalse();
    expect(component.isTerminated(row({ state: 'TERMINATED' }))).toBeTrue();
    expect(component.isTerminated(row({ state: 'FINALIZED' }))).toBeFalse();
  });

  it('identifies consumer negotiations', () => {
    const component = createComponent();
    expect(component.isConsumer(row({ type: 'CONSUMER' }))).toBeTrue();
    expect(component.isConsumer(row({ type: 'PROVIDER' }))).toBeFalse();
  });

  it('derives provider view and table colspan from contractType', () => {
    const component = createComponent();
    (component as unknown as { contractType: 'CONSUMER' | 'PROVIDER' }).contractType = 'PROVIDER';
    expect(component.isProviderView()).toBeTrue();
    expect(component.tableColspan).toBe(4);
    (component as unknown as { contractType: 'CONSUMER' | 'PROVIDER' }).contractType = 'CONSUMER';
    expect(component.isProviderView()).toBeFalse();
    expect(component.tableColspan).toBe(5);
  });

  it('detects pending asset name enrichment', () => {
    const component = createComponent();
    expect(component.isAssetNamePending(row({ enrichmentStatus: 'idle' }))).toBeTrue();
    expect(component.isAssetNamePending(row({ enrichmentStatus: 'loading' }))).toBeTrue();
    expect(component.isAssetNamePending(row({ enrichmentStatus: 'done' }))).toBeFalse();
    expect(component.isAssetNamePending(row({ enrichmentStatus: 'error' }))).toBeFalse();
  });

  it('maps status to badge classes', () => {
    const component = createComponent();
    expect(component.statusBadgeClass(row({ state: 'FINALIZED' }))).toBe('badge-success');
    expect(component.statusBadgeClass(row({ state: 'TERMINATED' }))).toBe('badge-error');
    expect(component.statusBadgeClass(row({ state: 'TERMINATING' }))).toBe('badge-error');
    expect(component.statusBadgeClass(row({ state: 'VERIFIED' }))).toBe('badge-info');
    expect(component.statusBadgeClass(row({ state: 'AGREEING' }))).toBe('badge-info');
    expect(component.statusBadgeClass(row({ state: 'REQUESTED' }))).toBe('badge-warning');
  });

  it('falls back to counterPartyId for provider label when the agreement is not yet loaded', () => {
    const component = createComponent();
    expect(component.providerLabel(row({ counterPartyId: 'c1' }))).toBe('c1');
    expect(component.providerLabel(row({ counterPartyId: '  ' }))).toBe('-');
  });

  it('maps provider label from the agreement assigner over counterPartyId', () => {
    const component = createComponent();
    const agreement = {
      id: 'agr-1',
      policy: { 'odrl:assigner': { '@id': 'provider-from-assigner' } },
    } as unknown as ContractAgreement;
    expect(component.providerLabel(row({ counterPartyId: 'consumer-cp', agreement }))).toBe('provider-from-assigner');
  });

  it('translates negotiation state labels with fallback for unknown states', () => {
    const component = createComponent();
    expect(component.negotiationStateLabel(row({ state: 'FINALIZED' }), false)).toBe('Estado finalizado');
    expect(component.negotiationStateLabel(row({ state: 'WEIRD' }), false)).toBe('UNKNOWN_STATE (WEIRD)');
    expect(component.negotiationStateLabel(undefined, false)).toBe('-');
  });

  it('filters by negotiation id, display name, counterPartyId, and state', async () => {
    const component = createComponent() as ContractViewComponent;
    initRowSubjects(component);
    (component as unknown as { rowsSubject: BehaviorSubject<NegotiationRow[]> }).rowsSubject.next([
      row({ negotiationId: 'negotiation-1', counterPartyId: 'acme', state: 'FINALIZED', displayName: 'Alpha' }),
      row({
        negotiationId: 'negotiation-2',
        counterPartyId: 'other',
        state: 'TERMINATED',
        displayName: 'Beta',
      }),
    ]);
    (component as unknown as { filteredRowsSubject: BehaviorSubject<NegotiationRow[]> }).filteredRowsSubject.next(
      (component as unknown as { rowsSubject: BehaviorSubject<NegotiationRow[]> }).rowsSubject.value,
    );
    component.rows$ = (
      component as unknown as { rowsSubject: BehaviorSubject<NegotiationRow[]> }
    ).rowsSubject.asObservable();
    component.filteredRows$ = (
      component as unknown as { filteredRowsSubject: BehaviorSubject<NegotiationRow[]> }
    ).filteredRowsSubject.asObservable();

    (component as unknown as { applyFilter: (text: string) => void }).applyFilter('negotiation-2');
    expect(
      (component as unknown as { filteredRowsSubject: BehaviorSubject<NegotiationRow[]> }).filteredRowsSubject.value
        .length,
    ).toBe(1);

    (component as unknown as { applyFilter: (text: string) => void }).applyFilter('acme');
    expect(
      (component as unknown as { filteredRowsSubject: BehaviorSubject<NegotiationRow[]> }).filteredRowsSubject.value
        .length,
    ).toBe(1);

    (component as unknown as { applyFilter: (text: string) => void }).applyFilter('Estado finalizado');
    expect(
      (component as unknown as { filteredRowsSubject: BehaviorSubject<NegotiationRow[]> }).filteredRowsSubject.value
        .length,
    ).toBe(1);

    (component as unknown as { rowsSubject: BehaviorSubject<NegotiationRow[]> }).rowsSubject.next([
      row({
        negotiationId: 'n3',
        displayName: 'Catálogo bonito',
        selfDescriptionId: 'did:sd-1',
        assetId: 'asset-x',
      }),
    ]);
    (component as unknown as { applyFilter: (text: string) => void }).applyFilter('catálogo');
    expect(
      (component as unknown as { filteredRowsSubject: BehaviorSubject<NegotiationRow[]> }).filteredRowsSubject.value
        .length,
    ).toBe(1);
    (component as unknown as { applyFilter: (text: string) => void }).applyFilter('did:sd-1');
    expect(
      (component as unknown as { filteredRowsSubject: BehaviorSubject<NegotiationRow[]> }).filteredRowsSubject.value
        .length,
    ).toBe(1);
  });

  it('debounces search input before applying filter', fakeAsync(() => {
    const component = createComponent() as ContractViewComponent;
    initRowSubjects(component);
    (component as unknown as { setupSearchDebounce: () => void }).setupSearchDebounce();
    (component as unknown as { rowsSubject: BehaviorSubject<NegotiationRow[]> }).rowsSubject.next([
      row({ negotiationId: 'negotiation-1' }),
      row({ negotiationId: 'negotiation-2' }),
    ]);

    component.onSearchInput('negotiation-2');
    expect(
      (component as unknown as { filteredRowsSubject: BehaviorSubject<NegotiationRow[]> }).filteredRowsSubject.value
        .length,
    ).toBe(0);

    tick(450);
    expect(
      (component as unknown as { filteredRowsSubject: BehaviorSubject<NegotiationRow[]> }).filteredRowsSubject.value
        .length,
    ).toBe(1);
  }));

  it('enriches remaining rows in background batches', async () => {
    const component = createComponent() as ContractViewComponent;
    initRowSubjects(component);
    (component as unknown as { pageItemCount: number }).pageItemCount = 5;
    const enrichmentService = jasmine.createSpyObj<NegotiationCatalogEnrichmentService>(
      'NegotiationCatalogEnrichmentService',
      ['enrichRows'],
    );
    enrichmentService.enrichRows.and.resolveTo(undefined);
    (component as unknown as { enrichmentService: NegotiationCatalogEnrichmentService }).enrichmentService =
      enrichmentService;
    (component as unknown as { rowsSubject: BehaviorSubject<NegotiationRow[]> }).rowsSubject.next([
      row({ negotiationId: 'n1', enrichmentStatus: 'done' }),
      row({ negotiationId: 'n2', enrichmentStatus: 'idle' }),
      row({ negotiationId: 'n3', enrichmentStatus: 'idle' }),
    ]);

    await (component as unknown as { enrichBackgroundRows: () => Promise<void> }).enrichBackgroundRows();

    expect(enrichmentService.enrichRows).toHaveBeenCalledTimes(1);
    const batch = enrichmentService.enrichRows.calls.mostRecent().args[0] as NegotiationRow[];
    expect(batch.length).toBe(2);
    expect(batch.map(r => r.negotiationId)).toEqual(['n2', 'n3']);
  });

  it('re-filters when background enrichment updates display names', () => {
    const component = createComponent() as ContractViewComponent;
    initRowSubjects(component);
    (component as unknown as { lastFilterText: string }).lastFilterText = 'resolved';
    (component as unknown as { rowsSubject: BehaviorSubject<NegotiationRow[]> }).rowsSubject.next([
      row({ negotiationId: 'n1', displayName: 'PENDING_I18N', enrichmentStatus: 'idle' }),
    ]);
    (component as unknown as { filteredRowsSubject: BehaviorSubject<NegotiationRow[]> }).filteredRowsSubject.next([]);

    (component as unknown as { mergeEnrichedRows: (rows: NegotiationRow[]) => void }).mergeEnrichedRows([
      row({ negotiationId: 'n1', displayName: 'Resolved name', enrichmentStatus: 'done' }),
    ]);

    expect(
      (component as unknown as { filteredRowsSubject: BehaviorSubject<NegotiationRow[]> }).filteredRowsSubject.value
        .length,
    ).toBe(1);
  });

  it('openAssetSelfDescription opens corpus detail modal with EDC-resolved sd id', async () => {
    const component = createComponent() as ContractViewComponent;
    const modal = jasmine.createSpyObj<ModalAndAlertService>('ModalAndAlertService', ['openModal', 'showAlert']);
    const corpusSdId = 'did:web:registry:CorpusOffering:from-edc';
    const edcAsset = {
      id: 'asset-uuid-1',
      properties: { 'offer.offerID': corpusSdId, name: 'EDC asset' },
    };
    (component as unknown as { modalAndAlertService: ModalAndAlertService }).modalAndAlertService = modal;
    (
      component as unknown as {
        assetService: {
          getAssetsCacheSnapshotOrLoad: () => Promise<{ data: unknown[] }>;
          getCachedOrFetchAssets: () => Promise<unknown[]>;
        };
      }
    ).assetService = {
      getAssetsCacheSnapshotOrLoad: async () => ({ data: [edcAsset] }),
      getCachedOrFetchAssets: async () => [edcAsset],
    };
    (
      component as unknown as {
        enrichmentService: { getCached: () => undefined; resolveSelfDescriptionId: () => Promise<string> };
      }
    ).enrichmentService = {
      getCached: () => undefined,
      resolveSelfDescriptionId: async () => 'did:web:catalog-wrong',
    };
    (
      component as unknown as {
        stateService: { currentEdcConfig$: BehaviorSubject<{ dashboardMocksEnabled: boolean }> };
      }
    ).stateService = {
      currentEdcConfig$: new BehaviorSubject<{ dashboardMocksEnabled: boolean }>({ dashboardMocksEnabled: false }),
    };
    const stopPropagation = jasmine.createSpy('stopPropagation');
    const event = { stopPropagation } as unknown as Event;
    const negotiationRow = row({
      selfDescriptionId: 'did:web:catalog-wrong',
      assetId: 'asset-uuid-1',
      displayName: 'EDC asset',
      counterPartyId: 'provider-cp',
      createdAt: 1_700_000_000_000,
    });

    await component.openAssetSelfDescription(negotiationRow, event);

    expect(stopPropagation).toHaveBeenCalled();
    expect(modal.openModal).toHaveBeenCalledWith(
      CorpusSelfDescriptionDetailModalComponent,
      jasmine.objectContaining({
        selfDescriptionId: corpusSdId,
        edcAssetId: 'asset-uuid-1',
        edcAsset,
        titleOverride: 'EDC asset',
        providerLabelOverride: 'provider-cp',
      }),
      undefined,
      true,
    );
    expect(modal.showAlert).not.toHaveBeenCalled();
  });

  it('openAssetSelfDescription fetches assets when cache snapshot is empty', async () => {
    const component = createComponent() as ContractViewComponent;
    const modal = jasmine.createSpyObj<ModalAndAlertService>('ModalAndAlertService', ['openModal', 'showAlert']);
    const corpusSdId = 'did:web:registry:CorpusOffering:from-fetch';
    const edcAsset = {
      id: 'asset-fetch-1',
      properties: { 'offer.offerID': corpusSdId, name: 'Fetched asset' },
    };
    const getCachedOrFetchAssets = jasmine.createSpy('getCachedOrFetchAssets').and.resolveTo([edcAsset]);
    (component as unknown as { modalAndAlertService: ModalAndAlertService }).modalAndAlertService = modal;
    (
      component as unknown as {
        assetService: {
          getAssetsCacheSnapshotOrLoad: () => Promise<undefined>;
          getCachedOrFetchAssets: () => Promise<unknown[]>;
        };
      }
    ).assetService = {
      getAssetsCacheSnapshotOrLoad: async () => undefined,
      getCachedOrFetchAssets,
    };
    (
      component as unknown as {
        enrichmentService: { getCached: () => undefined; resolveSelfDescriptionId: () => Promise<string> };
      }
    ).enrichmentService = {
      getCached: () => undefined,
      resolveSelfDescriptionId: async () => 'did:web:catalog-wrong',
    };
    (
      component as unknown as {
        stateService: { currentEdcConfig$: BehaviorSubject<{ dashboardMocksEnabled: boolean }> };
      }
    ).stateService = {
      currentEdcConfig$: new BehaviorSubject<{ dashboardMocksEnabled: boolean }>({ dashboardMocksEnabled: false }),
    };

    await component.openAssetSelfDescription(
      row({ assetId: 'asset-fetch-1', displayName: 'Fetched asset', counterPartyId: 'cp' }),
      { stopPropagation: jasmine.createSpy() } as unknown as Event,
    );

    expect(getCachedOrFetchAssets).toHaveBeenCalled();
    expect(modal.openModal).toHaveBeenCalledWith(
      CorpusSelfDescriptionDetailModalComponent,
      jasmine.objectContaining({ selfDescriptionId: corpusSdId, edcAsset }),
      undefined,
      true,
    );
  });

  it('openAssetSelfDescription shows alert when selfDescriptionId is missing', async () => {
    const component = createComponent() as ContractViewComponent;
    const modal = jasmine.createSpyObj<ModalAndAlertService>('ModalAndAlertService', ['openModal', 'showAlert']);
    (component as unknown as { modalAndAlertService: ModalAndAlertService }).modalAndAlertService = modal;
    (
      component as unknown as { assetService: { getAssetsCacheSnapshotOrLoad: () => Promise<undefined> } }
    ).assetService = { getAssetsCacheSnapshotOrLoad: async () => undefined };
    (
      component as unknown as {
        stateService: { currentEdcConfig$: BehaviorSubject<{ dashboardMocksEnabled: boolean }> };
      }
    ).stateService = {
      currentEdcConfig$: new BehaviorSubject<{ dashboardMocksEnabled: boolean }>({ dashboardMocksEnabled: false }),
    };
    (
      component as unknown as {
        enrichmentService: { getCached: () => undefined; resolveSelfDescriptionId: () => Promise<undefined> };
      }
    ).enrichmentService = {
      getCached: () => undefined,
      resolveSelfDescriptionId: async () => undefined,
    };
    const event = { stopPropagation: jasmine.createSpy() } as unknown as Event;

    await component.openAssetSelfDescription(row({ selfDescriptionId: undefined }), event);

    expect(modal.showAlert).toHaveBeenCalled();
    expect(modal.openModal).not.toHaveBeenCalled();
  });
});

function initRowSubjects(component: ContractViewComponent): void {
  (component as unknown as { pageEnrich$: Subject<NegotiationRow[]> }).pageEnrich$ = new Subject();
  (component as unknown as { rowsSubject: BehaviorSubject<NegotiationRow[]> }).rowsSubject = new BehaviorSubject<
    NegotiationRow[]
  >([]);
  (component as unknown as { filteredRowsSubject: BehaviorSubject<NegotiationRow[]> }).filteredRowsSubject =
    new BehaviorSubject<NegotiationRow[]>([]);
  (component as unknown as { pageRowsSubject: BehaviorSubject<NegotiationRow[]> }).pageRowsSubject =
    new BehaviorSubject<NegotiationRow[]>([]);
  component.rows$ = (
    component as unknown as { rowsSubject: BehaviorSubject<NegotiationRow[]> }
  ).rowsSubject.asObservable();
  component.filteredRows$ = (
    component as unknown as { filteredRowsSubject: BehaviorSubject<NegotiationRow[]> }
  ).filteredRowsSubject.asObservable();
  component.pageRows$ = (
    component as unknown as { pageRowsSubject: BehaviorSubject<NegotiationRow[]> }
  ).pageRowsSubject.asObservable();
}

describe('ContractViewComponent data loading', () => {
  function createComponentWithMocks(
    mocks: {
      getAllContractNegotiations: jasmine.Spy;
      getAgreementForNegotiation: jasmine.Spy;
      enrichRows?: jasmine.Spy;
    },
    perspective: 'CONSUMER' | 'PROVIDER' = 'PROVIDER',
  ): ContractViewComponent {
    const component = Object.create(ContractViewComponent.prototype) as ContractViewComponent;
    (component as any).negotiationsService = {
      getAllContractNegotiations: mocks.getAllContractNegotiations,
      getAgreementForNegotiation: mocks.getAgreementForNegotiation,
    };
    (component as any).enrichmentService = {
      enrichRows: mocks.enrichRows ?? jasmine.createSpy('enrichRows').and.resolveTo(undefined),
      clearCache: jasmine.createSpy('clearCache'),
      seedCache: jasmine.createSpy('seedCache'),
    };
    const currentEdcConfig$ = new BehaviorSubject({ dashboardMocksEnabled: false });
    (component as any).stateService = {
      currentEdcConfig$: currentEdcConfig$.asObservable(),
    };
    (component as any).translate = {
      instant: (key: string) => (key === 'negotiation.assetPending' ? 'PENDING' : key),
    };
    (component as unknown as { destroy$: Subject<void> }).destroy$ = new Subject<void>();
    (component as any).connectorPerspective = {
      getPerspective: () => perspective,
      getPerspectives: () => [perspective],
    };
    component.contractType = perspective;
    component.contractTypes = [perspective];
    (component as unknown as { pageItemCount: number }).pageItemCount = 5;
    component.initialized = false;
    initRowSubjects(component);
    (component as any).setupPageEnrichment();
    return component;
  }

  function negotiation(id: string, type: 'PROVIDER' | 'CONSUMER'): ContractNegotiation {
    return {
      '@context': {
        '@vocab': 'https://w3id.org/edc/v0.0.1/ns/',
        edc: 'https://w3id.org/edc/v0.0.1/ns/',
      },
      '@id': id,
      '@type': 'ContractNegotiation',
      id,
      type,
      state: 'FINALIZED',
      contractAgreementId: `${id}-agreement`,
      createdAt: Date.now(),
      counterPartyId: 'counter-party',
    } as unknown as ContractNegotiation;
  }

  it('loads provider negotiations without fetching agreements on init', async () => {
    const getAllContractNegotiations = jasmine
      .createSpy()
      .and.resolveTo([negotiation('n1', 'PROVIDER'), negotiation('n2', 'CONSUMER')]);
    const getAgreementForNegotiation = jasmine.createSpy();
    const component = createComponentWithMocks({ getAllContractNegotiations, getAgreementForNegotiation });

    await (component as any).fetchNegotiations();
    const pageRows = await firstValueFrom(component.pageRows$);

    expect(component.initialized).toBeTrue();
    expect(pageRows.length).toBe(1);
    expect(pageRows[0].negotiationId).toBe('n1');
    expect(getAgreementForNegotiation).not.toHaveBeenCalled();
  });

  it('returns empty list when only opposite type exists', async () => {
    const getAllContractNegotiations = jasmine.createSpy().and.resolveTo([negotiation('n1', 'CONSUMER')]);
    const getAgreementForNegotiation = jasmine.createSpy();
    const component = createComponentWithMocks({ getAllContractNegotiations, getAgreementForNegotiation });

    await (component as any).fetchNegotiations();
    const pageRows = await firstValueFrom(component.pageRows$);

    expect(component.initialized).toBeTrue();
    expect(pageRows).toEqual([]);
    expect(getAgreementForNegotiation).not.toHaveBeenCalled();
  });

  it('stays stable on negotiations request failure', async () => {
    const getAllContractNegotiations = jasmine.createSpy().and.rejectWith(new Error('query failed'));
    const getAgreementForNegotiation = jasmine.createSpy();
    const component = createComponentWithMocks({ getAllContractNegotiations, getAgreementForNegotiation });

    await (component as any).fetchNegotiations();
    const pageRows = await firstValueFrom(component.pageRows$);

    expect(component.initialized).toBeTrue();
    expect(pageRows).toEqual([]);
  });

  it('loads consumer negotiations when connector perspective is CONSUMER', async () => {
    const getAllContractNegotiations = jasmine
      .createSpy()
      .and.resolveTo([negotiation('c1', 'CONSUMER'), negotiation('p1', 'PROVIDER')]);
    const getAgreementForNegotiation = jasmine.createSpy();
    const component = createComponentWithMocks({ getAllContractNegotiations, getAgreementForNegotiation }, 'CONSUMER');

    await (component as any).fetchNegotiations();
    const pageRows = await firstValueFrom(component.pageRows$);

    expect(component.contractType).toBe('CONSUMER');
    expect(pageRows.length).toBe(1);
    expect(pageRows[0].type).toBe('CONSUMER');
  });

  it('enriches at most five rows per page via enrichment service', fakeAsync(async () => {
    const negotiations = Array.from({ length: 7 }, (_, i) => negotiation(`n${i}`, 'PROVIDER'));
    const getAllContractNegotiations = jasmine.createSpy().and.resolveTo(negotiations);
    const getAgreementForNegotiation = jasmine.createSpy();
    const enrichRows = jasmine.createSpy('enrichRows').and.resolveTo(undefined);
    const component = createComponentWithMocks({
      getAllContractNegotiations,
      getAgreementForNegotiation,
      enrichRows,
    });

    await (component as any).fetchNegotiations();
    tick(350);

    expect(enrichRows).toHaveBeenCalled();
    const batch = enrichRows.calls.mostRecent().args[0] as NegotiationRow[];
    expect(batch.length).toBeLessThanOrEqual(5);
    expect(getAgreementForNegotiation).not.toHaveBeenCalled();
  }));

  it('mergeEnrichedRows keeps filtered and page array references for pagination stability', () => {
    const getAllContractNegotiations = jasmine.createSpy();
    const component = createComponentWithMocks({
      getAllContractNegotiations,
      getAgreementForNegotiation: jasmine.createSpy(),
    });

    const allRows: NegotiationRow[] = Array.from(
      { length: 7 },
      (_, i) =>
        ({
          negotiationId: `n${i}`,
          counterPartyId: 'cp',
          state: 'FINALIZED',
          createdAt: i,
          displayName: 'PENDING',
          enrichmentStatus: 'loading',
          negotiation: { id: `n${i}` } as ContractNegotiation,
        }) as NegotiationRow,
    );
    const pageRows = allRows.slice(5, 7);

    (component as unknown as { rowsSubject: BehaviorSubject<NegotiationRow[]> }).rowsSubject.next(allRows);
    (component as unknown as { filteredRowsSubject: BehaviorSubject<NegotiationRow[]> }).filteredRowsSubject.next(
      allRows,
    );
    (component as unknown as { pageRowsSubject: BehaviorSubject<NegotiationRow[]> }).pageRowsSubject.next(pageRows);

    const filteredBefore = (component as unknown as { filteredRowsSubject: BehaviorSubject<NegotiationRow[]> })
      .filteredRowsSubject.value;
    const pageBefore = (component as unknown as { pageRowsSubject: BehaviorSubject<NegotiationRow[]> }).pageRowsSubject
      .value;
    const pageIdsBefore = pageBefore.map(r => r.negotiationId);

    const enrichedSnapshots = pageRows.map(r => ({
      ...r,
      displayName: `Resolved ${r.negotiationId}`,
      enrichmentStatus: 'done' as const,
    }));

    (component as unknown as { mergeEnrichedRows: (rows: NegotiationRow[]) => void }).mergeEnrichedRows(
      enrichedSnapshots,
    );

    const filteredAfter = (component as unknown as { filteredRowsSubject: BehaviorSubject<NegotiationRow[]> })
      .filteredRowsSubject.value;
    const pageAfter = (component as unknown as { pageRowsSubject: BehaviorSubject<NegotiationRow[]> }).pageRowsSubject
      .value;

    expect(filteredAfter).toBe(filteredBefore);
    expect(pageAfter).toBe(pageBefore);
    expect(pageAfter.map(r => r.negotiationId)).toEqual(pageIdsBefore);
    expect(pageAfter[0].displayName).toBe('Resolved n5');
    expect(pageAfter[1].displayName).toBe('Resolved n6');
    expect(pageAfter[0].enrichmentStatus).toBe('done');
  });
});

describe('ContractViewComponent template (table rendering)', () => {
  let fixture: ComponentFixture<ContractViewComponent>;
  let modalAndAlertService: jasmine.SpyObj<ModalAndAlertService>;

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  beforeEach(async () => {
    const baseContext = {
      '@vocab': 'https://w3id.org/edc/v0.0.1/ns/',
      edc: 'https://w3id.org/edc/v0.0.1/ns/',
    };
    const finalizedConsumer = {
      '@context': baseContext,
      '@id': 'n-fin-consumer',
      '@type': 'ContractNegotiation',
      id: 'n-fin-consumer',
      type: 'CONSUMER',
      state: 'FINALIZED',
      createdAt: 1_700_000_000_000,
      counterPartyId: 'provider03',
      counterPartyAddress: 'http://provider.example/protocol',
      contractAgreementId: 'agr-1',
    } as unknown as ContractNegotiation;
    const finalizedProvider = {
      '@context': baseContext,
      '@id': 'n-fin-provider',
      '@type': 'ContractNegotiation',
      id: 'n-fin-provider',
      type: 'PROVIDER',
      state: 'FINALIZED',
      createdAt: 1_700_000_000_002,
      counterPartyId: 'consumer03',
      contractAgreementId: 'agr-2',
    } as unknown as ContractNegotiation;
    const terminated = {
      '@context': baseContext,
      '@id': 'n-term',
      '@type': 'ContractNegotiation',
      id: 'n-term',
      type: 'CONSUMER',
      state: 'TERMINATED',
      createdAt: 1_700_000_000_001,
      counterPartyId: 'provider03',
    } as unknown as ContractNegotiation;

    const negotiationsService = {
      getAllContractNegotiations: jasmine.createSpy().and.resolveTo([finalizedConsumer, finalizedProvider, terminated]),
      getAgreementForNegotiation: jasmine.createSpy(),
    };
    const enrichmentService = {
      enrichRows: jasmine.createSpy('enrichRows').and.callFake(async (rows: NegotiationRow[]) => {
        for (const r of rows) {
          r.displayName = 'Catálogo activo demo';
          r.enrichmentStatus = 'done';
          r.selfDescriptionId = 'did:web:template:sd';
          r.agreement = {
            id: 'a-template',
            assetId: 'template-asset-uuid',
          } as ContractAgreement;
        }
      }),
      clearCache: jasmine.createSpy('clearCache'),
      seedCache: jasmine.createSpy('seedCache'),
    };
    modalAndAlertService = jasmine.createSpyObj<ModalAndAlertService>('ModalAndAlertService', [
      'openModal',
      'closeModal',
      'showAlert',
    ]);
    const contractConsumption = jasmine.createSpyObj<ContractConsumptionService>('ContractConsumptionService', [
      'fetchContractNegotiationStatus',
    ]);
    const assetService = {
      getAssetsCacheSnapshotOrLoad: jasmine.createSpy().and.resolveTo({ data: [] }),
      getCachedOrFetchAssets: jasmine.createSpy().and.resolveTo([]),
    };
    const currentEdcConfig$ = new BehaviorSubject({ dashboardMocksEnabled: false });

    await TestBed.configureTestingModule({
      imports: [ContractViewComponent, TranslateModule.forRoot()],
      providers: [
        { provide: NegotiationsService, useValue: negotiationsService },
        { provide: NegotiationCatalogEnrichmentService, useValue: enrichmentService },
        { provide: ModalAndAlertService, useValue: modalAndAlertService },
        { provide: ContractConsumptionService, useValue: contractConsumption },
        { provide: AssetService, useValue: assetService },
        { provide: DashboardStateService, useValue: { currentEdcConfig$ } },
        { provide: DASHBOARD_CONNECTOR_PERSPECTIVE, useValue: { getPerspective: () => 'CONSUMER' as const } },
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('es', {
      negotiation: {
        transfer: 'Transferir',
        transferPending: 'Pendiente transferencia',
        assetPending: 'Activo pendiente',
        state: {
          FINALIZED: 'Negocio finalizado',
          TERMINATED: 'Negocio terminado',
        },
      },
    });
    translate.setDefaultLang('es');
    translate.use('es');

    fixture = TestBed.createComponent(ContractViewComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders resolved catalog name, translated states, and connector without policy column', fakeAsync(() => {
    tick(350);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Catálogo activo demo');
    expect(text).not.toContain('template-policy-uuid');
    expect(text).toContain('provider03');
    expect(text).toContain('Negocio finalizado');
    expect(text).toContain('Negocio terminado');
    const headers = Array.from(fixture.nativeElement.querySelectorAll('thead th') as NodeListOf<HTMLElement>).map(
      el => el.textContent?.trim() ?? '',
    );
    expect(headers.some(h => h.toLowerCase().includes('política') || h.toLowerCase().includes('policy'))).toBeFalse();
  }));

  it('renders Transfer control only for finalized consumer rows', fakeAsync(() => {
    tick(350);
    fixture.detectChanges();
    const transferControls = fixture.nativeElement.querySelectorAll('[aria-label="Transfer"]');
    expect(transferControls.length).toBe(1);
  }));

  it('opens transfer modal when Transfer is clicked', fakeAsync(() => {
    tick(350);
    fixture.detectChanges();
    const transferButton = fixture.nativeElement.querySelector('[aria-label="Transfer"]') as HTMLButtonElement | null;
    expect(transferButton).not.toBeNull();
    transferButton!.click();
    tick();
    expect(modalAndAlertService.openModal).toHaveBeenCalledWith(
      ContractTransferModalComponent,
      jasmine.objectContaining({
        selfDescriptionId: 'did:web:template:sd',
        negotiationId: 'n-fin-consumer',
        contractAgreementId: 'agr-1',
        counterPartyAddress: 'http://provider.example/protocol',
        assetLabel: 'Catálogo activo demo',
      }),
      jasmine.objectContaining({ closed: jasmine.any(Function) }),
      true,
    );
  }));

  it('does not render consumer/provider switch', () => {
    expect(fixture.nativeElement.querySelector('lib-consumer-provider-switch')).toBeNull();
  });

  it('uses fixed page size of five', () => {
    expect(fixture.componentInstance.pageItemCount).toBe(5);
  });

  it('opens corpus detail modal when asset name is clicked', fakeAsync(() => {
    tick(350);
    fixture.detectChanges();
    const nameButton = fixture.nativeElement.querySelector(
      'tbody tr td:nth-child(3) button',
    ) as HTMLButtonElement | null;
    expect(nameButton).withContext('asset name button').not.toBeNull();
    nameButton!.click();
    fixture.detectChanges();
    tick();
    expect(modalAndAlertService.openModal).toHaveBeenCalledWith(
      CorpusSelfDescriptionDetailModalComponent,
      jasmine.objectContaining({ selfDescriptionId: 'did:web:template:sd' }),
      undefined,
      true,
    );
  }));

  it('shows skeleton instead of asset name while enrichment is pending', fakeAsync(() => {
    const negotiationsService = TestBed.inject(NegotiationsService) as jasmine.SpyObj<NegotiationsService>;
    negotiationsService.getAllContractNegotiations = jasmine.createSpy().and.resolveTo([
      {
        '@context': { '@vocab': 'https://w3id.org/edc/v0.0.1/ns/', edc: 'https://w3id.org/edc/v0.0.1/ns/' },
        '@id': 'n-pending',
        id: 'n-pending',
        type: 'CONSUMER',
        state: 'FINALIZED',
        createdAt: 1_700_000_000_000,
        counterPartyId: 'provider03',
      } as unknown as ContractNegotiation,
    ]);
    const enrichmentService = TestBed.inject(
      NegotiationCatalogEnrichmentService,
    ) as jasmine.SpyObj<NegotiationCatalogEnrichmentService>;
    enrichmentService.enrichRows = jasmine.createSpy('enrichRows').and.callFake(async () => {
      /* keep rows pending */
    });

    fixture = TestBed.createComponent(ContractViewComponent);
    fixture.detectChanges();
    tick(350);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.skeleton')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('tbody tr td:nth-child(3) button')).toBeNull();
    const assetCell = fixture.nativeElement.querySelector('tbody tr td:nth-child(3)') as HTMLElement;
    expect(assetCell.querySelector('.skeleton')).not.toBeNull();
    expect(assetCell.querySelector('.sr-only')?.textContent).toContain('Activo pendiente');
  }));
});

describe('ContractViewComponent template (provider perspective)', () => {
  let fixture: ComponentFixture<ContractViewComponent>;

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  beforeEach(async () => {
    const negotiationsService = {
      getAllContractNegotiations: jasmine.createSpy().and.resolveTo([]),
      getAgreementForNegotiation: jasmine.createSpy(),
    };
    const enrichmentService = {
      enrichRows: jasmine.createSpy('enrichRows').and.resolveTo(undefined),
      clearCache: jasmine.createSpy('clearCache'),
      seedCache: jasmine.createSpy('seedCache'),
    };
    const currentEdcConfig$ = new BehaviorSubject({ dashboardMocksEnabled: false });

    await TestBed.configureTestingModule({
      imports: [ContractViewComponent, TranslateModule.forRoot()],
      providers: [
        { provide: NegotiationsService, useValue: negotiationsService },
        { provide: NegotiationCatalogEnrichmentService, useValue: enrichmentService },
        {
          provide: ModalAndAlertService,
          useValue: jasmine.createSpyObj('ModalAndAlertService', ['openModal', 'closeModal', 'showAlert']),
        },
        {
          provide: ContractConsumptionService,
          useValue: jasmine.createSpyObj('ContractConsumptionService', ['fetchContractNegotiationStatus']),
        },
        {
          provide: AssetService,
          useValue: {
            getAssetsCacheSnapshotOrLoad: jasmine.createSpy().and.resolveTo({ data: [] }),
            getCachedOrFetchAssets: jasmine.createSpy().and.resolveTo([]),
          },
        },
        { provide: DashboardStateService, useValue: { currentEdcConfig$ } },
        { provide: DASHBOARD_CONNECTOR_PERSPECTIVE, useValue: { getPerspective: () => 'PROVIDER' as const } },
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('es', {
      negotiation: {
        transfer: 'Transferencia',
      },
    });
    translate.setDefaultLang('es');
    translate.use('es');

    fixture = TestBed.createComponent(ContractViewComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('hides Transferencia column for provider perspective', () => {
    const headers = Array.from(fixture.nativeElement.querySelectorAll('thead th') as NodeListOf<HTMLElement>).map(
      el => el.textContent?.trim() ?? '',
    );
    expect(headers).not.toContain('Transferencia');
    expect(fixture.componentInstance.tableColspan).toBe(4);
  });
});
