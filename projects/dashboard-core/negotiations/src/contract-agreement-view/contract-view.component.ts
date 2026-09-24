import { Component, OnDestroy, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ParticipantNameService } from '@eclipse-edc/dashboard-core';
import { compact, ContractAgreement, ContractNegotiation } from '@think-it-labs/edc-connector-client';
import {
  BehaviorSubject,
  debounceTime,
  distinctUntilChanged,
  firstValueFrom,
  map,
  Observable,
  Subject,
  switchMap,
  take,
  takeUntil,
} from 'rxjs';
import {
  BreadcrumbsComponent,
  type BreadcrumbItem,
  type ConnectorPerspective,
  DASHBOARD_CONNECTOR_PERSPECTIVE,
  resolveConnectorPerspectives,
  DashboardStateService,
  FilterInputComponent,
  JsonldViewerComponent,
  MOCK_SELF_DESCRIPTION_SD_ID,
  ListLoadingStateComponent,
  ModalAndAlertService,
  PaginationComponent,
  resolveSelfDescriptionIdForEdcAsset,
  findEdcAssetByConnectorId,
  useFixtureMocks,
} from '@eclipse-edc/dashboard-core';
import { AssetService, buildAssetDisplayNameLookup } from '@eclipse-edc/dashboard-core/assets';
import { getFixtureNegotiationPairs, NEGOTIATION_FIXTURE_CATALOG_ASSETS } from '../negotiations.fixture-mocks';
import { AsyncPipe, DatePipe, NgClass, NgFor, NgIf, JsonPipe } from '@angular/common';
import { ContractConsumptionService, ContractTransferModalComponent } from '@eclipse-edc/dashboard-core/xfsc-advSearch';
import { CorpusSelfDescriptionDetailModalComponent } from '../corpus-self-description-detail-modal/corpus-self-description-detail-modal.component';
import { NegotiationsService } from '../negotiations.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NegotiationCatalogEnrichmentService } from '../negotiation-catalog-enrichment.service';
import type { NegotiationRow } from '../negotiation-row.model';
import { edcNegotiationRequestId, edcNegotiationType, negotiationToRow } from '../negotiation-row.mapper';
import { PaymentApprovalService, PendingPaymentAgreement } from '@eclipse-edc/dashboard-core/transfer';

function pageRowSignature(rows: NegotiationRow[]): string {
  return rows.map(r => r.negotiationId).join('|');
}

/**
 * Reads the provider participant id from the contract agreement: the ODRL policy `assigner`
 * (the offer provider), falling back to the agreement `providerId`. Independent of the current
 * view — unlike `counterPartyId`, which is the consumer when we are the provider.
 */
function readAgreementProviderId(agreement: ContractAgreement | undefined): string | undefined {
  if (!agreement) {
    return undefined;
  }
  const rec = agreement as unknown as Record<string, unknown>;
  const policy = rec['policy'] as Record<string, unknown> | undefined;
  const assigner = policy?.['odrl:assigner'] ?? policy?.['assigner'];
  if (typeof assigner === 'string' && assigner.trim()) {
    return assigner.trim();
  }
  if (assigner && typeof assigner === 'object') {
    const id = (assigner as Record<string, unknown>)['@id'];
    if (typeof id === 'string' && id.trim()) {
      return id.trim();
    }
  }
  const providerId = rec['providerId'];
  if (typeof providerId === 'string' && providerId.trim()) {
    return providerId.trim();
  }
  return undefined;
}

function formatNegotiationListDate(createdAt: number | undefined): string {
  if (createdAt == null || Number.isNaN(createdAt)) {
    return '';
  }
  try {
    return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(
      new Date(createdAt),
    );
  } catch {
    return '';
  }
}

