import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ParticipantNameService } from '@eclipse-edc/dashboard-core';
import { Asset, TransferProcess } from '@think-it-labs/edc-connector-client';
import {
  BehaviorSubject,
  debounceTime,
  distinctUntilChanged,
  firstValueFrom,
  map,
  Observable,
  skip,
  Subject,
  switchMap,
  take,
  takeUntil,
} from 'rxjs';
import { TransferHistoryTableComponent } from '../transfer-history-table/transfer-history-table.component';
import { AsyncPipe } from '@angular/common';
import {
  BreadcrumbsComponent,
  type BreadcrumbItem,
  type ConnectorPerspective,
  DASHBOARD_CONNECTOR_PERSPECTIVE,
  resolveConnectorPerspectives,
  DashboardStateService,
  FilterInputComponent,
  DashboardErrorService,
  findEdcAssetByConnectorId,
  ModalAndAlertService,
  PaginationComponent,
  useFixtureMocks,
} from '@eclipse-edc/dashboard-core';
import {
  AssetService,
  buildAssetDisplayNameLookup,
  resolveAssetCatalogDisplayName,
} from '@eclipse-edc/dashboard-core/assets';
import {
  normalizeSelfDescriptionSearchItem,
  SimplAdvancedSearchService,
} from '@eclipse-edc/dashboard-core/xfsc-advSearch';
import { ContractAndTransferService } from '../contract-and-transfer.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  getFixtureTransferProcesses,
  TRANSFER_FIXTURE_CATALOG_ASSETS,
  TRANSFER_FIXTURE_CONNECTOR_BY_CONTRACT_ID,
} from '../transfer.fixture-mocks';
import {
  readAgreementProviderId,
  readNegotiationCounterPartyId,
  readTransferAssetId,
  readTransferContractId,
} from '../transfer-process-fields.util';
function pageProcessSignature(processes: TransferProcess[]): string {
  return processes.map(p => p.id ?? '').join('|');
}

/** `stateTimestamp` of a fixture row, so merged provider + consumer mocks keep the API ordering. */
function fixtureTimestamp(process: TransferProcess): number {
  const raw = process as unknown as { stateTimestamp?: number; createdAt?: number };
  return raw.stateTimestamp ?? raw.createdAt ?? 0;
}

