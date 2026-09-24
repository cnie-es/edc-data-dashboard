/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, ElementRef, inject, signal, ViewChild, type OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  CorpusSelfDescriptionDetailLayoutComponent,
  DashboardStateService,
  ModalAndAlertService,
  ParticipantNameService,
  applyCorpusDetailDisplayOverrides,
  mapCorpusOfferingSelfDescription,
  SdMatchedAssetsWarmupService,
  useFixtureMocks,
  type BreadcrumbItem,
  type OfferSelfDescriptionDetailViewModel,
} from '@eclipse-edc/dashboard-core';
import { AssetService } from '@eclipse-edc/dashboard-core/assets';
import { PolicyDetailModalComponent, PolicyListEnrichmentService } from '@eclipse-edc/dashboard-core/policies';
import { SdToolingService } from '@eclipse-edc/dashboard-core/sdtooling';
import { SimplAdvancedSearchService } from '@eclipse-edc/dashboard-core/xfsc-advSearch';
import {
  getMockOfferSelfDescriptionBody,
  MOCK_CORPUS_OFFERING_SELF_DESCRIPTION,
} from '../contract-definitions.mock-data';
import { formatOfferPublishedAt } from '../format-offer-published-at';
import { resolveOfferContractPolicyFromAssets } from '../resolve-offer-contract-policy.util';
import { catchError, distinctUntilChanged, EMPTY, finalize, firstValueFrom, from, map, of, switchMap, tap } from 'rxjs';
import { MockOfferResourcesService } from '../mock-offer-resources.service';

/** Router `navigate` state from Mis ofertas when opening an offer (see ContractDefinitionsViewComponent.openDetails). */
export interface OfferDetailListNavigationState {
  publishedAtIso?: string;
  /** Card subtitle (`assetType`), e.g. `corpus` — same as Mis ofertas list badge. */
  assetTypeLabel?: string;
  contractPolicyId?: string;
  accessPolicyId?: string;
  assetDisplayName?: string;
  policySummary?: string;
  publicationPolicySummary?: string;
  providerLabel?: string;
}

function readOfferDetailListState(router: Router): OfferDetailListNavigationState | undefined {
  const fromNav = router.getCurrentNavigation()?.extras?.state;
  if (fromNav && typeof fromNav === 'object' && hasOfferListStateKeys(fromNav)) {
    return fromNav as OfferDetailListNavigationState;
  }
  /* Same-tab navigation: Angular merges extras into `history.state` (shape may include `navigationId`). */
  if (typeof history !== 'undefined' && history.state && typeof history.state === 'object') {
    const h = history.state as Record<string, unknown>;
    if (hasOfferListStateKeys(h)) {
      return h as OfferDetailListNavigationState;
    }
  }
  return undefined;
}

function hasOfferListStateKeys(state: object): boolean {
  return (
    'publishedAtIso' in state ||
    'assetTypeLabel' in state ||
    'contractPolicyId' in state ||
    'accessPolicyId' in state ||
    'assetDisplayName' in state ||
    'policySummary' in state ||
    'publicationPolicySummary' in state ||
    'providerLabel' in state
  );
}

@Component({
  selector: 'lib-offer-self-description-detail-page',
  standalone: true,
  imports: [CommonModule, CorpusSelfDescriptionDetailLayoutComponent, TranslateModule],
  templateUrl: './offer-self-description-detail-page.component.html',
  styleUrl: './offer-self-description-detail-page.component.css',
})
export class OfferSelfDescriptionDetailPageComponent implements OnInit {
  @ViewChild('revokeConfirmDialog') private revokeConfirmDialog?: ElementRef<HTMLDialogElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(SimplAdvancedSearchService);
  private readonly sdToolingService = inject(SdToolingService);
  private readonly assetService = inject(AssetService);
  private readonly sdMatchedAssetsWarmup = inject(SdMatchedAssetsWarmupService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);
  private readonly dashboardState = inject(DashboardStateService);
  private readonly mockOfferResources = inject(MockOfferResourcesService);
  private readonly policyListEnrichment = inject(PolicyListEnrichmentService);
  private readonly participantNameService = inject(ParticipantNameService);
  private readonly modalAndAlertService = inject(ModalAndAlertService);

