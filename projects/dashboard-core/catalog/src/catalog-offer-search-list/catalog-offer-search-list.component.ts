import { Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  FilterInputComponent,
  ListLoadingStateComponent,
  OwnOfferSelfDescriptionsService,
  PaginationComponent,
  isOwnSelfDescription,
} from '@eclipse-edc/dashboard-core';
import {
  ContractDefinitionCardComponent,
  type OfferCardViewModel,
} from '@eclipse-edc/dashboard-core/contract-definitions';
import { AdvancedSearchStateService, type SelfDescriptorModel } from '@eclipse-edc/dashboard-core/xfsc-advSearch';
import { CatalogOfferCardEnrichmentService } from '../catalog-offer-card-enrichment.service';
import type { OnDestroy, OnInit } from '@angular/core';

@Component({
  selector: 'lib-catalog-offer-search-list',
  standalone: true,
  imports: [
    FilterInputComponent,
    ListLoadingStateComponent,
    PaginationComponent,
    ContractDefinitionCardComponent,
    TranslateModule,
  ],
  templateUrl: './catalog-offer-search-list.component.html',
})
export class CatalogOfferSearchListComponent implements OnInit, OnDestroy {
  private readonly searchState = inject(AdvancedSearchStateService);
  private readonly enrichment = inject(CatalogOfferCardEnrichmentService);
  private readonly ownOffers = inject(OwnOfferSelfDescriptionsService);
  private readonly router = inject(Router);

  readonly pageSize = 20;

  searchSummaries: SelfDescriptorModel[] = [];
  pageCards: OfferCardViewModel[] = [];

  loading = false;
  errorMessage: string | undefined;
  pendingSimpleQuery = '';
  hasCompletedSearch = false;
  totalCount = 0;
  currentPageIndex = 0;

  private pageEnrichmentToken = 0;
  private ownSelfDescriptionIds: ReadonlySet<string> = new Set<string>();
  private readonly subscriptions = new Subscription();

  ngOnInit(): void {
    // Se resuelve al entrar, no al llegar los resultados: si esperase a estos, las ofertas propias
    // se pintarían un instante como contratables antes de apagarse.
    void this.loadOwnSelfDescriptionIds();

    this.subscriptions.add(
      this.searchState.results$.subscribe(results => {
        this.searchSummaries = results;
        this.enrichment.clearCache();
        this.onPageSummariesChange(results);
      }),
    );

    this.subscriptions.add(
      this.searchState.loading$.subscribe(isLoading => {
        this.loading = isLoading;
      }),
    );

    this.subscriptions.add(
      this.searchState.error$.subscribe(error => {
        this.errorMessage = error;
      }),
    );

    this.subscriptions.add(
      this.searchState.hasCompletedSearch$.subscribe(completed => {
        this.hasCompletedSearch = completed;
      }),
    );

    this.subscriptions.add(
      this.searchState.totalCount$.subscribe(totalCount => {
        this.totalCount = totalCount;
      }),
    );

    this.subscriptions.add(
      this.searchState.currentPage$.subscribe(currentPage => {
        this.currentPageIndex = currentPage - 1;
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  updateSimpleQuery(event: string): void {
    this.pendingSimpleQuery = event;
  }

  executeSimpleSearch(): void {
    this.searchState.searchSimple(this.pendingSimpleQuery);
  }

  onPageChange(page: number): void {
    this.searchState.goToPage(page + 1);
  }

  private onPageSummariesChange(pageSummaries: SelfDescriptorModel[]): void {
    const token = ++this.pageEnrichmentToken;
    this.pageCards = this.enrichment.buildLoadingPlaceholders(pageSummaries);
    void this.enrichPage(pageSummaries, token);
  }

  private async enrichPage(pageSummaries: SelfDescriptorModel[], token: number): Promise<void> {
    const enriched = await this.enrichment.enrichPage(pageSummaries);
    if (token === this.pageEnrichmentToken) {
      this.pageCards = enriched;
    }
  }

  /** La oferta la publica este conector: contratarla fallaría y su ficha ya está en Mis ofertas. */
  isOwnOffer(offerCard: OfferCardViewModel): boolean {
    return isOwnSelfDescription(this.ownSelfDescriptionIds, offerCard.offerSelfDescriptionId);
  }

  openDetails(offerCard: OfferCardViewModel): void {
    const sdId = offerCard.offerSelfDescriptionId?.trim();
    if (!sdId || this.isOwnOffer(offerCard)) {
      return;
    }
    const summary = this.searchSummaries.find(s => s.selfDescriptionId === sdId);
    void this.router.navigate(['/xfsc-advsearch', 'self-descriptions', sdId], {
      state: { sd: summary },
    });
  }

  private async loadOwnSelfDescriptionIds(): Promise<void> {
    this.ownSelfDescriptionIds = await this.ownOffers.getOwnSelfDescriptionIds();
  }
}
