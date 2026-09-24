import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DashboardStateService } from '@eclipse-edc/dashboard-core';
import { catchError, distinctUntilChanged, map, throwError } from 'rxjs';
import type { Observable } from 'rxjs';
import type {
  ContractNegotiationInitiateResponse,
  ContractNegotiationOffersResponse,
  ContractNegotiationRequestData,
  ContractNegotiationStatusResponse,
  UiError,
} from '../types/contract-negotiation.model';

export interface ResourceAddressTemplateOption {
  value: string;
  label: string;
}

type ContractConsumptionEndpointName = 'negotiate' | 'offers' | 'status';

@Injectable({
  providedIn: 'root',
})
export class ContractConsumptionService {
  private readonly http = inject(HttpClient);
  private readonly dashboardStateService = inject(DashboardStateService);

  private readonly defaultApiBaseUrl = '/contract-consumption-api';
  private readonly defaultApiVersion = 'v1';
  private apiBaseUrl = this.defaultApiBaseUrl;
  private apiVersion = this.defaultApiVersion;

  constructor() {
    this.dashboardStateService.currentEdcConfig$
      .pipe(
        map(config => ({
          apiUrl: config?.contractConsumptionApiBaseUrl,
          apiVersion: config?.contractConsumptionApiVersion,
        })),
        distinctUntilChanged(
          (previous, next) => previous.apiUrl === next.apiUrl && previous.apiVersion === next.apiVersion,
        ),
      )
      .subscribe(({ apiUrl, apiVersion }) => {
        this.apiBaseUrl = this.normalizeApiBaseUrl(apiUrl ?? this.defaultApiBaseUrl);
        this.apiVersion = this.normalizeApiVersion(apiVersion ?? this.defaultApiVersion);
      });
  }

  getCatalogOffers(negotiationData: ContractNegotiationRequestData): Observable<ContractNegotiationOffersResponse> {
    return this.http
      .post<ContractNegotiationOffersResponse>(this.getEndpoint('offers'), negotiationData)
      .pipe(catchError(error => this.toUiError('Contract offers request failed', error)));
  }

  startContractNegotiation(
    negotiationData: ContractNegotiationRequestData,
  ): Observable<ContractNegotiationInitiateResponse> {
    return this.http
      .post<ContractNegotiationInitiateResponse>(this.getEndpoint('negotiate'), negotiationData)
      .pipe(catchError(error => this.toUiError('Contract negotiation request failed', error)));
  }

  fetchContractNegotiationStatus(negotiationId: string): Observable<ContractNegotiationStatusResponse> {
    return this.http
      .get<ContractNegotiationStatusResponse>(`${this.getEndpoint('status')}/${negotiationId}`)
      .pipe(catchError(error => this.toUiError('Contract negotiation status request failed', error)));
  }

  resourceAddressTemplates(sharingMethodId: string, offeringType: string): Observable<ResourceAddressTemplateOption[]> {
    const normalizedOfferingType = offeringType.trim().toUpperCase();
    const endpoint = `${this.getApiBasePath()}/resourceAddresses/sharingMethods/${encodeURIComponent(sharingMethodId)}/templates`;
    const params = new HttpParams().set('offeringType', normalizedOfferingType);

    return this.http.get<unknown>(endpoint, { params }).pipe(
      map(response => this.normalizeTemplateOptions(response)),
      catchError(error => this.toUiError('Resource address templates request failed', error)),
    );
  }

  resourceAddressTemplateSchema(templateId: string): Observable<Record<string, unknown>> {
    const templatePath = encodeURIComponent(templateId);
    const endpoint = `${this.getApiBasePath()}/resourceAddresses/templates/${templatePath}/schema`;

    return this.http.get<unknown>(endpoint).pipe(
      map(response => this.normalizeSchemaResponse(response)),
      catchError(error => this.toUiError('Resource address schema request failed', error)),
    );
  }

  resourceAddressTemplateUiSchema(templateId: string): Observable<Record<string, unknown> | Record<string, unknown>[]> {
    const templatePath = encodeURIComponent(templateId);
    const endpoint = `${this.getApiBasePath()}/resourceAddresses/templates/${templatePath}/uiSchema`;

    return this.http.get<unknown>(endpoint).pipe(
      map(response => this.normalizeUiSchemaResponse(response)),
      catchError(error => this.toUiError('Resource address uiSchema request failed', error)),
    );
  }

