import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { AdvancedSearchStateService } from '../../../xfsc-advSearch/src/advanced-search-state.service';
import { SelfDescriptor } from '../../../xfsc-advSearch/src/sd-card/sd-card.component';
import { SdListComponent } from '../../../xfsc-advSearch/src/sd-list/sd-list.component';
import type { ComponentFixture } from '@angular/core/testing';

class MockAdvancedSearchStateService {
  readonly resultsSubject = new BehaviorSubject<SelfDescriptor[]>([]);
  readonly loadingSubject = new BehaviorSubject<boolean>(false);
  readonly errorSubject = new BehaviorSubject<string | undefined>(undefined);
  readonly hasCompletedSearchSubject = new BehaviorSubject<boolean>(false);

  readonly results$ = this.resultsSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();
  readonly hasCompletedSearch$ = this.hasCompletedSearchSubject.asObservable();

  searchSimple = jasmine.createSpy('searchSimple');
  searchAdvanced = jasmine.createSpy('searchAdvanced');
  clearResults = jasmine.createSpy('clearResults');
}

describe('SdListComponent (XFSC)', () => {
  let fixture: ComponentFixture<SdListComponent>;
  let state: MockAdvancedSearchStateService;
  let router: Router;

  beforeEach(async () => {
    state = new MockAdvancedSearchStateService();

    await TestBed.configureTestingModule({
      imports: [SdListComponent, TranslateModule.forRoot()],
      providers: [provideRouter([]), { provide: AdvancedSearchStateService, useValue: state }],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      catalog: {
        searchPrompt: 'USE_SEARCH_PROMPT',
        noSearchResults: 'NO_SEARCH_RESULTS',
      },
    });
    translate.use('en');

    fixture = TestBed.createComponent(SdListComponent);
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

  it('should render list items from state and run simple search only on button click', () => {
    const sd1 = new SelfDescriptor('sd-1', ['did:web:test:sd-1'], 'First SD', 'desc 1', 'en', undefined);
    const sd2 = new SelfDescriptor('sd-2', ['did:web:test:sd-2'], 'Second SD', 'desc 2', 'en', undefined);

    fixture.detectChanges();

    expect(state.searchSimple).not.toHaveBeenCalled();

    fixture.componentInstance.executeSimpleSearch();
    expect(state.searchSimple).toHaveBeenCalledWith('');

    state.resultsSubject.next([sd1, sd2]);
    fixture.detectChanges();

    const cards = fixture.debugElement.queryAll(By.css('lib-sd-card'));
    expect(cards.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('First SD');
    expect(fixture.nativeElement.textContent).toContain('Second SD');
  });

  it('should display loading and error states from shared state', () => {
    fixture.detectChanges();

    state.loadingSubject.next(true);
    state.resultsSubject.next([]);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.loading-bars'))).toBeTruthy();

    state.loadingSubject.next(false);
    state.errorSubject.next('Forbidden (403)');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Forbidden (403)');
  });

  it('should show a visible View details button on each card', () => {
    const sd = new SelfDescriptor('sd-1', ['did:web:test:sd-1'], 'First SD', 'desc 1', 'en', undefined);
    fixture.detectChanges();

    state.resultsSubject.next([sd]);
    fixture.detectChanges();

    const detailButtons = fixture.debugElement.queryAll(By.css('button[aria-label^="View details for"]'));
    expect(detailButtons.length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('View details');
  });

  it('should navigate to details page when opening details', () => {
    const sd = new SelfDescriptor(
      'did:web:registry.gaia-x.eu:DataOffering:test-id',
      ['did:web:registry.gaia-x.eu:DataOffering:test-id'],
      'First SD',
      'desc 1',
      'en',
      undefined,
    );
    fixture.detectChanges();
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    fixture.componentInstance.openDetails(sd);

    expect(navigateSpy).toHaveBeenCalledWith(
      ['/xfsc-advsearch', 'self-descriptions', 'did:web:registry.gaia-x.eu:DataOffering:test-id'],
      {
        state: { sd },
      },
    );
  });
});
