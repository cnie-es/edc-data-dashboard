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

import { Component, ViewChild, computed, inject, type OnDestroy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import { BehaviorSubject, debounceTime, distinctUntilChanged, map, Subject, switchMap, takeUntil } from 'rxjs';
import type { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { DashboardStateService, SdMatchedAssetsWarmupService, useFixtureMocks } from '@eclipse-edc/dashboard-core';
import { AssetService } from '@eclipse-edc/dashboard-core/assets';
import { PolicyListEnrichmentService } from '@eclipse-edc/dashboard-core/policies';
import { ContractDefinitionsToolbarComponent } from './components/contract-definitions-toolbar.component';
import { ContractDefinitionsFilterBarComponent } from './components/contract-definitions-filter-bar.component';
import {
  ContractDefinitionsFiltersModalComponent,
  type FilterSelectionChangeEvent,
} from './components/contract-definitions-filters-modal.component';
import { ContractDefinitionsGridComponent } from './components/contract-definitions-grid.component';
import type { OfferCardViewModel } from '../offer-card-view-model';
import { buildOfferCardViewModelsFromAssets } from '../offer-card-from-asset.mapper';
import { MockOfferResourcesService } from '../mock-offer-resources.service';
import {
  FILTER_CATEGORY_LABELS,
  PRICE_FILTER_OPTIONS,
  VISIBILITY_FILTER_OPTIONS,
  type AppliedFilterChip,
  type FilterCategory,
  type FilterOption,
  type PriceFilter,
  type VisibilityFilter,
} from '../contract-definitions-ui.constants';
import {
  applyOfferListFilters,
  assetTypeFilterLabel,
  buildAssetTypeOptionsFromCards,
  priceFilterLabel,
  sortOfferCards,
  visibilityFilterLabel,
  type OfferListSort,
} from '../offer-list-filter.util';

function pageCardSignature(cards: OfferCardViewModel[]): string {
  return cards.map(card => card.id).join('|');
}

@Component({
  selector: 'lib-contract-definitions-view',
  imports: [
    AsyncPipe,
    ContractDefinitionsToolbarComponent,
    ContractDefinitionsFilterBarComponent,
    ContractDefinitionsFiltersModalComponent,
    ContractDefinitionsGridComponent,
  ],
  templateUrl: './contract-definitions-view.component.html',
  standalone: true,
})
export class ContractDefinitionsViewComponent implements OnDestroy {
  private readonly assetService = inject(AssetService);
  private readonly assetsWarmup = inject(SdMatchedAssetsWarmupService);
  private readonly stateService = inject(DashboardStateService);
  private readonly enrichmentService = inject(PolicyListEnrichmentService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly mockOfferResources = inject(MockOfferResourcesService);

  private readonly currentEdcConfig = toSignal(this.stateService.currentEdcConfig$, {
    initialValue: undefined,
  });
  private readonly useFixtureMocksNow = computed(() => useFixtureMocks(this.currentEdcConfig()));

  private readonly destroy$ = new Subject<void>();
  private readonly searchInput$ = new Subject<string>();
  private readonly pageEnrich$ = new Subject<OfferCardViewModel[]>();
  private readonly cardsSubject = new BehaviorSubject<OfferCardViewModel[]>([]);
  private readonly filteredCardsSubject = new BehaviorSubject<OfferCardViewModel[]>([]);
  private readonly pageCardsSubject = new BehaviorSubject<OfferCardViewModel[]>([]);

  contractDefinitions$: Observable<OfferCardViewModel[]> = this.cardsSubject.asObservable();
  filteredContractDefinitions$: Observable<OfferCardViewModel[]> = this.filteredCardsSubject.asObservable();
  pageContractDefinitions$: Observable<OfferCardViewModel[]> = this.pageCardsSubject.asObservable();

  private allCards: OfferCardViewModel[] = [];
  private backgroundEnrichmentToken = 0;

  fetched = false;
  readonly pageItemCount = 6;
  itsPublic = true;
  currentSearchText = '';
  selectedSort: OfferListSort = 'title';
  assetTypeOptions: FilterOption[] = [];
  readonly visibilityOptions = VISIBILITY_FILTER_OPTIONS;
  readonly priceOptions = PRICE_FILTER_OPTIONS;

  private draftAssetTypes = new Set<string>();
  private draftVisibility: VisibilityFilter = 'all';
  private draftPrice: PriceFilter = 'all';
  private appliedAssetTypes = new Set<string>();
  private appliedVisibility: VisibilityFilter = 'all';
  private appliedPrice: PriceFilter = 'all';

  @ViewChild(ContractDefinitionsFiltersModalComponent)
  private filtersModal?: ContractDefinitionsFiltersModalComponent;

  constructor() {
    this.setupPageEnrichment();

    this.stateService.currentEdcConfig$.pipe(takeUntil(this.destroy$)).subscribe(config => {
      this.enrichmentService.setEdcConfig(config);
      this.enrichmentService.clearCache();
      void this.reloadOfferCards();
    });

    this.searchInput$
      .pipe(debounceTime(450), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(searchText => {
        this.currentSearchText = searchText;
        this.publishFilteredAndPage(true);
      });

    this.translate.onLangChange.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.relabelVisiblePolicies();
    });
  }

  fetchContractDefinitions(searchTitle = '') {
    this.currentSearchText = searchTitle;
    void this.reloadOfferCards();
  }

  filter(searchText: string) {
    this.searchInput$.next(searchText.trim());
  }

  paginationEvent(pageItems: OfferCardViewModel[]) {
    this.pageCardsSubject.next(pageItems);
    this.queuePageEnrichment(pageItems);
  }

  sortChanged(sortValue: string) {
    if (sortValue === 'newest' || sortValue === 'title' || sortValue === 'type') {
      this.selectedSort = sortValue;
      this.publishFilteredAndPage(false);
    }
  }

  openDetails(offerCard: OfferCardViewModel) {
    const offerId = offerCard.offerSelfDescriptionId?.trim();
    if (!offerId) {
      return;
    }
    void this.router.navigate(['/contract-definitions/offer', offerId], {
      state: {
        publishedAtIso: offerCard.publishedAt,
        contractDefinitionId: offerCard.id,
        assetTypeLabel: offerCard.subtitle,
        contractPolicyId: offerCard.contractPolicyId,
        accessPolicyId: offerCard.accessPolicyId,
        assetDisplayName: offerCard.assetDisplayName,
        policySummary: offerCard.policySummary,
        providerLabel: offerCard.providerLabel,
      },
    });
  }

  createContractDefinition() {
    this.router.navigate(['/contract-definitions/new']);
  }

  togglePublicCatalog() {
    this.itsPublic = !this.itsPublic;
  }

  openFiltersModal() {
    this.draftAssetTypes = new Set(this.appliedAssetTypes);
    this.draftVisibility = this.appliedVisibility;
    this.draftPrice = this.appliedPrice;
    this.filtersModal?.open();
  }

  closeFiltersModal() {
    this.filtersModal?.close();
  }

  toggleFilterSelection({ value, checked }: FilterSelectionChangeEvent) {
    if (checked) {
      this.draftAssetTypes.add(value);
    } else {
      this.draftAssetTypes.delete(value);
    }
  }

  draftVisibilityChanged(value: VisibilityFilter) {
    this.draftVisibility = value;
  }

  draftPriceChanged(value: PriceFilter) {
    this.draftPrice = value;
  }

  applyFilters() {
    this.appliedAssetTypes = new Set(this.draftAssetTypes);
    this.appliedVisibility = this.draftVisibility;
    this.appliedPrice = this.draftPrice;
    this.closeFiltersModal();
    this.publishFilteredAndPage(true);
  }

  clearSingleFilterChip(category: FilterCategory, value: string) {
    if (category === 'assetType') {
      this.appliedAssetTypes.delete(value);
      this.appliedAssetTypes = new Set(this.appliedAssetTypes);
    } else if (category === 'visibility') {
      this.appliedVisibility = 'all';
    } else if (category === 'price') {
      this.appliedPrice = 'all';
    }
    this.publishFilteredAndPage(true);
  }

  get selectedAssetTypeDraftValues(): string[] {
    return [...this.draftAssetTypes];
  }

  get selectedVisibilityDraft(): VisibilityFilter {
    return this.draftVisibility;
  }

  get selectedPriceDraft(): PriceFilter {
    return this.draftPrice;
  }

  get appliedFilterChips(): AppliedFilterChip[] {
    const chips: AppliedFilterChip[] = [];

    for (const value of this.appliedAssetTypes) {
      chips.push({
        category: 'assetType',
        value,
        categoryLabel: FILTER_CATEGORY_LABELS.assetType,
        label: assetTypeFilterLabel(value),
      });
    }

    if (this.appliedVisibility !== 'all') {
      chips.push({
        category: 'visibility',
        value: this.appliedVisibility,
        categoryLabel: FILTER_CATEGORY_LABELS.visibility,
        label: visibilityFilterLabel(this.appliedVisibility),
      });
    }

    if (this.appliedPrice !== 'all') {
      chips.push({
        category: 'price',
        value: this.appliedPrice,
        categoryLabel: FILTER_CATEGORY_LABELS.price,
        label: priceFilterLabel(this.appliedPrice),
      });
    }

    return chips;
  }

  goHome() {
    this.router.navigate(['/home']);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupPageEnrichment(): void {
    this.pageEnrich$
      .pipe(
        debounceTime(300),
        map(pageCards => ({ pageCards, sig: pageCardSignature(pageCards) })),
        distinctUntilChanged((a, b) => a.sig === b.sig),
        switchMap(({ pageCards }) => {
          const snapshot = pageCards.map(card => card);
          this.stampPendingPolicyLabels(snapshot);
          return this.enrichmentService
            .enrichOfferCardPolicyNames(snapshot, this.translate)
            .then(() => snapshot)
            .catch(() => snapshot);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(enriched => {
        this.mergeEnrichedCards(enriched);
        void this.enrichBackgroundPolicies();
      });
  }

  private async reloadOfferCards(): Promise<void> {
    this.backgroundEnrichmentToken++;
    this.fetched = false;
    this.cardsSubject.next([]);
    this.filteredCardsSubject.next([]);
    this.pageCardsSubject.next([]);

    const connectorName = this.currentEdcConfig()?.connectorName;

    try {
      if (this.useFixtureMocksNow()) {
        this.setCards(await this.buildOfferCardsFromCacheSource(connectorName));
        return;
      }

      // Re-run the SD-matched warmup on entry so newly published offers show up immediately. This runs
      // once per view load (only the currentEdcConfig$ subscription calls reloadOfferCards); pagination,
      // search and sort never do. We warm up first and then publish the cards a single time, so the list
      // is not re-emitted mid-interaction (a late second emit would reset pagination back to page 1).
      try {
        await this.assetsWarmup.run({ trigger: 'offers-view' });
      } catch {
        /* Fall back to whatever is already cached if the warmup fails. */
      }

      const snapshot = await this.assetService.getAssetsCacheSnapshotOrLoad();
      this.setCards(buildOfferCardViewModelsFromAssets(snapshot?.data ?? [], connectorName));
    } catch {
      this.setCards([]);
    } finally {
      this.fetched = true;
    }
  }

  private setCards(cards: OfferCardViewModel[]): void {
    this.allCards = cards;
    this.assetTypeOptions = buildAssetTypeOptionsFromCards(cards);
    this.cardsSubject.next(cards);
    this.publishFilteredAndPage(true);
  }

  private publishFilteredAndPage(enqueueEnrichment: boolean): void {
    this.backgroundEnrichmentToken++;

    const filtered = sortOfferCards(
      applyOfferListFilters(this.allCards, {
        searchText: this.currentSearchText,
        assetTypes: this.appliedAssetTypes,
        visibility: this.appliedVisibility,
        price: this.appliedPrice,
      }),
      this.selectedSort,
    );

    this.filteredCardsSubject.next(filtered);
    const page = filtered.slice(0, this.pageItemCount);
    this.pageCardsSubject.next(page);

    if (enqueueEnrichment) {
      this.queuePageEnrichment(page);
    }
  }

  private queuePageEnrichment(page: OfferCardViewModel[]): void {
    this.pageEnrich$.next(page);
  }

  private async enrichBackgroundPolicies(): Promise<void> {
    const token = ++this.backgroundEnrichmentToken;
    const pageIds = new Set(this.pageCardsSubject.value.map(card => card.id));
    const pending = this.allCards.filter(
      card =>
        !pageIds.has(card.id) &&
        card.contractPolicyId.trim().length > 0 &&
        (card.policyEnrichmentStatus === 'idle' || card.policyEnrichmentStatus === 'error'),
    );

    for (let i = 0; i < pending.length; i += this.pageItemCount) {
      if (token !== this.backgroundEnrichmentToken) {
        return;
      }
      const batch = pending.slice(i, i + this.pageItemCount).map(card => card);
      this.stampPendingPolicyLabels(batch);
      await this.enrichmentService.enrichOfferCardPolicyNames(batch, this.translate).catch(() => undefined);
      if (token !== this.backgroundEnrichmentToken) {
        return;
      }
      this.mergeEnrichedCards(batch);
    }
  }

  private mergeEnrichedCards(enriched: OfferCardViewModel[]): void {
    const byId = new Map(enriched.map(card => [card.id, card]));
    const applyUpdate = (card: OfferCardViewModel): void => {
      const updated = byId.get(card.id);
      if (!updated) {
        return;
      }
      card.policySummary = updated.policySummary;
      card.providerLabel = updated.providerLabel;
      card.policyEnrichmentStatus = updated.policyEnrichmentStatus;
    };

    for (const card of this.allCards) {
      applyUpdate(card);
    }
    for (const card of this.filteredCardsSubject.value) {
      applyUpdate(card);
    }
    for (const card of this.pageCardsSubject.value) {
      applyUpdate(card);
    }

    this.cardsSubject.next([...this.allCards]);
    this.filteredCardsSubject.next([...this.filteredCardsSubject.value]);
    this.pageCardsSubject.next([...this.pageCardsSubject.value]);
  }

  private async buildOfferCardsFromCacheSource(connectorName: string | undefined): Promise<OfferCardViewModel[]> {
    const rawAssets = this.useFixtureMocksNow()
      ? await this.mockOfferResources.ensureLoaded().then(() => this.mockOfferResources.getMockAssets())
      : ((await this.assetService.getAssetsCacheSnapshotOrLoad())?.data ?? []);
    const cards = buildOfferCardViewModelsFromAssets(rawAssets, connectorName);

    if (this.useFixtureMocksNow()) {
      for (const card of cards) {
        card.policyEnrichmentStatus = 'ready';
        if (!card.policySummary.trim()) {
          card.policySummary = '-';
        }
      }
    }

    return cards;
  }

  private stampPendingPolicyLabels(cards: OfferCardViewModel[]): void {
    const pending = this.translate.instant('policies.list.pending');
    for (const card of cards) {
      if (!card.contractPolicyId.trim()) {
        card.policySummary = '-';
        card.policyEnrichmentStatus = 'ready';
        continue;
      }
      if (card.policyEnrichmentStatus === 'idle') {
        card.policySummary = pending;
        // card.providerLabel = pending;
      }
    }
  }

  private relabelVisiblePolicies(): void {
    const page = this.pageCardsSubject.value;
    if (page.length === 0) {
      return;
    }
    this.stampPendingPolicyLabels(page);
    this.enrichmentService.relabelOfferCards(page, this.translate);
    const needsFetch = page.some(
      card =>
        card.contractPolicyId.trim() &&
        (card.policyEnrichmentStatus === 'idle' || card.policyEnrichmentStatus === 'loading'),
    );
    this.pageCardsSubject.next([...page]);
    if (needsFetch) {
      this.queuePageEnrichment(page);
    }
  }
}
