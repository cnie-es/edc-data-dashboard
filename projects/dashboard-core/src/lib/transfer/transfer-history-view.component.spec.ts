// Karma for this library only runs specs under projects/dashboard-core/src/.
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import type { ContractAgreement, ContractNegotiation, TransferProcess } from '@think-it-labs/edc-connector-client';
import {
  DASHBOARD_CONNECTOR_PERSPECTIVE,
  DashboardStateService,
  ModalAndAlertService,
} from '@eclipse-edc/dashboard-core';
import { SimplAdvancedSearchService } from '@eclipse-edc/dashboard-core/xfsc-advSearch';
import { TranslateModule } from '@ngx-translate/core';
import { TransferHistoryViewComponent } from '../../../transfer/src/transfer-history-view/transfer-history-view.component';
import { ContractAndTransferService } from '../../../transfer/src/contract-and-transfer.service';

describe('TransferHistoryViewComponent enrichment', () => {
  let component: TransferHistoryViewComponent;
  let xfscSearch: jasmine.SpyObj<SimplAdvancedSearchService>;
  let transferService: jasmine.SpyObj<ContractAndTransferService>;
  const config$ = new BehaviorSubject({ dashboardMocksEnabled: false });

  function minimalProcess(
    partial: Partial<TransferProcess> & { assetId?: string; contractId?: string },
  ): TransferProcess {
    return {
      id: 'tp-1',
      createdAt: 0,
      state: 'COMPLETED',
      type: 'CONSUMER',
      ...partial,
    } as unknown as TransferProcess;
  }

  beforeEach(async () => {
    xfscSearch = jasmine.createSpyObj('SimplAdvancedSearchService', ['simpleSearchSD']);
    transferService = jasmine.createSpyObj('ContractAndTransferService', [
      'getNegotiationByAgreement',
      'getContractAgreement',
    ]);
    // Default: no agreement assigner, so enrichment falls back to the negotiation counterPartyId.
    transferService.getContractAgreement.and.resolveTo(undefined as unknown as ContractAgreement);

    await TestBed.configureTestingModule({
      imports: [TransferHistoryViewComponent, TranslateModule.forRoot()],
      providers: [
        { provide: SimplAdvancedSearchService, useValue: xfscSearch },
        { provide: ContractAndTransferService, useValue: transferService },
        {
          provide: DashboardStateService,
          useValue: { currentEdcConfig$: config$ },
        },
        {
          provide: DASHBOARD_CONNECTOR_PERSPECTIVE,
          useValue: { getPerspective: () => 'CONSUMER' as const },
        },
        {
          provide: ModalAndAlertService,
          useValue: jasmine.createSpyObj('ModalAndAlertService', ['showAlert', 'openModal']),
        },
      ],
    }).compileComponents();

    component = TestBed.createComponent(TransferHistoryViewComponent).componentInstance;
  });

  it('resolves asset label from xfsc simpleSearchSD n.name', async () => {
    const assetId = '0c366e82-6c6b-4a9a-bab5-cb9c3609122d';
    xfscSearch.simpleSearchSD.and.returnValue(
      of({
        totalCount: 1,
        items: [
          {
            n: {
              claimsGraphUri: ['did:web:registry.gaia-x.eu:DataOffering:80a2cf34-dd07-4647-98a4-58eecb56d2b4'],
              offeringType: 'data',
              name: 'api',
              description: 'api',
              inLanguage: 'pl',
              serviceAccessPoint: 'http://api.com',
            },
          },
        ],
      }),
    );

    await (
      component as unknown as { enrichPageAssetLabels: (p: TransferProcess[]) => Promise<void> }
    ).enrichPageAssetLabels([minimalProcess({ assetId })]);

    expect(xfscSearch.simpleSearchSD).toHaveBeenCalledWith(assetId, { page: 1, pageSize: 1 });
    expect(component.assetDisplayByAssetId.get(assetId.toLowerCase())).toBe('api');
  });

  it('skips xfsc when asset id is already cached', async () => {
    const assetId = 'cached-asset-id';
    component.assetDisplayByAssetId.set(assetId.toLowerCase(), 'Cached name');

    await (
      component as unknown as { enrichPageAssetLabels: (p: TransferProcess[]) => Promise<void> }
    ).enrichPageAssetLabels([minimalProcess({ assetId })]);

    expect(xfscSearch.simpleSearchSD).not.toHaveBeenCalled();
  });

  it('does not set asset label when xfsc returns no items', async () => {
    const assetId = 'missing-asset-id';
    xfscSearch.simpleSearchSD.and.returnValue(of({ totalCount: 0, items: [] }));

    await (
      component as unknown as { enrichPageAssetLabels: (p: TransferProcess[]) => Promise<void> }
    ).enrichPageAssetLabels([minimalProcess({ assetId })]);

    expect(xfscSearch.simpleSearchSD).toHaveBeenCalledWith(assetId, { page: 1, pageSize: 1 });
    expect(component.assetDisplayByAssetId.has(assetId.toLowerCase())).toBeFalse();
  });

  it('resolves connector label from negotiation counterPartyId', async () => {
    const contractId = '8383d84c-4e02-44d0-a23f-ac55737fd241';
    transferService.getNegotiationByAgreement.and.resolveTo({
      '@type': 'ContractNegotiation',
      '@id': '6a7a75cc-726a-441f-bdf0-e689f655e682',
      type: 'PROVIDER',
      counterPartyId: 'devrioja',
      contractAgreementId: contractId,
    } as unknown as ContractNegotiation);

    await (
      component as unknown as { enrichPageConnectorLabels: (p: TransferProcess[]) => Promise<void> }
    ).enrichPageConnectorLabels([minimalProcess({ contractId })]);

    expect(transferService.getNegotiationByAgreement).toHaveBeenCalledWith(contractId);
    expect(component.connectorLabelByContractId.get(contractId.toLowerCase())).toBe('devrioja');
  });

  it('prefers the agreement assigner over the negotiation counterPartyId', async () => {
    const contractId = 'agreement-with-assigner';
    transferService.getContractAgreement.and.resolveTo({
      id: contractId,
      policy: { 'odrl:assigner': { '@id': 'devprovider' } },
    } as unknown as ContractAgreement);

    await (
      component as unknown as { enrichPageConnectorLabels: (p: TransferProcess[]) => Promise<void> }
    ).enrichPageConnectorLabels([minimalProcess({ contractId })]);

    expect(transferService.getContractAgreement).toHaveBeenCalledWith(contractId);
    expect(transferService.getNegotiationByAgreement).not.toHaveBeenCalled();
    expect(component.connectorLabelByContractId.get(contractId.toLowerCase())).toBe('devprovider');
  });

  it('resolves connector label when counterPartyId is only on expanded JSON-LD keys', async () => {
    const contractId = 'agreement-ld';
    const edc = 'https://w3id.org/edc/v0.0.1/ns/';
    transferService.getNegotiationByAgreement.and.resolveTo({
      [`${edc}counterPartyId`]: 'devrioja-expanded',
    } as unknown as ContractNegotiation);

    await (
      component as unknown as { enrichPageConnectorLabels: (p: TransferProcess[]) => Promise<void> }
    ).enrichPageConnectorLabels([minimalProcess({ contractId })]);

    expect(component.connectorLabelByContractId.get(contractId.toLowerCase())).toBe('devrioja-expanded');
  });

  it('skips negotiation fetch when connector label is already cached', async () => {
    const contractId = 'cached-agreement';
    component.connectorLabelByContractId.set(contractId.toLowerCase(), 'cached-connector');

    await (
      component as unknown as { enrichPageConnectorLabels: (p: TransferProcess[]) => Promise<void> }
    ).enrichPageConnectorLabels([minimalProcess({ contractId })]);

    expect(transferService.getNegotiationByAgreement).not.toHaveBeenCalled();
  });

  it('toggles pageAssetEnrichmentInProgress during page enrichment', async () => {
    xfscSearch.simpleSearchSD.and.returnValue(of({ totalCount: 0, items: [] }));
    transferService.getNegotiationByAgreement.and.resolveTo({} as ContractNegotiation);

    const enrichPromise = (
      component as unknown as {
        enrichProcesses: (p: TransferProcess[], o: { trackPageLoading: boolean }) => Promise<void>;
      }
    ).enrichProcesses([minimalProcess({ assetId: 'pending-asset', contractId: 'pending-contract' })], {
      trackPageLoading: true,
    });

    await Promise.resolve();
    expect(component.pageAssetEnrichmentInProgress).toBeTrue();
    await enrichPromise;
    expect(component.pageAssetEnrichmentInProgress).toBeFalse();
  });

  it('applyFilter updates pageTransferProcessesSubject', () => {
    const processes = [
      minimalProcess({ id: 'tp-1', assetId: 'asset-alpha' }),
      minimalProcess({ id: 'tp-2', assetId: 'asset-beta' }),
    ] as TransferProcess[];
    (
      component as unknown as { transferProcessesSubject: BehaviorSubject<TransferProcess[]> }
    ).transferProcessesSubject.next(processes);

    (component as unknown as { applyFilter: (text: string, enqueue?: boolean) => void }).applyFilter('tp-2', false);

    expect(
      (component as unknown as { pageTransferProcessesSubject: BehaviorSubject<TransferProcess[]> })
        .pageTransferProcessesSubject.value.length,
    ).toBe(1);
    expect(
      (component as unknown as { pageTransferProcessesSubject: BehaviorSubject<TransferProcess[]> })
        .pageTransferProcessesSubject.value[0].id,
    ).toBe('tp-2');
  });

  it('debounces search input before applying filter', async () => {
    const processes = [minimalProcess({ id: 'tp-search-me' })] as TransferProcess[];
    (
      component as unknown as { transferProcessesSubject: BehaviorSubject<TransferProcess[]> }
    ).transferProcessesSubject.next(processes);
    (component as unknown as { setupSearchDebounce: () => void }).setupSearchDebounce();

    component.onSearchInput('tp-search-me');
    expect(
      (component as unknown as { pageTransferProcessesSubject: BehaviorSubject<TransferProcess[]> })
        .pageTransferProcessesSubject.value.length,
    ).toBe(0);

    await new Promise(resolve => setTimeout(resolve, 460));
    expect(
      (component as unknown as { pageTransferProcessesSubject: BehaviorSubject<TransferProcess[]> })
        .pageTransferProcessesSubject.value.length,
    ).toBe(1);
  });
});

