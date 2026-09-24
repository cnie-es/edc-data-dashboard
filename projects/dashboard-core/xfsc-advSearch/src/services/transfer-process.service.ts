import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DashboardStateService } from '@eclipse-edc/dashboard-core';
import { catchError, distinctUntilChanged, map, throwError } from 'rxjs';
import type { Observable } from 'rxjs';
import type {
  EdcTransferRequestData,
  TransferProcessInitiateResponse,
  TransferProcessStatusResponse,
  UiError,
} from '../types/contract-negotiation.model';
import { toTransferStartRequest } from './transfer-request.mapper';

type TransferProcessEndpointName = 'start' | 'status';

@Injectable({
  providedIn: 'root',
})
export class TransferProcessService {
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

  startTransferProcess(transferRequestData: EdcTransferRequestData): Observable<TransferProcessInitiateResponse> {
    return this.http
      .post<TransferProcessInitiateResponse>(this.getEndpoint('start'), toTransferStartRequest(transferRequestData))
      .pipe(catchError(error => this.toUiError('Transfer process request failed', error)));
  }

  fetchTransferProcessStatus(transferProcessId: string): Observable<TransferProcessStatusResponse> {
    return this.http
      .get<TransferProcessStatusResponse>(`${this.getEndpoint('status')}/${transferProcessId}`)
      .pipe(catchError(error => this.toUiError('Transfer process status request failed', error)));
  }

  private getEndpoint(endpointName: TransferProcessEndpointName): string {
    const basePath = `${this.apiBaseUrl}/${this.apiVersion}`;
    const endpoints: Record<TransferProcessEndpointName, string> = {
      start: `${basePath}/transfers`,
      status: `${basePath}/transfers`,
    };
    return endpoints[endpointName];
  }

  private toUiError(defaultTitle: string, error: unknown): Observable<never> {
    const title = this.extractStringField(error, 'title') ?? this.extractStringField(error, 'error') ?? defaultTitle;
    const description =
      this.extractStringField(error, 'description') ??
      this.extractStringField(error, 'detail') ??
      this.extractStringField(error, 'message') ??
      'Unexpected error while calling transfer process API.';
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