@Component({
  selector: 'lib-transfer-history',
  templateUrl: './transfer-history-view.component.html',
  imports: [
    BreadcrumbsComponent,
    TransferHistoryTableComponent,
    AsyncPipe,
    PaginationComponent,
    FilterInputComponent,
    TranslateModule,
  ],
})
export class TransferHistoryViewComponent implements OnInit, OnDestroy {
  private readonly transferProcessService = inject(ContractAndTransferService);
  private readonly modalAndAlertService = inject(ModalAndAlertService);
  private readonly dashboardError = inject(DashboardErrorService);
  private readonly stateService = inject(DashboardStateService);
  private readonly connectorPerspective = inject(DASHBOARD_CONNECTOR_PERSPECTIVE);
  private readonly xfscSearch = inject(SimplAdvancedSearchService);
  private readonly translate = inject(TranslateService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly participantNameService = inject(ParticipantNameService);
  private readonly assetService = inject(AssetService);

  /** Full local EDC asset list, memoized per connector (the shared assets cache is reduced to
   *  SD-matched assets by the warmup, so it can't resolve arbitrary transfer asset ids). */
  private allAssetsPromise: Promise<readonly Asset[]> | undefined;

  private readonly destroy$ = new Subject<void>();
  private readonly pageEnrich$ = new Subject<TransferProcess[]>();
  private readonly searchInput$ = new Subject<string>();
  private readonly transferProcessesSubject = new BehaviorSubject<TransferProcess[]>([]);
  private readonly filteredTransferProcessesSubject = new BehaviorSubject<TransferProcess[]>([]);
  private readonly pageTransferProcessesSubject = new BehaviorSubject<TransferProcess[]>([]);

  transferProcesses$: Observable<TransferProcess[]> = this.transferProcessesSubject.asObservable();
  filteredTransferProcesses$: Observable<TransferProcess[]> = this.filteredTransferProcessesSubject.asObservable();
  pageTransferProcesses$: Observable<TransferProcess[]> = this.pageTransferProcessesSubject.asObservable();

  /** Normalized asset id → catalog display name for the transfer table. */
  assetDisplayByAssetId = new Map<string, string>();

  /** Normalized contract agreement id → counter party id (external connector). */
  connectorLabelByContractId = new Map<string, string>();

  readonly pageItemCount = 5;
  /** Primary perspective; drives single-role defaults. */
  contractType: ConnectorPerspective = 'CONSUMER';
  /** Every perspective the user acts in — both entries when they hold publisher *and* consumer. */
  contractTypes: ConnectorPerspective[] = ['CONSUMER'];
  fetched = false;
  loadFailed = false;
  filterActive = false;
  pageAssetEnrichmentInProgress = false;

  private lastFilterText = '';
  private backgroundEnrichmentToken = 0;

  readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: 'menu.home', route: '/home' },
    { label: 'menu.transferHistory' },
  ];

  get breadcrumbItemsTranslated(): BreadcrumbItem[] {
    return this.breadcrumbItems.map(item => ({
      ...item,
      label: this.translate.instant(item.label),
    }));
  }

  /**
   * Only hide the file column when the user acts solely as provider. Holding both roles keeps it
   * visible: the per-row actions are already gated on the process being a consumer transfer.
   */
  get isProviderOnlyView(): boolean {
    return this.contractTypes.length === 1 && this.contractTypes[0] === 'PROVIDER';
  }

  async ngOnInit(): Promise<void> {
    this.contractTypes = resolveConnectorPerspectives(this.connectorPerspective);
    this.contractType = this.contractTypes.includes('PROVIDER') ? 'PROVIDER' : 'CONSUMER';
    this.setupPageEnrichment();
    this.setupSearchDebounce();
    await this.fetchHistory();
    this.stateService.currentEdcConfig$
      .pipe(skip(1), takeUntil(this.destroy$))
      .subscribe(() => void this.fetchHistory());
  }

  private setupSearchDebounce(): void {
    this.searchInput$
      .pipe(debounceTime(450), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(searchText => this.applyFilter(searchText));
  }

  private transferStateLabelForFilter(state: string | undefined): string {
    const raw = state?.trim();
    if (!raw) {
      return '';
    }
    const key = `transferProcess.state.${raw}`;
    const translated = this.translate.instant(key);
    return translated !== key ? translated : `${this.translate.instant('transferProcess.stateUnknown')} (${raw})`;
  }

  private assetDisplayForProcess(process: TransferProcess): string {
    const value = readTransferAssetId(process);
    if (!value || value.toLowerCase() === 'unknown') {
      return this.translate.instant('transferProcess.assetPending');
    }
    const resolved = this.assetDisplayByAssetId.get(value.toLowerCase())?.trim();
    const label = (resolved && resolved.length > 0 ? resolved : value).trim();
    return label.length > 0 ? label : this.translate.instant('transferProcess.assetPending');
  }

  private connectorLabelForFilter(process: TransferProcess): string {
    const cid = readTransferContractId(process);
    if (!cid) {
      return '';
    }
    return this.connectorLabelByContractId.get(cid.toLowerCase())?.trim() ?? '';
  }

  private setupPageEnrichment(): void {
    this.pageEnrich$
      .pipe(
        debounceTime(300),
        map(pageProcesses => ({ pageProcesses, sig: pageProcessSignature(pageProcesses) })),
        distinctUntilChanged((a, b) => a.sig === b.sig),
        switchMap(({ pageProcesses }) => this.enrichProcesses(pageProcesses, { trackPageLoading: true })),
        takeUntil(this.destroy$),
      )
      .subscribe(async () => {
        this.publishEnrichmentMaps();
        await this.enrichBackgroundProcesses();
      });
  }

  private queuePageEnrichment(pageProcesses: TransferProcess[]): void {
    if (pageProcesses.length > 0) {
      this.pageEnrich$.next(pageProcesses);
    }
  }

  private async enrichProcesses(processes: TransferProcess[], options: { trackPageLoading: boolean }): Promise<void> {
    const config = await firstValueFrom(this.stateService.currentEdcConfig$.pipe(take(1)));
    if (useFixtureMocks(config)) {
      return;
    }
    if (options.trackPageLoading) {
      this.pageAssetEnrichmentInProgress = true;
      this.cdr.markForCheck();
    }
    try {
      await Promise.all([this.enrichPageAssetLabels(processes), this.enrichPageConnectorLabels(processes)]);
    } finally {
      if (options.trackPageLoading) {
        this.pageAssetEnrichmentInProgress = false;
        this.publishEnrichmentMaps();
      }
    }
  }

  private async enrichBackgroundProcesses(): Promise<void> {
    const token = ++this.backgroundEnrichmentToken;
    const all = this.transferProcessesSubject.value;
    const pageIds = new Set(this.pageTransferProcessesSubject.value.map(p => p.id).filter(Boolean));
    const remaining = all.filter(p => p.id && !pageIds.has(p.id));
    for (let i = 0; i < remaining.length; i += this.pageItemCount) {
      if (token !== this.backgroundEnrichmentToken) {
        return;
      }
      const batch = remaining.slice(i, i + this.pageItemCount);
      await this.enrichProcesses(batch, { trackPageLoading: false });
      if (token !== this.backgroundEnrichmentToken) {
        return;
      }
      this.publishEnrichmentMaps();
      if (this.lastFilterText) {
        this.applyFilter(this.lastFilterText, false);
      }
    }
  }

  private publishEnrichmentMaps(): void {
    this.assetDisplayByAssetId = new Map(this.assetDisplayByAssetId);
    this.connectorLabelByContractId = new Map(this.connectorLabelByContractId);
    this.cdr.markForCheck();
  }

  private async enrichPageAssetLabels(processes: TransferProcess[]): Promise<void> {
    const assetIdByKey = new Map<string, string>();
    for (const process of processes) {
      const assetId = readTransferAssetId(process);
      if (!assetId || assetId.toLowerCase() === 'unknown') {
        continue;
      }
      const key = assetId.toLowerCase();
      if (!this.assetDisplayByAssetId.has(key) && !assetIdByKey.has(key)) {
        assetIdByKey.set(key, assetId);
      }
    }
    if (assetIdByKey.size === 0) {
      return;
    }

    // Resolve names from the full local EDC asset list first; only fall back to the (often
    // disabled) federated catalog when the asset isn't found locally.
    let assets: readonly Asset[] = [];
    try {
      assets = await this.loadLocalAssets();
    } catch {
      assets = [];
    }

    await Promise.all(
      [...assetIdByKey.entries()].map(async ([key, assetId]) => {
        const localAsset = assets.length ? findEdcAssetByConnectorId(assets, assetId) : undefined;
        if (localAsset) {
          const name = resolveAssetCatalogDisplayName(localAsset).trim();
          if (name) {
            this.assetDisplayByAssetId.set(key, name);
            return;
          }
        }
        try {
          const result = await firstValueFrom(this.xfscSearch.simpleSearchSD(assetId, { page: 1, pageSize: 1 }));
          const first = result.items?.[0];
          if (!first) {
            return;
          }
          const name = normalizeSelfDescriptionSearchItem(first).name.trim();
          if (name) {
            this.assetDisplayByAssetId.set(key, name);
          }
        } catch {
          /* xfsc lookup is best-effort */
        }
      }),
    );
  }

  private async loadLocalAssets(): Promise<readonly Asset[]> {
    if (!this.allAssetsPromise) {
      this.allAssetsPromise = this.assetService.getAllAssets().catch((err: unknown) => {
        this.allAssetsPromise = undefined; // allow a retry after a failed fetch
        throw err;
      });
    }
    return this.allAssetsPromise;
  }

  private async enrichPageConnectorLabels(processes: TransferProcess[]): Promise<void> {
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const process of processes) {
      const contractId = readTransferContractId(process);
      if (!contractId) {
        continue;
      }
      const key = contractId.toLowerCase();
      if (seen.has(key) || this.connectorLabelByContractId.has(key)) {
        continue;
      }
      seen.add(key);
      ids.push(contractId);
    }
    await Promise.all(
      ids.map(async agreementId => {
        const key = agreementId.toLowerCase();
        try {
          // Prefer the agreement assigner (the offer provider). Fall back to the negotiation
          // counterPartyId, which is only the provider in the consumer view.
          const agreement = await this.transferProcessService.getContractAgreement(agreementId).catch(() => undefined);
          let label = readAgreementProviderId(agreement);
          if (!label) {
            const negotiation = await this.transferProcessService.getNegotiationByAgreement(agreementId);
            label = readNegotiationCounterPartyId(negotiation);
          }
          if (label) {
            try {
              const resolved = await this.participantNameService.getName(label);
              this.connectorLabelByContractId.set(key, resolved || label);
            } catch {
              this.connectorLabelByContractId.set(key, label);
            }
          }
        } catch {
          /* one failure must not break the table */
        }
      }),
    );
  }

  private setProcesses(processes: TransferProcess[]): void {
    this.transferProcessesSubject.next(processes);
    this.applyFilter(this.lastFilterText, true);
  }

  private async fetchHistory(): Promise<void> {
    this.backgroundEnrichmentToken++;
    this.fetched = false;
    this.loadFailed = false;
    this.transferProcessesSubject.next([]);
    this.filteredTransferProcessesSubject.next([]);
    this.pageTransferProcessesSubject.next([]);
    this.assetDisplayByAssetId = new Map();
    this.connectorLabelByContractId = new Map();
    this.pageAssetEnrichmentInProgress = false;
    this.allAssetsPromise = undefined;

    try {
      const config = await firstValueFrom(this.stateService.currentEdcConfig$.pipe(take(1)));
      let processes: TransferProcess[];

      if (useFixtureMocks(config)) {
        processes = this.contractTypes
          .flatMap(perspective => getFixtureTransferProcesses(perspective))
          .sort((a, b) => fixtureTimestamp(b) - fixtureTimestamp(a));
        this.assetDisplayByAssetId = buildAssetDisplayNameLookup(TRANSFER_FIXTURE_CATALOG_ASSETS);
        this.connectorLabelByContractId = new Map(TRANSFER_FIXTURE_CONNECTOR_BY_CONTRACT_ID);
      } else {
        // With both roles the connector holds transfers of both types, so no `type` filter is
        // sent — narrowing to one would drop every transfer of the other role.
        const singlePerspective = this.contractTypes.length === 1 ? this.contractTypes[0] : undefined;
        processes = await this.transferProcessService.getAllTransferProcesses({
          sortField: 'stateTimestamp',
          sortOrder: 'DESC',
          ...(singlePerspective
            ? {
                filterExpression: [
                  {
                    operandLeft: 'type',
                    operator: '=',
                    operandRight: singlePerspective,
                  },
                ],
              }
            : {}),
        });
      }

      this.setProcesses(processes);
    } catch {
      this.loadFailed = true;
      this.assetDisplayByAssetId = new Map();
      this.connectorLabelByContractId = new Map();
      this.transferProcessesSubject.next([]);
      this.filteredTransferProcessesSubject.next([]);
      this.pageTransferProcessesSubject.next([]);
    } finally {
      this.fetched = true;
    }
  }

  paginationEvent(pageItems: TransferProcess[]) {
    this.pageTransferProcessesSubject.next(pageItems);
    this.queuePageEnrichment(pageItems);
  }

  onSearchInput(searchText: string): void {
    this.searchInput$.next(searchText);
  }

  private filterProcesses(processes: TransferProcess[], searchText: string): TransferProcess[] {
    const lower = searchText.toLowerCase();
    return processes.filter(transferProcess => {
      const typeLabel = (() => {
        try {
          return transferProcess.mandatoryValue<string>('edc', 'transferType').toLowerCase();
        } catch {
          return String((transferProcess as unknown as { transferType?: string }).transferType ?? '').toLowerCase();
        }
      })();
      const stateRaw = String(transferProcess.state ?? '')
        .toLowerCase()
        .trim();
      const stateTranslated = this.transferStateLabelForFilter(transferProcess.state).toLowerCase();
      const assetResolved = this.assetDisplayForProcess(transferProcess).toLowerCase();
      const connectorResolved = this.connectorLabelForFilter(transferProcess).toLowerCase();
      return (
        readTransferAssetId(transferProcess).toLowerCase().includes(lower) ||
        stateRaw.includes(lower) ||
        stateTranslated.includes(lower) ||
        typeLabel.includes(lower) ||
        assetResolved.includes(lower) ||
        connectorResolved.includes(lower) ||
        readTransferContractId(transferProcess).toLowerCase().includes(lower) ||
        (transferProcess.id ?? '').toLowerCase().includes(lower)
      );
    });
  }

  private applyFilter(searchText: string, enqueueEnrichment = true): void {
    this.lastFilterText = searchText;
    this.filterActive = searchText.trim().length > 0;
    const all = this.transferProcessesSubject.value;
    const filtered = searchText.trim() ? this.filterProcesses(all, searchText) : all;
    this.filteredTransferProcessesSubject.next(filtered);
    const page = filtered.slice(0, this.pageItemCount);
    this.pageTransferProcessesSubject.next(page);
    if (enqueueEnrichment && page.length > 0) {
      this.queuePageEnrichment(page);
    }
  }

  async onDeprovision(transferProcess: TransferProcess) {
    this.transferProcessService
      .deprovisionTransferProcess(transferProcess.id)
      .then(async () => {
        const msg = this.translate.instant('transfer.deprovision.success', { id: transferProcess.id });
        this.modalAndAlertService.showAlert(msg, undefined, 'success', 5);
        await this.fetchHistory();
      })
      .catch(error => {
        console.error(error);
        const msg = this.translate.instant('transfer.deprovision.failed', { id: transferProcess.id });
        this.modalAndAlertService.showAlert(msg, this.translate.instant('common.error.title'), 'error', 5);
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