describe('TransferHistoryViewComponent perspectives', () => {
  const config$ = new BehaviorSubject({ dashboardMocksEnabled: false });

  async function createComponent(perspectives: ('CONSUMER' | 'PROVIDER')[]) {
    const transferService = jasmine.createSpyObj('ContractAndTransferService', [
      'getAllTransferProcesses',
      'getNegotiationByAgreement',
      'getContractAgreement',
    ]);
    transferService.getAllTransferProcesses.and.resolveTo([]);

    await TestBed.configureTestingModule({
      imports: [TransferHistoryViewComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: SimplAdvancedSearchService,
          useValue: jasmine.createSpyObj('SimplAdvancedSearchService', ['simpleSearchSD']),
        },
        { provide: ContractAndTransferService, useValue: transferService },
        { provide: DashboardStateService, useValue: { currentEdcConfig$: config$ } },
        {
          provide: DASHBOARD_CONNECTOR_PERSPECTIVE,
          useValue: {
            getPerspective: () => perspectives[0],
            getPerspectives: () => perspectives,
          },
        },
        {
          provide: ModalAndAlertService,
          useValue: jasmine.createSpyObj('ModalAndAlertService', ['showAlert', 'openModal']),
        },
      ],
    }).compileComponents();

    const component = TestBed.createComponent(TransferHistoryViewComponent).componentInstance;
    await component.ngOnInit();
    return { component, transferService };
  }

  it('filters by type when the user holds a single role', async () => {
    const { transferService } = await createComponent(['PROVIDER']);

    const querySpec = transferService.getAllTransferProcesses.calls.mostRecent().args[0];
    expect(querySpec.filterExpression).toEqual([
      { operandLeft: 'type', operator: '=', operandRight: 'PROVIDER' },
    ]);
  });

  it('does not filter by type when the user is both provider and consumer', async () => {
    const { component, transferService } = await createComponent(['PROVIDER', 'CONSUMER']);

    const querySpec = transferService.getAllTransferProcesses.calls.mostRecent().args[0];
    expect(querySpec.filterExpression).toBeUndefined();
    expect(component.contractTypes).toEqual(['PROVIDER', 'CONSUMER']);
    expect(component.isProviderOnlyView).toBeFalse();
  });
});
