import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of, Subject, throwError } from 'rxjs';
import { AdvancedSearchStateService } from './advanced-search-state.service';
import { SimplAdvancedSearchService, type SearchResult } from './advanced-search.service';

describe('AdvancedSearchStateService', () => {
  let service: AdvancedSearchStateService;
  let api: jasmine.SpyObj<SimplAdvancedSearchService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<SimplAdvancedSearchService>('SimplAdvancedSearchService', [
      'simpleSearchSD',
      'advancedSearchSD',
    ]);

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [AdvancedSearchStateService, { provide: SimplAdvancedSearchService, useValue: api }],
    });

    service = TestBed.inject(AdvancedSearchStateService);
  });

  it('should expose hasCompletedSearch false until a search finishes, then true', () => {
    const flags: boolean[] = [];
    service.hasCompletedSearch$.subscribe(v => flags.push(v));
    expect(flags[flags.length - 1]).toBe(false);

    api.simpleSearchSD.and.returnValue(of({ items: [] }));
    service.searchSimple('q');
    expect(flags[flags.length - 1]).toBe(true);
  });

  it('should reset hasCompletedSearch to false on clearResults', () => {
    api.simpleSearchSD.and.returnValue(of({ items: [] }));
    service.searchSimple('q');

    let last = false;
    service.hasCompletedSearch$.subscribe(v => (last = v));
    expect(last).toBe(true);

    service.clearResults();
    service.hasCompletedSearch$.subscribe(v => (last = v));
    expect(last).toBe(false);
  });

  it('should set hasCompletedSearch true when search fails', () => {
    api.simpleSearchSD.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 500,
            statusText: 'Error',
          }),
      ),
    );

    const flags: boolean[] = [];
    service.hasCompletedSearch$.subscribe(v => flags.push(v));
    service.searchSimple('fail');
    expect(flags[flags.length - 1]).toBe(true);
  });

  it('should map simple search results into SelfDescriptor list', () => {
    const response: SearchResult = {
      items: [
        {
          n: {
            claimsGraphUri: ['did:web:test:sd-1'],
            name: 'SD 1',
            description: 'desc',
            inLanguage: 'en',
            serviceAccessPoint: 'https://test.example',
          },
        },
      ],
    };
    api.simpleSearchSD.and.returnValue(of(response));

    service.searchSimple('test');

    service.results$.subscribe(results => {
      expect(results.length).toBe(1);
      expect(results[0].selfDescriptionId).toBe('did:web:test:sd-1');
      expect(results[0].name).toBe('SD 1');
    });
  });

  it('should map advanced search results into SelfDescriptor list', () => {
    const response: SearchResult = {
      items: [
        {
          n: {
            claimsGraphUri: ['did:web:test:advanced-sd-1'],
            name: 'Advanced SD 1',
            description: 'desc',
            inLanguage: 'en',
            serviceAccessPoint: 'https://test.example',
          },
        },
      ],
    };
    api.advancedSearchSD.and.returnValue(of(response));

    service.searchAdvanced({
      'simpl:OfferingPrice': {
        '@type': 'simpl:offeringPrice',
        priceType: 'free',
      },
    });

    service.results$.subscribe(results => {
      expect(results.length).toBe(1);
      expect(results[0].selfDescriptionId).toBe('did:web:test:advanced-sd-1');
      expect(results[0].name).toBe('Advanced SD 1');
    });
  });

  it('should keep compatibility with legacy flat simple-search payload', () => {
    const response: SearchResult = {
      items: [
        {
          claimsGraphUri0: ['did:web:test:legacy-sd'],
          name: 'Legacy SD',
          description: 'legacy',
          inLanguage: 'en',
        },
      ],
    };
    api.simpleSearchSD.and.returnValue(of(response));

    service.searchSimple('legacy');

    service.results$.subscribe(results => {
      expect(results.length).toBe(1);
      expect(results[0].selfDescriptionId).toBe('did:web:test:legacy-sd');
      expect(results[0].name).toBe('Legacy SD');
    });
  });

  it('should map 403 into a user-friendly auth error', () => {
    api.simpleSearchSD.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 403,
            statusText: 'Forbidden',
          }),
      ),
    );

    service.searchSimple('forbidden');

    service.error$.subscribe(error => {
      expect(error).toBe(TestBed.inject(TranslateService).instant('common.errors.http.forbidden'));
    });
  });

  it('should map unknown errors to generic message', () => {
    api.simpleSearchSD.and.returnValue(throwError(() => new Error('unexpected')));

    service.searchSimple('fail');

    service.error$.subscribe(error => {
      expect(error).toBe(TestBed.inject(TranslateService).instant('common.errors.generic'));
    });
  });

  it('should map 401 into a session-expired message', () => {
    api.simpleSearchSD.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 401,
            error: { message: 'Token expired' },
            statusText: 'Unauthorized',
          }),
      ),
    );

    service.searchSimple();

    service.error$.subscribe(error => {
      expect(error).toBe(TestBed.inject(TranslateService).instant('common.errors.http.sessionExpired'));
    });
  });

  it('should cancel previous in-flight search when a new one starts', () => {
    const first$ = new Subject<SearchResult>();
    const second$ = new Subject<SearchResult>();
    api.simpleSearchSD.and.returnValues(first$, second$);

    service.searchSimple('first');
    service.searchSimple('second');

    first$.next({
      items: [
        {
          n: {
            claimsGraphUri: ['did:web:test:first'],
            name: 'first',
            description: '',
            inLanguage: 'en',
          },
        },
      ],
    });
    first$.complete();

    second$.next({
      items: [
        {
          n: {
            claimsGraphUri: ['did:web:test:second'],
            name: 'second',
            description: '',
            inLanguage: 'en',
          },
        },
      ],
    });
    second$.complete();

    service.results$.subscribe(results => {
      expect(results.length).toBe(1);
      expect(results[0].selfDescriptionId).toBe('did:web:test:second');
      expect(results[0].name).toBe('second');
    });
  });

  it('should capture totalCount from a search response', () => {
    api.simpleSearchSD.and.returnValue(of({ items: [], totalCount: 42 }));

    service.searchSimple('q');

    let totalCount = 0;
    service.totalCount$.subscribe(v => (totalCount = v));
    expect(totalCount).toBe(42);
  });

  it('should default totalCount to 0 when missing from the response', () => {
    api.simpleSearchSD.and.returnValue(of({ items: [] }));

    service.searchSimple('q');

    let totalCount = -1;
    service.totalCount$.subscribe(v => (totalCount = v));
    expect(totalCount).toBe(0);
  });

  it('should reset totalCount to 0 when a search fails', () => {
    api.simpleSearchSD.and.returnValue(of({ items: [], totalCount: 10 }));
    service.searchSimple('q');

    api.simpleSearchSD.and.returnValue(throwError(() => new Error('boom')));
    service.searchSimple('q2');

    let totalCount = -1;
    service.totalCount$.subscribe(v => (totalCount = v));
    expect(totalCount).toBe(0);
  });

  it('should default to page 1 and reset to page 1 on a new simple search', () => {
    api.simpleSearchSD.and.returnValue(of({ items: [] }));

    service.searchSimple('q');
    expect(api.simpleSearchSD).toHaveBeenCalledWith('q', { page: 1, pageSize: 20 });

    service.goToPage(3);
    expect(api.simpleSearchSD).toHaveBeenCalledWith('q', { page: 3, pageSize: 20 });

    let currentPage = 0;
    service.currentPage$.subscribe(v => (currentPage = v));
    expect(currentPage).toBe(3);

    service.searchSimple('q2');
    expect(api.simpleSearchSD).toHaveBeenCalledWith('q2', { page: 1, pageSize: 20 });
    service.currentPage$.subscribe(v => (currentPage = v));
    expect(currentPage).toBe(1);
  });

  it('should reuse the last query when going to another page', () => {
    api.simpleSearchSD.and.returnValue(of({ items: [] }));
    service.searchSimple('reused-query');

    service.goToPage(2);

    expect(api.simpleSearchSD).toHaveBeenCalledWith('reused-query', { page: 2, pageSize: 20 });
  });

  it('should ignore goToPage requests for a page below 1', () => {
    api.simpleSearchSD.and.returnValue(of({ items: [] }));
    service.searchSimple('q');
    api.simpleSearchSD.calls.reset();

    service.goToPage(0);

    expect(api.simpleSearchSD).not.toHaveBeenCalled();
  });

  it('should reset currentPage and totalCount on clearResults', () => {
    api.simpleSearchSD.and.returnValue(of({ items: [], totalCount: 15 }));
    service.searchSimple('q');
    service.goToPage(2);

    service.clearResults();

    let currentPage = 0;
    let totalCount = -1;
    service.currentPage$.subscribe(v => (currentPage = v));
    service.totalCount$.subscribe(v => (totalCount = v));
    expect(currentPage).toBe(1);
    expect(totalCount).toBe(0);
  });
});