@Component({
  selector: 'lib-contract-agreement-view',
  standalone: true,
  imports: [
    BreadcrumbsComponent,
    FilterInputComponent,
    PaginationComponent,
    ListLoadingStateComponent,
    AsyncPipe,
    DatePipe,
    NgClass,
    NgIf,
    NgFor,
    TranslateModule,
    CorpusSelfDescriptionDetailModalComponent,
    JsonPipe,
  ],
  templateUrl: './contract-view.component.html',
  styleUrl: './contract-view.component.css',
})
export class ContractViewComponent implements OnInit, OnDestroy {
  private readonly negotiationsService = inject(NegotiationsService);
  private readonly participantNameService = inject(ParticipantNameService);
  private readonly participantNameCache = new Map<string, string>();
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly enrichmentService = inject(NegotiationCatalogEnrichmentService);
  private readonly modalAndAlertService = inject(ModalAndAlertService);
  private readonly assetService = inject(AssetService);
  private readonly stateService = inject(DashboardStateService);
  private readonly connectorPerspective = inject(DASHBOARD_CONNECTOR_PERSPECTIVE);
  private readonly contractConsumption = inject(ContractConsumptionService);
  private readonly paymentApprovalService = inject(PaymentApprovalService);
  private readonly destroy$ = new Subject<void>();
  private readonly pageEnrich$ = new Subject<NegotiationRow[]>();
  private readonly searchInput$ = new Subject<string>();
  private readonly rowsSubject = new BehaviorSubject<NegotiationRow[]>([]);
  private readonly filteredRowsSubject = new BehaviorSubject<NegotiationRow[]>([]);
  private readonly pageRowsSubject = new BehaviorSubject<NegotiationRow[]>([]);

  rows$: Observable<NegotiationRow[]> = this.rowsSubject.asObservable();
  filteredRows$: Observable<NegotiationRow[]> = this.filteredRowsSubject.asObservable();
  pageRows$: Observable<NegotiationRow[]> = this.pageRowsSubject.asObservable();

  readonly pageItemCount = 5;
  initialized = false;
  /** Primary perspective; drives single-role defaults. */
  contractType: ConnectorPerspective = 'PROVIDER';
  /** Every perspective the user acts in — both entries when they hold publisher *and* consumer. */
  contractTypes: ConnectorPerspective[] = ['PROVIDER'];
  private translate = inject(TranslateService);

  pendingPaymentByNegotiationId = new Map<string, PendingPaymentAgreement>();
  processingPaymentIds = new Set<string>();

  readonly breadcrumbItems: BreadcrumbItem[] = [{ label: 'menu.home', route: '/home' }, { label: 'menu.contracts' }];

  get breadcrumbItemsTranslated(): BreadcrumbItem[] {
    return this.breadcrumbItems.map(item => ({
      ...item,
      label: this.translate.instant(item.label),
    }));
  }

  private lastFilterText = '';
  private backgroundEnrichmentToken = 0;

