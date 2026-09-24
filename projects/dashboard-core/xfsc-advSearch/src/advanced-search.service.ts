import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { distinctUntilChanged, map } from 'rxjs';
import { DashboardStateService } from '@eclipse-edc/dashboard-core';
import type { Observable } from 'rxjs';

export interface SDNodeInfo {
  id?: string;
  claimsGraphUri?: string[];
  claimsGraphUri0?: string[];
  offeringType?: string;
  name?: string;
  description?: string;
  inLanguage?: string;
  serviceAccessPoint?: string;
}

export type SDInfo = SDNodeInfo | { n: SDNodeInfo } | { i: SDNodeInfo };

export interface SimpleSearchPaging {
  page: number;
  pageSize: number;
}

export interface SearchResult {
  totalCount?: number;
  items: SDInfo[];
}

export type SchemaList = Record<string, string[]> & { Service?: string[] };
export type AdvancedSearchPayload = Record<string, Record<string, unknown>>;

@Injectable({
  providedIn: 'root',
})
export class SimplAdvancedSearchService {
  private readonly http = inject(HttpClient);
  private readonly dashboardStateService = inject(DashboardStateService);

  private readonly defaultApiBaseUrl = '/xfsc-advsearch-be/v1';
  private apiBaseUrl = this.defaultApiBaseUrl;

  constructor() {
    this.dashboardStateService.currentEdcConfig$
      .pipe(
        map(config => config?.xfscAdvSearchApiBaseUrl?.trim()),
        distinctUntilChanged(),
      )
      .subscribe(baseUrl => {
        if (baseUrl) {
          this.apiBaseUrl = this.normalizeBaseUrl(baseUrl);
        } else {
          this.apiBaseUrl = this.defaultApiBaseUrl;
        }
      });
  }

  simpleSearchSD(query: string | undefined, paging?: SimpleSearchPaging): Observable<SearchResult> {
    let params = new HttpParams().set('q', query ?? '');
    if (paging) {
      params = params.set('page', String(paging.page)).set('pageSize', String(paging.pageSize));
    }
    return this.http.get<SearchResult>(`${this.apiBaseUrl}/selfDescriptions`, this.createHttpOptions(params));
  }

  detailedSearchSD(selfDescriptorID: string): Observable<Record<string, unknown>> {
    const encodedId = encodeURIComponent(selfDescriptorID);
    return this.http.get<Record<string, unknown>>(
      `${this.apiBaseUrl}/selfDescriptions/${encodedId}`,
      this.createHttpOptions(),
    );
  }

  advancedSearchSD(payload: AdvancedSearchPayload): Observable<SearchResult> {
    return this.http.post<SearchResult>(
      `${this.apiBaseUrl}/selfDescriptions/advanced`,
      payload,
      this.createHttpOptions(),
    );
  }

  getBaseUrl(): string {
    return this.apiBaseUrl;
  }

  allSchemas(): Observable<SchemaList> {
    return this.http.get<SchemaList>(`${this.apiBaseUrl}/schemas`, this.createHttpOptions());
  }

  schemaContent(schemaID: string, schemaUIType?: string): Observable<string> {
    let params = new HttpParams();
    if (schemaUIType) {
      params = params.set('schemaUIType', schemaUIType);
    }

    return this.http.get(`${this.apiBaseUrl}/schemas/${schemaID}/content`, {
      responseType: 'text',
      ...this.createHttpOptions(params),
    });
  }

  private normalizeBaseUrl(url: string): string {
    if (!url) {
      return this.defaultApiBaseUrl;
    }
    return url.replace(/\/+$/, '');
  }

  private createHttpOptions(params?: HttpParams): {
    params?: HttpParams;
  } {
    return {
      params,
    };
  }
}
