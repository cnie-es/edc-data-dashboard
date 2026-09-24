import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { OwnOfferSelfDescriptionsService } from '@eclipse-edc/dashboard-core';
import type { OfferCardViewModel } from '@eclipse-edc/dashboard-core/contract-definitions';
import { AdvancedSearchStateService, type SelfDescriptorModel } from '@eclipse-edc/dashboard-core/xfsc-advSearch';
import { CatalogOfferCardEnrichmentService } from '../catalog-offer-card-enrichment.service';
import { CatalogOfferSearchListComponent } from './catalog-offer-search-list.component';
import type { ComponentFixture } from '@angular/core/testing';

class MockAdvancedSearchStateService {
  readonly resultsSubject = new BehaviorSubject<SelfDescriptorModel[]>([]);
  readonly loadingSubject = new BehaviorSubject<boolean>(false);
  readonly errorSubject = new BehaviorSubject<string | undefined>(undefined);
  readonly hasCompletedSearchSubject = new BehaviorSubject<boolean>(false);
  readonly totalCountSubject = new BehaviorSubject<number>(0);
  readonly currentPageSubject = new BehaviorSubject<number>(1);

  readonly results$ = this.resultsSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();
  readonly hasCompletedSearch$ = this.hasCompletedSearchSubject.asObservable();
  readonly totalCount$ = this.totalCountSubject.asObservable();
  readonly currentPage$ = this.currentPageSubject.asObservable();

  searchSimple = jasmine.createSpy('searchSimple');
  goToPage = jasmine.createSpy('goToPage');
}

class MockCatalogOfferCardEnrichmentService {
  enrichPage = jasmine.createSpy('enrichPage').and.callFake(async (summaries: SelfDescriptorModel[]) =>
    summaries.map(
      (s, i): OfferCardViewModel =>
        ({
          id: s.selfDescriptionId,
          offerSelfDescriptionId: s.selfDescriptionId,
          title: s.name,
          providerLabel: 'provider',
          subtitle: 'data',
          description: s.description,
          publishedAt: '',
          assetDisplayName: s.name,
          policySummary: 'policy',
          policyEnrichmentStatus: 'ready',
          priceLabel: 'Gratuito',
          statusBadge: 'Cat. Público',
          keywords: [],
          license: { title: '', spdx: '', url: '' },
          accessPolicyId: '',
          contractPolicyId: '',
          assetsSelector: [],
          contractDefinition: {} as OfferCardViewModel['contractDefinition'],
          assetTypeKey: 'corpus',
          isPublicOffering: true,
          isFreeOffering: true,
        }) as OfferCardViewModel,
    ),
  );

  buildLoadingPlaceholders = jasmine
    .createSpy('buildLoadingPlaceholders')
    .and.callFake((summaries: SelfDescriptorModel[]) =>
      summaries.map(
        (s): OfferCardViewModel =>
          ({
            id: s.selfDescriptionId,
            offerSelfDescriptionId: s.selfDescriptionId,
            title: s.name,
            policyEnrichmentStatus: 'loading',
          }) as OfferCardViewModel,
      ),
    );

  clearCache = jasmine.createSpy('clearCache');
}

class MockOwnOfferSelfDescriptionsService {
  ownIds = new Set<string>();
  getOwnSelfDescriptionIds = jasmine
    .createSpy('getOwnSelfDescriptionIds')
    .and.callFake(async (): Promise<ReadonlySet<string>> => this.ownIds);
}

describe('CatalogOfferSearchListComponent', () => {
  let fixture: ComponentFixture<CatalogOfferSearchListComponent>;
  let state: MockAdvancedSearchStateService;
  let enrichment: MockCatalogOfferCardEnrichmentService;
  let ownOffers: MockOwnOfferSelfDescriptionsService;
  let router: Router;

  const makeSummary = (id: string, name: string): SelfDescriptorModel => ({
    selfDescriptionId: id,
    claimsGraphUri0: [id],
    name,
    description: 'desc',
    inLanguage: 'en',
  });

  beforeEach(async () => {
    state = new MockAdvancedSearchStateService();
    enrichment = new MockCatalogOfferCardEnrichmentService();
    ownOffers = new MockOwnOfferSelfDescriptionsService();

    await TestBed.configureTestingModule({
      imports: [CatalogOfferSearchListComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: AdvancedSearchStateService, useValue: state },
        { provide: CatalogOfferCardEnrichmentService, useValue: enrichment },
        { provide: OwnOfferSelfDescriptionsService, useValue: ownOffers },
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      catalog: {
        searchPrompt: 'USE_SEARCH_PROMPT',
        noSearchResults: 'NO_SEARCH_RESULTS',
      },
    });
    translate.use('en');

    fixture = TestBed.createComponent(CatalogOfferSearchListComponent);
    router = TestBed.inject(Router);
  });

  it('should show search prompt when empty and no search has completed yet', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('USE_SEARCH_PROMPT');
  });

  it('should show no-results message when empty after a completed search', () => {
    state.hasCompletedSearchSubject.next(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('NO_SEARCH_RESULTS');
  });

  it('should run simple search only on button click', () => {
    fixture.detectChanges();
    expect(state.searchSimple).not.toHaveBeenCalled();

    fixture.componentInstance.executeSimpleSearch();
    expect(state.searchSimple).toHaveBeenCalledWith('');
  });

  it('should enrich the current (server-paginated) page of results as-is', async () => {
    const summaries = Array.from({ length: 5 }, (_, i) => makeSummary(`did:web:test:sd-${i}`, `Offer ${i}`));
    fixture.detectChanges();

    state.resultsSubject.next(summaries);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(enrichment.clearCache).toHaveBeenCalled();
    expect(enrichment.buildLoadingPlaceholders).toHaveBeenCalledWith(summaries);
    expect(enrichment.enrichPage).toHaveBeenCalledWith(summaries);
    expect(fixture.componentInstance.pageCards.length).toBe(5);

    const cards = fixture.debugElement.queryAll(By.css('lib-contract-definition-card'));
    expect(cards.length).toBe(5);
    expect(fixture.nativeElement.textContent).toContain('Offer 0');
  });

  it('should request the corresponding page from the state service on pageChange', () => {
    state.resultsSubject.next([makeSummary('did:web:test:sd-0', 'Offer 0')]);
    state.totalCountSubject.next(40);
    fixture.detectChanges();

    fixture.componentInstance.onPageChange(1);

    expect(state.goToPage).toHaveBeenCalledWith(2);
  });

  it('should navigate to catalog detail when opening details', () => {
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    const offerCard = {
      offerSelfDescriptionId: 'did:web:registry.example:offer-1',
    } as OfferCardViewModel;

    state.resultsSubject.next([makeSummary('did:web:registry.example:offer-1', 'First SD')]);
    fixture.detectChanges();

    fixture.componentInstance.openDetails(offerCard);

    expect(navigateSpy).toHaveBeenCalledWith(
      ['/xfsc-advsearch', 'self-descriptions', 'did:web:registry.example:offer-1'],
      jasmine.objectContaining({
        state: jasmine.objectContaining({ sd: jasmine.any(Object) }),
      }),
    );
  });
});
