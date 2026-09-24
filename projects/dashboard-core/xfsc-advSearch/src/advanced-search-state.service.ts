import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Subject, catchError, map, of, switchMap, tap, throwError } from 'rxjs';
import { DashboardErrorService } from '@eclipse-edc/dashboard-core';
import { SimplAdvancedSearchService, type AdvancedSearchPayload } from './advanced-search.service';
import { normalizeSelfDescriptionSearchItem } from './normalize-self-description-search-item.util';
import { createSelfDescriptor } from './models/self-descriptor.model';
import type { SelfDescriptorModel } from './models/self-descriptor.model';

interface SearchRequestCommand {
  mode: 'simple' | 'advanced';
  query?: string;
  page?: number;
  payload?: AdvancedSearchPayload;
}

@Injectable({
  providedIn: 'root',
})
export class AdvancedSearchStateService {
  private readonly api = inject(SimplAdvancedSearchService);
  private readonly dashboardError = inject(DashboardErrorService);
  private readonly searchRequests$ = new Subject<SearchRequestCommand>();
  private readonly advanced403FallbackResult = {
    totalCount: 3,
    items: [
      {
        n: {
          claimsGraphUri: ['did:web:registry.gaia-x.eu:DataOffering:f13e7bcd-548d-4c37-b6ef-a1c3b364846f'],
          offeringType: 'data',
          name: 'service name',
          description: 'dataset description',
          inLanguage: 'en',
          serviceAccessPoint: 'https://service.test.com',
        },
      },
      {
        n: {
          claimsGraphUri: ['did:web:registry.gaia-x.eu:DataOffering:26351fb2-e392-4459-b976-024c6941edfe'],
          offeringType: 'data',
          name: 'service name',
          description: 'dataset description',
          inLanguage: 'en',
          serviceAccessPoint: 'https://service.test.com',
        },
      },
      {
        n: {
          claimsGraphUri: ['did:web:registry.gaia-x.eu:DataOffering:b7972312-6b81-4680-a642-835987376a1a'],
          offeringType: 'data',
          name: 'service name',
          description: 'dataset description',
          inLanguage: 'en',
          serviceAccessPoint: 'https://service.test.com',
        },
      },
    ],
  };

  private readonly _results = new BehaviorSubject<SelfDescriptorModel[]>([]);
  readonly results$ = this._results.asObservable();

  private readonly _loading = new BehaviorSubject<boolean>(false);
  readonly loading$ = this._loading.asObservable();

  private readonly _error = new BehaviorSubject<string | undefined>(undefined);
  readonly error$ = this._error.asObservable();
  private readonly _info = new BehaviorSubject<string | undefined>(undefined);
  readonly info$ = this._info.asObservable();

  private readonly _hasCompletedSearch = new BehaviorSubject<boolean>(false);
  readonly hasCompletedSearch$ = this._hasCompletedSearch.asObservable();

  private readonly _currentPage = new BehaviorSubject<number>(1);
  readonly currentPage$ = this._currentPage.asObservable();

  private readonly _pageSize = new BehaviorSubject<number>(20);
  readonly pageSize$ = this._pageSize.asObservable();

  private readonly _totalCount = new BehaviorSubject<number>(0);
  readonly totalCount$ = this._totalCount.asObservable();

  private _lastQuery: string | undefined;

  constructor() {
    this.searchRequests$
      .pipe(
        tap(() => {
          this._loading.next(true);
          this._error.next(undefined);
          this._info.next(undefined);
        }),
        switchMap(command =>
          this.toRequest(command).pipe(
            map(response => ({ ok: true as const, response })),
            catchError(error => of({ ok: false as const, error })),
          ),
        ),
      )
      .subscribe(result => {
        if (result.ok) {
          this._results.next(
            result.response.items.map(item => this.toSelfDescriptor(normalizeSelfDescriptionSearchItem(item))),
          );
          this._totalCount.next(result.response.totalCount ?? 0);
          this._loading.next(false);
          this._hasCompletedSearch.next(true);
          return;
        }
        this._loading.next(false);
        this._results.next([]);
        this._totalCount.next(0);
        this._error.next(this.toErrorMessage(result.error));
        this._hasCompletedSearch.next(true);
      });
  }

  searchSimple(query?: string): void {
    this._lastQuery = query;
    this._currentPage.next(1);
    this.searchRequests$.next({
      mode: 'simple',
      query,
      page: 1,
    });
  }

  goToPage(page: number): void {
    if (page < 1) {
      return;
    }
    this._currentPage.next(page);
    this.searchRequests$.next({
      mode: 'simple',
      query: this._lastQuery,
      page,
    });
  }

  searchAdvanced(payload: AdvancedSearchPayload): void {
    this.searchRequests$.next({
      mode: 'advanced',
      payload,
    });
  }

  clearResults(): void {
    this._results.next([]);
    this._loading.next(false);
    this._error.next(undefined);
    this._info.next(undefined);
    this._hasCompletedSearch.next(false);
    this._currentPage.next(1);
    this._totalCount.next(0);
  }

  private toRequest(command: SearchRequestCommand) {
    if (command.mode === 'advanced') {
      return this.api.advancedSearchSD(command.payload ?? {}).pipe(
        catchError(error => {
          if (error instanceof HttpErrorResponse && error.status === 403) {
            this._info.next('403 mocks rendered');
            return of(this.advanced403FallbackResult);
          }
          return throwError(() => error);
        }),
      );
    }
    return this.api.simpleSearchSD(command.query, { page: command.page ?? 1, pageSize: this._pageSize.value });
  }

  private toSelfDescriptor(item: ReturnType<typeof normalizeSelfDescriptionSearchItem>): SelfDescriptorModel {
    const fallbackId = item.claimsGraphUri[0] || item.name;
    return createSelfDescriptor({
      selfDescriptionId: item.id ?? fallbackId,
      claimsGraphUri0: item.claimsGraphUri,
      name: item.name,
      description: item.description,
      inLanguage: item.inLanguage,
      offeringType: item.offeringType,
      serviceAccessPoint: item.serviceAccessPoint,
    });
  }

  private toErrorMessage(error: unknown): string {
    return this.dashboardError.toUserMessage(this.dashboardError.resolve(error));
  }
}