  async ngOnInit() {
    this.contractTypes = resolveConnectorPerspectives(this.connectorPerspective);
    this.contractType = this.contractTypes.includes('PROVIDER') ? 'PROVIDER' : 'CONSUMER';
    this.setupPageEnrichment();
    this.setupSearchDebounce();
    await this.fetchNegotiations();
    this.stateService.currentEdcConfig$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.enrichmentService.clearCache();
      void this.fetchNegotiations();
    });
  }

  private setupSearchDebounce(): void {
    this.searchInput$
      .pipe(debounceTime(450), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(searchText => this.applyFilter(searchText));
  }

  private setupPageEnrichment(): void {
    this.pageEnrich$
      .pipe(
        debounceTime(300),
        map(pageRows => ({ pageRows, sig: pageRowSignature(pageRows) })),
        distinctUntilChanged((a, b) => a.sig === b.sig),
        switchMap(({ pageRows }) => {
          const snapshot = pageRows.map(row => ({ ...row }));
          return this.enrichmentService
            .enrichRows(snapshot, this.enrichmentOptions())
            .then(() => snapshot)
            .catch(() => snapshot);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(enriched => {
        this.mergeEnrichedRows(enriched);
        void this.enrichBackgroundRows();
      });
  }

  private enrichmentOptions() {
    return {
      createPlaceholderAgreement: (n: ContractNegotiation) => this.createPlaceholderAgreement(n),
      assetPendingLabel: this.translate.instant('negotiation.assetPending'),
    };
  }

  private async enrichBackgroundRows(): Promise<void> {
    const token = ++this.backgroundEnrichmentToken;
    const pending = this.rowsSubject.value.filter(
      row => row.enrichmentStatus === 'idle' || row.enrichmentStatus === 'error',
    );
    for (let i = 0; i < pending.length; i += this.pageItemCount) {
      if (token !== this.backgroundEnrichmentToken) {
        return;
      }
      const batch = pending.slice(i, i + this.pageItemCount).map(row => ({ ...row }));
      await this.enrichmentService.enrichRows(batch, this.enrichmentOptions()).catch(() => undefined);
      if (token !== this.backgroundEnrichmentToken) {
        return;
      }
      this.mergeEnrichedRows(batch);
    }
  }

  private mergeEnrichedRows(enriched: NegotiationRow[]): void {
    const byId = new Map(enriched.map(r => [r.negotiationId, r]));
    const applyUpdate = (row: NegotiationRow): void => {
      const updated = byId.get(row.negotiationId);
      if (!updated) {
        return;
      }
      row.displayName = updated.displayName;
      row.selfDescriptionId = updated.selfDescriptionId;
      row.assetId = updated.assetId;
      row.agreement = updated.agreement ?? row.agreement;
      row.enrichmentStatus = updated.enrichmentStatus;
    };

    for (const row of this.rowsSubject.value) {
      applyUpdate(row);
    }
    for (const row of this.filteredRowsSubject.value) {
      applyUpdate(row);
    }
    for (const row of this.pageRowsSubject.value) {
      applyUpdate(row);
    }

    this.rowsSubject.next(this.rowsSubject.value);
    if (this.lastFilterText) {
      const filtered = this.filterRows(this.rowsSubject.value, this.lastFilterText);
      this.filteredRowsSubject.next(filtered);
    } else {
      this.filteredRowsSubject.next(this.filteredRowsSubject.value);
    }
    this.pageRowsSubject.next(this.pageRowsSubject.value);
  }

  private setRows(rows: NegotiationRow[]): void {
    this.rowsSubject.next(rows);
    this.publishFilteredAndPage(true);
  }

  private publishFilteredAndPage(enqueueEnrichment = false): void {
    const allRows = this.rowsSubject.value;
    const filtered = this.lastFilterText ? this.filterRows(allRows, this.lastFilterText) : allRows;
    this.filteredRowsSubject.next(filtered);
    const page = filtered.slice(0, this.pageItemCount);
    this.pageRowsSubject.next(page);
    if (enqueueEnrichment) {
      this.queuePageEnrichment(page);
    }
  }

  private filterRows(rows: NegotiationRow[], searchText: string): NegotiationRow[] {
    const lower = searchText.toLowerCase();
    return rows.filter(row => {
      const negId = row.negotiationId.toLowerCase();
      const agrId = row.contractAgreementId?.toLowerCase() ?? row.agreement?.id?.toLowerCase() ?? '';
      const counterParty = row.counterPartyId.toLowerCase();
      const state = row.state.toLowerCase();
      const stateLabel = this.negotiationStateLabel(
        row,
        !this.isFinalized(row) && !this.isTerminated(row),
      ).toLowerCase();
      const displayName = row.displayName.toLowerCase();
      const assetId = (row.assetId ?? '').toLowerCase();
      const sdId = (row.selfDescriptionId ?? '').toLowerCase();
      return (
        negId.includes(lower) ||
        agrId.includes(lower) ||
        counterParty.includes(lower) ||
        state.includes(lower) ||
        stateLabel.includes(lower) ||
        displayName.includes(lower) ||
        assetId.includes(lower) ||
        sdId.includes(lower)
      );
    });
  }

  private queuePageEnrichment(pageRows: NegotiationRow[]): void {
    if (pageRows.length > 0) {
      this.pageEnrich$.next(pageRows);
    }
  }

  private async fetchNegotiations(): Promise<void> {
    this.backgroundEnrichmentToken++;
    this.initialized = false;
    try {
      const config = await firstValueFrom(this.stateService.currentEdcConfig$.pipe(take(1)));
      if (useFixtureMocks(config)) {
        await this.loadFixtureRows();
        return;
      }

      // With both roles the connector holds negotiations of both types, so no `type` filter is
      // sent — narrowing to one would drop every negotiation of the other role.
      const singlePerspective = this.contractTypes.length === 1 ? this.contractTypes[0] : undefined;
      const fromApi = await this.negotiationsService.getAllContractNegotiations({
        sortField: 'createdAt',
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

      const negotiations = fromApi
        .filter(negotiation => this.matchesActivePerspective(edcNegotiationType(negotiation)))
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

      const placeholder = this.translate.instant('negotiation.assetPending');
      const rows: NegotiationRow[] = [];
      for (const negotiation of negotiations) {
        const compacted = await compact(negotiation);
        const row = negotiationToRow(compacted, placeholder);
        if (row) {
          rows.push(row);
        }
      }

      this.setRows(rows);

      if (this.contractTypes.includes('PROVIDER')) {
        await this.fetchPendingPayments();
      }
    } catch {
      this.setRows([]);
    } finally {
      this.initialized = true;
    }
  }

  private matchesActivePerspective(type: string | undefined): boolean {
    return !!type && this.contractTypes.includes(type as ConnectorPerspective);
  }

  private async loadFixtureRows(): Promise<void> {
    const pairs = this.contractTypes
      .flatMap(perspective => getFixtureNegotiationPairs(perspective))
      .sort(([, a], [, b]) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    const lookup = buildAssetDisplayNameLookup(NEGOTIATION_FIXTURE_CATALOG_ASSETS);
    const cacheEntries: [string, { displayName: string; selfDescriptionId?: string }][] = [];
    for (const [assetId, name] of lookup) {
      cacheEntries.push([assetId, { displayName: name, selfDescriptionId: MOCK_SELF_DESCRIPTION_SD_ID }]);
    }
    this.enrichmentService.seedCache(cacheEntries);

    const placeholder = this.translate.instant('negotiation.assetPending');
    const rows: NegotiationRow[] = [];

    for (const [agreement, negotiation] of pairs) {
      const row = negotiationToRow(negotiation, placeholder);
      if (!row) {
        continue;
      }
      row.agreement = agreement;
      row.assetId = agreement.assetId;
      const cached = agreement.assetId ? lookup.get(agreement.assetId.trim().toLowerCase()) : undefined;
      row.displayName = cached ?? placeholder;
      row.selfDescriptionId = MOCK_SELF_DESCRIPTION_SD_ID;
      row.enrichmentStatus = 'done';
      rows.push(row);
    }

    this.setRows(rows);
  }

  private createPlaceholderAgreement(negotiation: ContractNegotiation): ContractAgreement {
    const counterPartyId = negotiation['counterPartyId'] || '-';
    // Derived from the negotiation itself, not from the view: with both roles the list mixes
    // provider and consumer negotiations, so a view-wide flag would mislabel half of them.
    const isProviderNegotiation = edcNegotiationType(negotiation) === 'PROVIDER';
    return {
      id: negotiation.contractAgreementId || edcNegotiationRequestId(negotiation) || `placeholder-${Date.now()}`,
      assetId: 'unknown',
      providerId: isProviderNegotiation ? '-' : counterPartyId,
      consumerId: isProviderNegotiation ? counterPartyId : '-',
    } as ContractAgreement;
  }

  onSearchInput(searchText: string): void {
    this.searchInput$.next(searchText);
  }

  private applyFilter(searchText: string): void {
    this.lastFilterText = searchText;
    this.publishFilteredAndPage(true);
  }

  paginationEvent(pageItems: NegotiationRow[]) {
    this.pageRowsSubject.next(pageItems);
    this.queuePageEnrichment(pageItems);
  }

  openDetails(agreement: ContractAgreement) {
    this.modalAndAlertService.openModal(JsonldViewerComponent, { jsonLdObject: agreement });
  }

  isConsumer(row: NegotiationRow): boolean {
    return row.type === 'CONSUMER';
  }

  async openTransferForRow(row: NegotiationRow, event: Event): Promise<void> {
    event.stopPropagation();
    const sdId = await this.resolveSelfDescriptionIdForRow(row);
    if (!sdId) {
      this.modalAndAlertService.showAlert(
        this.translate.instant('assets.detail.errorInvalidId'),
        undefined,
        'warning',
        5,
      );
      return;
    }

    const contractAgreementId = (row.contractAgreementId ?? row.agreement?.id)?.trim();
    const counterPartyAddress = await this.resolveCounterPartyAddress(row);
    if (!contractAgreementId || !counterPartyAddress) {
      this.modalAndAlertService.showAlert(
        this.translate.instant('negotiation.transferMissingContext'),
        undefined,
        'warning',
        5,
      );
      return;
    }

    this.modalAndAlertService.openModal(
      ContractTransferModalComponent,
      {
        selfDescriptionId: sdId,
        negotiationId: row.negotiationId,
        contractAgreementId,
        counterPartyAddress,
        assetLabel: row.displayName,
      },
      { closed: () => this.modalAndAlertService.closeModal() },
      true,
    );
  }

  isProviderView(): boolean {
    return this.contractTypes.length === 1 && this.contractTypes[0] === 'PROVIDER';
  }

  isConsumerView(): boolean {
    return this.contractTypes.length === 1 && this.contractTypes[0] === 'CONSUMER';
  }

  /** True when the user holds both roles: the action column is decided per row, not per view. */
  hasBothPerspectives(): boolean {
    return this.contractTypes.length > 1;
  }

  /** Header of the last column; a mixed list needs a role-neutral label. */
  actionsColumnLabelKey(): string {
    if (this.hasBothPerspectives()) {
      return 'negotiation.actions';
    }
    return this.isProviderView() ? 'negotiation.state.PAYMENT_PENDING' : 'negotiation.transfer';
  }

  /** Payment approval actions belong to the rows where we are the provider. */
  showsPaymentActions(row: NegotiationRow): boolean {
    return this.contractTypes.includes('PROVIDER') && row.type === 'PROVIDER';
  }

  get tableColspan(): number {
    return 5;
  }

  isAssetNamePending(row: NegotiationRow): boolean {
    return row.enrichmentStatus === 'idle' || row.enrichmentStatus === 'loading';
  }

  /**
   * The asset name is only clickable when there is a self-description to open. Most assets
   * resolve a display name locally but have no self-description associated; those must render
   * as plain text, otherwise clicking fails with "invalid self-description id".
   */
  canOpenAssetSelfDescription(row: NegotiationRow): boolean {
    if (this.isAssetNamePending(row)) {
      return false;
    }
    return !!row.selfDescriptionId?.trim();
  }
  isPaidContract(row: NegotiationRow): boolean {
    return row.counterPartyId !== 'a';
  }

  roleLabel(row: NegotiationRow): string {
    return row.type === 'PROVIDER' ? 'Proveedor' : 'Consumidor';
  }

  providerLabel(row: NegotiationRow): string {
    // Prefer the agreement assigner (the offer provider). Fall back to counterPartyId while the
    // agreement is still loading — correct in the consumer view, transient in the provider view.
    const id = readAgreementProviderId(row.agreement) ?? row.counterPartyId?.trim();
    if (!id) return '-';
    // Attempt to synchronously return cached name if present; otherwise kick off async resolution.
    if (this.participantNameCache.has(id)) return this.participantNameCache.get(id)!;
    // resolve in background and cache result
    void this.participantNameService.getName(id).then(name => {
      this.participantNameCache.set(id, name);
      try {
        this.cdr.markForCheck();
      } catch {
        // ignore if change detection isn't available
      }
    });
    return id;
  }

  negotiationStateLabel(row: NegotiationRow | undefined, pending: boolean | undefined): string {
    const raw = row?.state.trim();
    if (!raw) {
      return '-';
    }

    if (!pending) {
      const key = `negotiation.state.${raw}`;
      const translated = this.translate.instant(key);
      return translated !== key ? translated : `${this.translate.instant('negotiation.stateUnknown')} (${raw})`;
    } else {
      const key = `negotiation.state.PAYMENT_PENDING`;
      const translated = this.translate.instant(key);
      return translated !== key ? translated : `${this.translate.instant('negotiation.stateUnknown')} (${raw})`;
    }
  }

  isFinalized(row: NegotiationRow): boolean {
    return row.state === 'FINALIZED';
  }

  isTerminated(row: NegotiationRow): boolean {
    return row.state === 'TERMINATED';
  }

  statusBadgeClass(row: NegotiationRow): string {
    switch (row.state) {
      case 'FINALIZED':
        return 'badge-success';
      case 'TERMINATED':
      case 'TERMINATING':
        return 'badge-error';
      case 'VERIFYING':
      case 'VERIFIED':
      case 'AGREEING':
      case 'AGREED':
        return 'badge-info';
      default:
        return 'badge-warning';
    }
  }

  trackById(index: number, row: NegotiationRow): string | number {
    return row.negotiationId ?? index;
  }

  private async fetchPendingPayments(): Promise<void> {
    try {
      const list = await this.paymentApprovalService.listPendingPayments();
      this.pendingPaymentByNegotiationId = new Map(list.map(p => [p.contractNegotiationId, p]));
    } catch (e) {
      console.error('Failed to fetch pending payment agreements', e);
      this.pendingPaymentByNegotiationId = new Map();
    }
  }

  pendingPaymentFor(row: NegotiationRow): PendingPaymentAgreement | undefined {
    return this.pendingPaymentByNegotiationId.get(row.negotiationId);
  }

  async confirmPayment(row: NegotiationRow, event: Event): Promise<void> {
    event.stopPropagation();
    const pending = this.pendingPaymentFor(row);
    if (!pending) return;

    this.processingPaymentIds.add(row.negotiationId);
    try {
      await this.paymentApprovalService.confirmPayment(pending.contractAgreementId);

      // 1. Actualizar el estado de la fila localmente (creando nueva referencia)
      const updatedRows = this.rowsSubject.value.map(r =>
        r.negotiationId === row.negotiationId ? { ...r, state: 'FINALIZED' } : r,
      );
      this.rowsSubject.next(updatedRows);

      // 2. Recargar pagos pendientes (para que desaparezcan los botones)
      await this.fetchPendingPayments();

      // 3. Refrescar filtro y paginación
      this.publishFilteredAndPage(true);
    } catch (e) {
      console.error('Failed to confirm payment', e);
    } finally {
      this.processingPaymentIds.delete(row.negotiationId);
    }
  }

  async rejectPayment(row: NegotiationRow, event: Event): Promise<void> {
    event.stopPropagation();
    const pending = this.pendingPaymentFor(row);
    if (!pending) return;

    this.processingPaymentIds.add(row.negotiationId);
    try {
      await this.paymentApprovalService.rejectPayment(pending.contractAgreementId);

      const updatedRows = this.rowsSubject.value.map(r =>
        r.negotiationId === row.negotiationId ? { ...r, state: 'TERMINATED' } : r,
      );
      this.rowsSubject.next(updatedRows);

      await this.fetchPendingPayments();
      this.publishFilteredAndPage(true);
    } catch (e) {
      console.error('Failed to reject payment', e);
    } finally {
      this.processingPaymentIds.delete(row.negotiationId);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async openAssetSelfDescription(row: NegotiationRow, event: Event) {
    event.stopPropagation();
    if (row.enrichmentStatus === 'loading') {
      return;
    }

    const sdId = await this.resolveSelfDescriptionIdForRow(row);
    if (!sdId) {
      this.modalAndAlertService.showAlert(
        this.translate.instant('assets.detail.errorInvalidId'),
        undefined,
        'warning',
        5,
      );
      return;
    }

    const assetId = row.assetId?.trim();
    const snapshot = await this.assetService.getAssetsCacheSnapshotOrLoad();
    const assets = snapshot?.data?.length ? snapshot.data : await this.assetService.getCachedOrFetchAssets();
    const edcAsset = assetId && assets ? findEdcAssetByConnectorId(assets, assetId) : undefined;

    this.modalAndAlertService.openModal(
      CorpusSelfDescriptionDetailModalComponent,
      {
        selfDescriptionId: sdId,
        edcAssetId: row.assetId,
        edcAsset,
        titleOverride: row.displayName,
        providerLabelOverride: this.providerLabel(row),
        listDateDisplay: formatNegotiationListDate(row.createdAt),
      },
      undefined,
      true,
    );
  }

  private async resolveSelfDescriptionIdForRow(row: NegotiationRow): Promise<string | undefined> {
    const assetId = row.assetId?.trim();
    const pendingLabel = this.translate.instant('negotiation.assetPending');

    const loadAssets = async () => {
      const snapshot = await this.assetService.getAssetsCacheSnapshotOrLoad();
      if (snapshot?.data?.length) {
        return snapshot.data;
      }
      return this.assetService.getCachedOrFetchAssets();
    };

    const catalogFallback = async (): Promise<string | undefined> => {
      if (!assetId) {
        return row.selfDescriptionId?.trim();
      }
      const cached = this.enrichmentService.getCached(assetId)?.selfDescriptionId?.trim();
      if (cached) {
        return cached;
      }
      try {
        const resolved = await this.enrichmentService.resolveSelfDescriptionId(assetId, pendingLabel);
        if (resolved) {
          row.selfDescriptionId = resolved;
        }
        return resolved;
      } catch {
        return row.selfDescriptionId?.trim();
      }
    };

    let sdId = assetId
      ? await resolveSelfDescriptionIdForEdcAsset(assetId, loadAssets, catalogFallback)
      : await catalogFallback();

    if (!sdId) {
      const config = await firstValueFrom(this.stateService.currentEdcConfig$.pipe(take(1)));
      if (useFixtureMocks(config)) {
        sdId = MOCK_SELF_DESCRIPTION_SD_ID;
      }
    }

    return sdId;
  }

  private async resolveCounterPartyAddress(row: NegotiationRow): Promise<string | undefined> {
    const fromNegotiation =
      typeof row.negotiation.counterPartyAddress === 'string' ? row.negotiation.counterPartyAddress.trim() : '';
    if (fromNegotiation) {
      return fromNegotiation;
    }

    try {
      const status = await firstValueFrom(
        this.contractConsumption.fetchContractNegotiationStatus(row.negotiationId).pipe(take(1)),
      );
      return status.counterPartyAddress?.trim() || undefined;
    } catch {
      return undefined;
    }
  }
}