  private readonly currentEdcConfig = toSignal(this.dashboardState.currentEdcConfig$, {
    initialValue: undefined,
  });
  readonly useContractMocks = computed(() => useFixtureMocks(this.currentEdcConfig()));

  /** Formatted like the list card when `publishedAtIso` was passed in router state. */
  readonly listPublishedAtDisplay: string;
  /** Asset type from list card (`subtitle`), when navigating from Mis ofertas. */
  private readonly listAssetTypeLabel: string;
  private readonly listContractPolicyId: string;
  private readonly listAccessPolicyId: string;
  private readonly listAssetDisplayName: string;
  private readonly listPolicySummary: string;
  private readonly listPublicationPolicySummary: string;
  private readonly listProviderLabel: string;

  /** Route `offerId` (same as `offer.offerID`); signal keeps `showDeleteOffer` in sync with signal `input()` on the layout. */
  private readonly routeOfferId = signal('');
  /** Passed to layout so the revoke control stays visible/clickable once the route id is known (before/after detail load). */
  readonly canRevokeOffer = computed(() => this.routeOfferId().trim().length > 0);

  readonly contractPolicyId = signal('');
  readonly contractPolicyName = signal('');
  readonly contractPolicyNameLoading = signal(false);

  readonly publicationPolicyId = signal('');
  readonly publicationPolicyName = signal('');
  readonly publicationPolicyNameLoading = signal(false);

  loading = false;
  deleteInProgress = false;
  errorMessageKey: string | undefined;
  vm: OfferSelfDescriptionDetailViewModel | undefined;

  readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: 'menu.home', route: '/home' },
    { label: 'menu.offers', route: '/contract-definitions' },
    { label: 'offers.detail.breadcrumbCurrent' },
  ];

  constructor() {
    const listState = readOfferDetailListState(this.router);
    const iso = typeof listState?.publishedAtIso === 'string' ? listState.publishedAtIso : '';
    this.listPublishedAtDisplay = formatOfferPublishedAt(iso);
    this.listAssetTypeLabel = typeof listState?.assetTypeLabel === 'string' ? listState.assetTypeLabel.trim() : '';
    this.listContractPolicyId =
      typeof listState?.contractPolicyId === 'string' ? listState.contractPolicyId.trim() : '';
    this.listAccessPolicyId = typeof listState?.accessPolicyId === 'string' ? listState.accessPolicyId.trim() : '';
    this.listAssetDisplayName =
      typeof listState?.assetDisplayName === 'string' ? listState.assetDisplayName.trim() : '';
    this.listPolicySummary = typeof listState?.policySummary === 'string' ? listState.policySummary.trim() : '';
    this.listPublicationPolicySummary =
      typeof listState?.publicationPolicySummary === 'string' ? listState.publicationPolicySummary.trim() : '';
    this.listProviderLabel = typeof listState?.providerLabel === 'string' ? listState.providerLabel.trim() : '';
    this.routeOfferId.set(this.route.snapshot.paramMap.get('offerId')?.trim() ?? '');
    if (this.listContractPolicyId) {
      this.contractPolicyId.set(this.listContractPolicyId);
    }
    if (this.listAccessPolicyId) {
      this.publicationPolicyId.set(this.listAccessPolicyId);
    }
    const pendingLabel = this.translate.instant('policies.list.pending');
    if (this.listPolicySummary && this.listPolicySummary !== pendingLabel) {
      this.contractPolicyName.set(this.listPolicySummary);
    }
    if (this.listPublicationPolicySummary && this.listPublicationPolicySummary !== pendingLabel) {
      this.publicationPolicyName.set(this.listPublicationPolicySummary);
    }
  }

  get breadcrumbItemsTranslated(): BreadcrumbItem[] {
    return this.breadcrumbItems.map(item => ({
      ...item,
      label: this.translate.instant(item.label),
    }));
  }

  get deleteOfferDisabled(): boolean {
    return this.deleteInProgress;
  }

  ngOnInit(): void {
    this.policyListEnrichment.setEdcConfig(this.currentEdcConfig());

    this.route.paramMap
      .pipe(
        map(pm => pm.get('offerId')?.trim() ?? ''),
        distinctUntilChanged(),
        switchMap(offerId => {
          this.routeOfferId.set(offerId);
          if (!offerId) {
            this.errorMessageKey = 'offers.detail.errorInvalidId';
            this.vm = undefined;
            this.loading = false;
            return EMPTY;
          }
          this.loading = true;
          this.errorMessageKey = undefined;
          this.vm = undefined;
          const useMocks = useFixtureMocks(this.currentEdcConfig());
          const source$ = useMocks
            ? from(this.mockOfferResources.ensureLoaded()).pipe(
                switchMap(() =>
                  of(getMockOfferSelfDescriptionBody(offerId) ?? { ...MOCK_CORPUS_OFFERING_SELF_DESCRIPTION }),
                ),
              )
            : this.service.detailedSearchSD(offerId);
          return source$.pipe(
            tap({
              next: body => {
                const mapped = mapCorpusOfferingSelfDescription(body as Record<string, unknown>);
                this.vm = applyCorpusDetailDisplayOverrides(mapped, {
                  providerLabel: this.listProviderLabel || undefined,
                  offeringTypeLabel: this.listAssetTypeLabel || undefined,
                });
                void this.resolveAndEnrichOfferPolicies(offerId, mapped.title);
              },
            }),
            catchError(() => {
              this.errorMessageKey = 'offers.detail.errorLoadFailed';
              return EMPTY;
            }),
            finalize(() => {
              this.loading = false;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  openPolicyModal(): void {
    const policyId = this.contractPolicyId().trim();
    const licenseUrl = this.vm?.licenseUrl?.trim();
    if (!policyId && !licenseUrl) {
      return;
    }

    this.modalAndAlertService.openModal(
      PolicyDetailModalComponent,
      {
        policyId,
        policyName: this.contractPolicyName(),
        licenseUrl: licenseUrl || undefined,
      },
      { closed: () => this.modalAndAlertService.closeModal() },
      true,
    );
  }

  openPublicationPolicyModal(): void {
    const policyId = this.publicationPolicyId().trim();
    const licenseUrl = this.vm?.licenseUrl?.trim();
    if (!policyId && !licenseUrl) {
      return;
    }

    this.modalAndAlertService.openModal(
      PolicyDetailModalComponent,
      {
        policyId,
        policyName: this.publicationPolicyName(),
        licenseUrl: licenseUrl || undefined,
      },
      { closed: () => this.modalAndAlertService.closeModal() },
      true,
    );
  }

  openRevokeConfirmDialog(): void {
    const offerId = this.routeOfferId().trim();
    if (!offerId || this.deleteInProgress) {
      return;
    }
    this.revokeConfirmDialog?.nativeElement.showModal();
  }

  closeRevokeConfirmDialog(): void {
    this.revokeConfirmDialog?.nativeElement.close();
  }

  async executeRevokeConfirmed(): Promise<void> {
    const offerId = this.routeOfferId().trim();
    if (!offerId || this.useContractMocks() || this.deleteInProgress) {
      return;
    }
    this.deleteInProgress = true;
    this.errorMessageKey = undefined;
    try {
      await firstValueFrom(this.sdToolingService.resourceDescriptionsRevoke(offerId));
      this.closeRevokeConfirmDialog();
      // Repopulate the assets cache with only the SD-matched subset (mirrors the publish flow);
      // calling refreshAssetsCache() here would overwrite the cache with every connector asset.
      await this.sdMatchedAssetsWarmup.run({ trigger: 'offer-revoke' });
      await this.router.navigate(['/contract-definitions']);
    } catch {
      this.errorMessageKey = 'offers.detail.deleteFailed';
      this.closeRevokeConfirmDialog();
    } finally {
      this.deleteInProgress = false;
    }
  }

  private async resolveAndEnrichOfferPolicies(offerId: string, vmTitle: string): Promise<void> {
    let contractPolicyId = this.contractPolicyId().trim();
    let publicationPolicyId = this.publicationPolicyId().trim();
    let assetDisplayName = this.listAssetDisplayName || vmTitle.trim();

    if (!contractPolicyId || !publicationPolicyId) {
      const snapshot = await this.assetService.getAssetsCacheSnapshotOrLoad();
      const resolved = resolveOfferContractPolicyFromAssets(snapshot?.data ?? [], offerId);
      if (resolved) {
        if (!contractPolicyId) {
          contractPolicyId = resolved.contractPolicyId;
          this.contractPolicyId.set(contractPolicyId);
        }
        if (!publicationPolicyId) {
          publicationPolicyId = resolved.accessPolicyId;
          this.publicationPolicyId.set(publicationPolicyId);
        }
        if (!this.listAssetDisplayName) {
          assetDisplayName = resolved.assetDisplayName;
        }
      }
    }

    await Promise.all([
      this.enrichContractPolicyName(contractPolicyId, assetDisplayName),
      // Resolve the provider label independently: when navigating from a card the policy name is
      // pre-filled, so enrichContractPolicyName short-circuits and would otherwise skip this.
      this.applyProviderLabelFromPolicy(contractPolicyId),
      this.enrichPublicationPolicyName(publicationPolicyId, assetDisplayName),
    ]);
  }

  private async enrichContractPolicyName(policyId: string, assetDisplayName: string): Promise<void> {
    if (!policyId) {
      return;
    }

    const pendingLabel = this.translate.instant('policies.list.pending');
    const currentName = this.contractPolicyName().trim();
    if (currentName && currentName !== pendingLabel && !this.contractPolicyNameLoading()) {
      return;
    }

    this.contractPolicyNameLoading.set(true);
    try {
      const name = await this.policyListEnrichment.enrichSingleContractPolicyName(
        policyId,
        assetDisplayName,
        this.translate,
      );
      this.contractPolicyName.set(name);
    } finally {
      this.contractPolicyNameLoading.set(false);
    }
  }

  private async applyProviderLabelFromPolicy(policyId: string): Promise<void> {
    const assigner = await this.policyListEnrichment.resolvePolicyAssigner(policyId);
    if (!assigner || !this.vm) {
      return;
    }
    // assigner normally comes as a uid/DID; resolve it to the participant's display name.
    const providerLabel = await this.participantNameService.getName(assigner);
    if (!this.vm) {
      return;
    }
    this.vm = { ...this.vm, providerLabel: providerLabel || assigner };
  }

  private async enrichPublicationPolicyName(policyId: string, assetDisplayName: string): Promise<void> {
    if (!policyId) {
      return;
    }

    const pendingLabel = this.translate.instant('policies.list.pending');
    const currentName = this.publicationPolicyName().trim();
    if (currentName && currentName !== pendingLabel && !this.publicationPolicyNameLoading()) {
      return;
    }

    this.publicationPolicyNameLoading.set(true);
    try {
      const name = await this.policyListEnrichment.enrichSinglePolicyName(
        policyId,
        assetDisplayName,
        'Publicación',
        this.translate,
      );
      this.publicationPolicyName.set(name);
    } finally {
      this.publicationPolicyNameLoading.set(false);
    }
  }
}