  private getApiBasePath(): string {
    return `${this.apiBaseUrl}/${this.apiVersion}`;
  }

  private getEndpoint(endpointName: ContractConsumptionEndpointName): string {
    const endpoints: Record<ContractConsumptionEndpointName, string> = {
      negotiate: `${this.getApiBasePath()}/contracts`,
      offers: `${this.getApiBasePath()}/connectorCatalog/assets`,
      status: `${this.getApiBasePath()}/contracts`,
    };
    return endpoints[endpointName];
  }

  private normalizeTemplateOptions(response: unknown): ResourceAddressTemplateOption[] {
    const templates = this.extractTemplatesList(response);
    return templates
      .map(template => {
        if (typeof template === 'string') {
          return { value: template, label: template };
        }
        const record = this.asRecord(template);
        if (!record) {
          return undefined;
        }
        const value =
          typeof record['id'] === 'string'
            ? record['id']
            : typeof record['templateId'] === 'string'
              ? record['templateId']
              : '';
        if (!value) {
          return undefined;
        }
        const label =
          typeof record['label'] === 'string'
            ? record['label']
            : typeof record['title'] === 'string'
              ? record['title']
              : value;
        return { value, label };
      })
      .filter((option): option is ResourceAddressTemplateOption => !!option);
  }

  private extractTemplatesList(response: unknown): unknown[] {
    if (Array.isArray(response)) {
      return response;
    }
    const record = this.asRecord(response);
    if (!record) {
      return [];
    }
    const candidates = [record['templates'], record['resourceAddressTemplates'], record['items']];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }
    return [];
  }

  private normalizeSchemaResponse(response: unknown): Record<string, unknown> {
    const record = this.asRecord(response);
    if (!record) {
      return {};
    }
    const nestedSchema = this.asRecord(record['schema']);
    return nestedSchema ?? record;
  }

  private normalizeUiSchemaResponse(response: unknown): Record<string, unknown> | Record<string, unknown>[] {
    const record = this.asRecord(response);
    if (!record) {
      if (Array.isArray(response)) {
        return response.filter(item => !!this.asRecord(item)) as Record<string, unknown>[];
      }
      return {};
    }
    const nestedUiSchema = record['uiSchema'];
    if (Array.isArray(nestedUiSchema)) {
      return nestedUiSchema.filter(item => !!this.asRecord(item)) as Record<string, unknown>[];
    }
    const nestedUiSchemaRecord = this.asRecord(nestedUiSchema);
    if (nestedUiSchemaRecord) {
      return nestedUiSchemaRecord;
    }
    return record;
  }

  private asRecord(value: unknown): Record<string, unknown> | undefined {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return undefined;
  }

  private toUiError(defaultTitle: string, error: unknown): Observable<never> {
    const title = this.extractStringField(error, 'title') ?? this.extractStringField(error, 'error') ?? defaultTitle;
    const description =
      this.extractStringField(error, 'description') ??
      this.extractStringField(error, 'detail') ??
      this.extractStringField(error, 'message') ??
      'Unexpected error while calling contract consumption API.';
    return throwError((): UiError => ({ title, description }));
  }

  private extractStringField(error: unknown, field: string): string | null {
    if (typeof error !== 'object' || error === null) {
      return null;
    }

    const root = error as Record<string, unknown>;
    const rootValue = root[field];
    if (typeof rootValue === 'string' && rootValue.length > 0) {
      return rootValue;
    }

    const errorPayload =
      typeof root['error'] === 'object' && root['error'] !== null ? (root['error'] as Record<string, unknown>) : null;
    const nestedValue = errorPayload?.[field];
    if (typeof nestedValue === 'string' && nestedValue.length > 0) {
      return nestedValue;
    }

    return null;
  }

  private normalizeApiBaseUrl(url: string): string {
    return url.replace(/\/+$/, '');
  }

  private normalizeApiVersion(version: string): string {
    return version.replace(/^\/+/, '').replace(/\/+$/, '') || this.defaultApiVersion;
  }
}
