import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, throwError } from 'rxjs';
import { DashboardStateService } from '@eclipse-edc/dashboard-core';
import type { Observable } from 'rxjs';

export interface SdToolingSchemas {
  Service?: (string | { id?: string; label?: string; title?: string; name?: string; resourceType?: string })[];
  Contract?: (string | { id?: string; label?: string; title?: string; name?: string; resourceType?: string })[];
  [key: string]:
    | (string | { id?: string; label?: string; title?: string; name?: string; resourceType?: string })[]
    | undefined;
}

export interface SdSchemaContentResult {
  endpoint: string;
  schemaId: string;
  schemaUIType: string;
  content: string;
}

export interface SdSharingMethodsResult {
  endpoint: string;
  offeringType: string;
  sharingMethods: (string | { id?: string; label?: string; description?: string; value?: string })[];
}

export interface SdPolicyOption {
  label: string;
  value: string;
}

export interface SdPolicyOptionsResult {
  endpoint: string;
  options: SdPolicyOption[];
}

export interface SdAccessPolicyPermission {
  assignee: string;
  action: string;
  fromDatetime?: string;
  toDatetime?: string;
}

export interface SdAccessPoliciesDTO {
  resourceUri: string;
  permissions: SdAccessPolicyPermission[];
}

export interface SdUsagePolicyConstraint {
  type: 'Deletion' | 'RestrictedDuration' | 'RestrictedNumber';
  assignee: string;
  afterUse?: boolean;
  maxCount?: number;
  fromDatetime?: string;
  toDatetime?: string;
}

export interface SdUsagePolicyPermission {
  assignee: string;
  action: string;
  constraints: SdUsagePolicyConstraint[];
}

export interface SdUsagePoliciesDTO {
  resourceUri: string;
  permissions: SdUsagePolicyPermission[];
}

export interface SdResourceAddressTemplate {
  id: string;
  label?: string;
  title?: string;
  description?: string;
  version?: string;
}

export interface SdResourceAddressTemplatesResult {
  offeringType: string;
  sharingMethodId?: string;
  templates: SdResourceAddressTemplate[] | string[];
}

export interface SdResourceAddressTemplateSchemaResult {
  endpoint: string;
  templateId: string;
  schema: Record<string, unknown>;
}

export interface SdResourceAddressTemplateUiSchemaResult {
  endpoint: string;
  templateId: string;
  uiSchema: Record<string, unknown> | Record<string, unknown>[];
}

export interface SdResourceDescriptionNode {
  claimsGraphUri?: string[];
  offeringType?: string;
  name?: string;
  description?: string;
  inLanguage?: string;
  serviceAccessPoint?: string;
}

export interface SdResourceDescriptionItem {
  n?: SdResourceDescriptionNode;
}

export interface SdResourceDescriptionsResponse {
  totalCount?: number;
  items?: SdResourceDescriptionItem[];
}

interface SdSignerRequest {
  context: string[];
  credentialSubject: Record<string, unknown>;
  issuer: string;
  key: string;
  namespace: string;
  group: string;
}

interface SdSchemaListItem {
  id?: string;
  label?: string;
  title?: string;
  name?: string;
  description?: string;
  version?: string;
  resourceType?: string;
}

interface RawPolicyOptionCandidate {
  label?: unknown;
  value?: unknown;
  id?: unknown;
  name?: unknown;
  identifier?: unknown;
  code?: unknown;
  title?: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class SdToolingService {
  private readonly http = inject(HttpClient);
  private readonly dashboardStateService = inject(DashboardStateService);

  private readonly defaultApiRoot = '/sdtooling-api';
  private readonly defaultApiVersion = 'v2';
  private readonly defaultApiBaseUrl = `${this.defaultApiRoot}/${this.defaultApiVersion}`;
  private apiBaseUrl = this.defaultApiBaseUrl;
  private apiV1BaseUrl = this.toFixedApiVersionBase(this.defaultApiBaseUrl, 'v1');
  private apiV3BaseUrl = this.toFixedApiVersionBase(this.defaultApiBaseUrl, 'v3');
  private readonly defaultSignerApiBaseUrl = '/signer';
  private signerApiBaseUrl = this.defaultSignerApiBaseUrl;

  constructor() {
    this.dashboardStateService.currentEdcConfig$.subscribe(config => {
      const baseUrl = config?.sdToolingApiBaseUrl?.trim();
      const signerBaseUrl = config?.signerApiBaseUrl?.trim();

      this.apiBaseUrl = this.resolveApiBaseUrl(baseUrl);
      this.apiV1BaseUrl = this.toFixedApiVersionBase(this.apiBaseUrl, 'v1');
      this.apiV3BaseUrl = this.toFixedApiVersionBase(this.apiBaseUrl, 'v3');
      this.signerApiBaseUrl = signerBaseUrl ? this.normalizeBaseUrl(signerBaseUrl) : this.defaultSignerApiBaseUrl;
    });
  }

  getBaseUrl(): string {
    return this.apiBaseUrl;
  }

  /**
   * GET resource descriptions (SD Tooling v1).
   * Query param `orderBy` defaults to `publicationDate`.
   */
  resourceDescriptionsRequest(orderBy = 'publicationDate'): Observable<SdResourceDescriptionsResponse> {
    const endpoint = `${this.apiV1BaseUrl}/resourceDescriptions`;
    const params = new HttpParams().set('orderBy', orderBy);
    return this.http
      .get<unknown>(endpoint, { params })
      .pipe(map(response => this.normalizeResourceDescriptionsResponse(response)));
  }

  /**
   * Revokes a published resource description in SD Tooling (v1).
   * @param offerId Resource description / offer identifier (same as `offer.offerID` in connector assets).
   */
  resourceDescriptionsRevoke(offerId: string): Observable<void> {
    const id = offerId.trim();
    if (!id) {
      return throwError(() => new Error('offerId is required'));
    }
    const endpoint = `${this.apiV1BaseUrl}/resourceDescriptions/${encodeURIComponent(id)}/revoke`;
    return this.http.post<void>(endpoint, null).pipe(map(() => undefined));
  }

  allSchemas(): Observable<SdToolingSchemas> {
    return this.http
      .get<unknown>(`${this.apiBaseUrl}/schemas`, this.createHttpOptions())
      .pipe(map(response => this.normalizeSchemasResponse(response)));
  }

  schemaContent(schemaId: string, schemaUIType = 'sdCreation'): Observable<SdSchemaContentResult> {
    const endpoint = `${this.apiBaseUrl}/schemas/${encodeURIComponent(schemaId)}/content?schemaUIType=${encodeURIComponent(schemaUIType)}`;

    let params = new HttpParams();
    if (schemaUIType) {
      params = params.set('schemaUIType', schemaUIType);
    }

    return this.http
      .get(`${this.apiBaseUrl}/schemas/${encodeURIComponent(schemaId)}/content`, {
        responseType: 'text',
        ...this.createHttpOptions(params),
      })
      .pipe(
        map(content => ({
          endpoint,
          schemaId,
          schemaUIType,
          content,
        })),
      );
  }

  sharingMethodsForOfferingType(offeringType: string): Observable<SdSharingMethodsResult> {
    const normalizedOfferingType = offeringType.trim().toUpperCase();
    if (!normalizedOfferingType) {
      return throwError(() => new Error('offeringType is required'));
    }

    const endpoint = `${this.apiV1BaseUrl}/resourceAddresses/sharingMethods?offeringType=${encodeURIComponent(normalizedOfferingType)}`;

    const params = new HttpParams().set('offeringType', normalizedOfferingType);
    return this.http
      .get<unknown>(`${this.apiV1BaseUrl}/resourceAddresses/sharingMethods`, {
        ...this.createHttpOptions(params),
      })
      .pipe(
        map(response => ({
          endpoint,
          offeringType: normalizedOfferingType,
          sharingMethods: this.normalizeSharingMethodsResponse(response),
        })),
      );
  }

  accessPolicyActions(): Observable<SdPolicyOptionsResult> {
    const endpoint = `${this.apiV1BaseUrl}/policies/actions`;
    return this.fetchPolicyOptions(endpoint, response => this.normalizeActionOptions(response));
  }

  identityAttributes(): Observable<SdPolicyOptionsResult> {
    const endpoint = `${this.apiV1BaseUrl}/policies/identityAttributes`;
    return this.fetchPolicyOptions(endpoint, response => this.normalizeIdentityAttributeOptions(response));
  }

  resourceAddressTemplates(
    sharingMethodId: string,
    offeringType: string,
  ): Observable<SdResourceAddressTemplatesResult> {
    const endpoint = `${this.apiV1BaseUrl}/resourceAddresses/sharingMethods/${encodeURIComponent(sharingMethodId)}/templates?offeringType=${encodeURIComponent(
      offeringType,
    )}`;

    // Backend may return either wrapped shape or raw templates array.
    return this.http
      .get<unknown>(endpoint, this.createHttpOptions())
      .pipe(map(response => this.normalizeTemplatesResponse(response, offeringType, sharingMethodId)));
  }

  resourceAddressTemplateSchema(templateId: string): Observable<SdResourceAddressTemplateSchemaResult> {
    const templatePath = encodeURIComponent(templateId);
    const endpoint = `${this.apiV1BaseUrl}/resourceAddresses/templates/${templatePath}/schema`;
    const fallbackEndpoint = `${this.apiV1BaseUrl}/resourceAddresses/${templatePath}/schema`;
    return this.http.get<unknown>(endpoint, this.createHttpOptions()).pipe(
      catchError(() => this.http.get<unknown>(fallbackEndpoint, this.createHttpOptions())),
      map(response => ({
        endpoint: endpoint,
        templateId,
        schema: this.asRecord(response) ?? {},
      })),
    );
  }

  resourceAddressTemplateUiSchema(templateId: string): Observable<SdResourceAddressTemplateUiSchemaResult> {
    const templatePath = encodeURIComponent(templateId);
    const endpoint = `${this.apiV1BaseUrl}/resourceAddresses/templates/${templatePath}/uiSchema`;
    const fallbackEndpoint = `${this.apiV1BaseUrl}/resourceAddresses/${templatePath}/uiSchema`;
    return this.http.get<unknown>(endpoint, this.createHttpOptions()).pipe(
      catchError(() => this.http.get<unknown>(fallbackEndpoint, this.createHttpOptions())),
      map(response => ({
        endpoint: endpoint,
        templateId,
        uiSchema: this.normalizeUiSchema(response),
      })),
    );
  }

  enrichAndValidateSchema(
    schemaId: string,
    templateId: string,
    selfDescriptionJsonLd: Record<string, unknown>,
  ): Observable<unknown> {
    const endpoint = `${this.apiV3BaseUrl}/selfDescriptions/enriched?schemaId=${encodeURIComponent(schemaId)}`;
    const payload = this.toEnrichmentV3Payload(selfDescriptionJsonLd, templateId);

    return this.http.post(endpoint, payload).pipe(map(response => response as unknown));
  }

  accessPolicyJsonLd(accessPolicies: SdAccessPoliciesDTO): Observable<unknown> {
    const endpoint = `${this.apiV1BaseUrl}/policies/access`;
    return this.http.post(endpoint, accessPolicies).pipe(map(response => response as unknown));
  }

  usagePolicyJsonLd(usagePolicies: SdUsagePoliciesDTO): Observable<unknown> {
    const endpoint = `${this.apiV1BaseUrl}/policies/usage`;
    return this.http.post(endpoint, usagePolicies).pipe(map(response => response as unknown));
  }

  publishSelfDescriptionToCatalogue(selfDescription: Record<string, unknown>): Observable<unknown> {
    const endpoint = `${this.apiV1BaseUrl}/selfDescriptions/publications`;
    return this.http.post(endpoint, selfDescription).pipe(map(response => response as unknown));
  }

  signSelfDescription(credentialSubject: Record<string, unknown>): Observable<unknown> {
    const endpoint = `${this.signerApiBaseUrl}/v1/credential`;
    const payload: SdSignerRequest = {
      context: ['https://w3id.org/security/suites/jws-2020/v1'],
      credentialSubject,
      issuer: 'did:web:did.dev.simpl-europa.eu',
      key: 'gaia-x-key1',
      namespace: 'transit',
      group: 'simpl',
    };

    return this.http.post(endpoint, payload).pipe(map(response => response as unknown));
  }

  private normalizeBaseUrl(url: string): string {
    if (!url) {
      return this.defaultApiBaseUrl;
    }
    return url.replace(/\/+$/, '');
  }

  private resolveApiBaseUrl(configuredBaseUrl: string | undefined): string {
    if (!configuredBaseUrl) {
      return this.defaultApiBaseUrl;
    }

    const normalizedBaseUrl = this.normalizeBaseUrl(configuredBaseUrl);

    if (this.shouldAppendVersionSegment(normalizedBaseUrl)) {
      return `${normalizedBaseUrl}/${this.defaultApiVersion}`;
    }

    return normalizedBaseUrl;
  }

  private hasVersionSegment(url: string): boolean {
    return /\/v\d+$/i.test(url);
  }

  private shouldAppendVersionSegment(url: string): boolean {
    return /\/sdtooling-api$/i.test(url);
  }

  private toFixedApiVersionBase(baseUrl: string, version: string): string {
    const normalizedVersion =
      version
        .trim()
        .replace(/^\/+|\/+$/g, '')
        .toLowerCase() || version;
    const normalizedBase = this.normalizeBaseUrl(baseUrl);

    if (this.hasVersionSegment(normalizedBase)) {
      return normalizedBase.replace(/\/v\d+$/i, `/${normalizedVersion}`);
    }

    return `${normalizedBase}/${normalizedVersion}`;
  }

  private createHttpOptions(params?: HttpParams): {
    params?: HttpParams;
  } {
    return {
      params,
    };
  }

  private normalizeActionOptions(response: unknown): SdPolicyOption[] {
    const candidates = this.extractOptionItems(response, ['actions', 'accessPolicyActions', 'options']);
    const mapped = candidates.map(item => this.mapActionOption(item)).filter((item): item is SdPolicyOption => !!item);

    return this.ensureCompatiblePolicyOptions('actions', response, candidates, mapped);
  }

  private normalizeIdentityAttributeOptions(response: unknown): SdPolicyOption[] {
    const candidates = this.extractOptionItems(response, ['identityAttributes', 'attributes', 'options']);
    const mapped = candidates
      .map(item => this.mapIdentityOption(item))
      .filter((item): item is SdPolicyOption => !!item);

    return this.ensureCompatiblePolicyOptions('identityAttributes', response, candidates, mapped);
  }

  private fetchPolicyOptions(
    endpoint: string,
    normalize: (response: unknown) => SdPolicyOption[],
  ): Observable<SdPolicyOptionsResult> {
    return this.http.get<unknown>(endpoint, this.createHttpOptions()).pipe(
      map(response => ({
        endpoint,
        options: normalize(response),
      })),
    );
  }

  private extractOptionItems(response: unknown, keys: string[]): unknown[] {
    if (Array.isArray(response)) {
      return response;
    }

    const record = this.asRecord(response);
    if (!record) {
      return [];
    }

    for (const key of keys) {
      const value = record[key];
      if (Array.isArray(value)) {
        return value;
      }
    }

    return [];
  }

  private mapActionOption(item: unknown): SdPolicyOption | undefined {
    if (typeof item === 'string') {
      return { label: item, value: item };
    }

    const node = this.asRecord(item) as RawPolicyOptionCandidate | undefined;
    if (!node) {
      return undefined;
    }

    const label = this.pickFirstString(node.label, node.title, node.name, node.id, node.value);
    const value = this.pickFirstString(node.value, node.id, node.name, node.label);
    if (!label || !value) {
      return undefined;
    }

    return { label, value };
  }

  private mapIdentityOption(item: unknown): SdPolicyOption | undefined {
    if (typeof item === 'string') {
      return { label: item, value: item };
    }

    const node = this.asRecord(item) as RawPolicyOptionCandidate | undefined;
    if (!node) {
      return undefined;
    }

    const label = this.pickFirstString(node.identifier, node.label, node.name, node.title, node.code, node.id);
    const value = this.pickFirstString(node.code, node.value, node.id, node.name, node.identifier);
    if (!label || !value) {
      return undefined;
    }

    return { label, value };
  }

  private ensureCompatiblePolicyOptions(
    optionName: 'actions' | 'identityAttributes',
    response: unknown,
    rawItems: unknown[],
    mapped: SdPolicyOption[],
  ): SdPolicyOption[] {
    if (mapped.length > 0 || rawItems.length === 0) {
      return mapped;
    }

    throw new Error(`Unsupported sdtooling ${optionName} payload shape. Response: ${this.safeJsonPreview(response)}`);
  }

  private safeJsonPreview(value: unknown): string {
    try {
      const serialized = JSON.stringify(value);
      if (!serialized) {
        return String(value);
      }
      return serialized.length > 300 ? `${serialized.slice(0, 300)}...` : serialized;
    } catch {
      return String(value);
    }
  }

  private pickFirstString(...values: unknown[]): string | undefined {
    for (const value of values) {
      const asString = this.asString(value);
      if (asString) {
        return asString;
      }
    }

    return undefined;
  }

  private normalizeSharingMethodsResponse(
    response: unknown,
  ): (string | { id?: string; label?: string; description?: string; value?: string })[] {
    if (Array.isArray(response)) {
      return response;
    }

    const node = this.asRecord(response);
    if (!node) {
      return [];
    }

    const candidate = node['sharingMethods'] ?? node['methods'] ?? node['items'];
    if (!Array.isArray(candidate)) {
      return [];
    }

    return candidate.filter(item => typeof item === 'string' || !!this.asRecord(item)) as (
      | string
      | { id?: string; label?: string; description?: string; value?: string }
    )[];
  }

  private asRecord(value: unknown): Record<string, unknown> | undefined {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return undefined;
  }

  private asString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private normalizeUiSchema(value: unknown): Record<string, unknown> | Record<string, unknown>[] {
    const asObject = this.asRecord(value);
    if (asObject) {
      return asObject;
    }
    if (Array.isArray(value)) {
      return value.map(item => this.asRecord(item)).filter((item): item is Record<string, unknown> => !!item);
    }
    return {};
  }

  private normalizeTemplatesResponse(
    response: unknown,
    offeringType: string,
    sharingMethodId: string,
  ): SdResourceAddressTemplatesResult {
    if (Array.isArray(response)) {
      return {
        offeringType,
        sharingMethodId,
        templates: response.filter(item => typeof item === 'string' || !!this.asRecord(item)) as
          | SdResourceAddressTemplate[]
          | string[],
      };
    }

    const objectResponse = this.asRecord(response);
    const templatesRaw =
      objectResponse?.['templates'] ?? objectResponse?.['resourceAddressTemplates'] ?? objectResponse?.['items'];
    const templates = Array.isArray(templatesRaw)
      ? templatesRaw.filter(item => typeof item === 'string' || !!this.asRecord(item))
      : [];

    return {
      offeringType:
        typeof objectResponse?.['offeringType'] === 'string'
          ? (objectResponse['offeringType'] as string)
          : offeringType,
      sharingMethodId:
        typeof objectResponse?.['sharingMethodId'] === 'string'
          ? (objectResponse['sharingMethodId'] as string)
          : sharingMethodId,
      templates: templates as SdResourceAddressTemplate[] | string[],
    };
  }

  private toEnrichmentV3Payload(
    selfDescriptionJsonLd: Record<string, unknown>,
    templateId: string,
  ): Record<string, unknown> {
    const sdJson = JSON.parse(JSON.stringify(selfDescriptionJsonLd ?? {})) as Record<string, unknown>;
    let providerDataAddress = '';
    const assetProperties = this.asRecord(sdJson['simpl:assetProperties']);

    if (assetProperties) {
      providerDataAddress = this.asString(assetProperties['simpl:providerDataAddress']) ?? '';
      delete assetProperties['simpl:providerDataAddress'];
    }

    return {
      sdJson,
      properties: {
        resourceAddress: {
          value: providerDataAddress,
          templateId,
        },
      },
    };
  }

  private normalizeSchemasResponse(response: unknown): SdToolingSchemas {
    if (Array.isArray(response)) {
      const serviceSchemas = response
        .map(node => this.normalizeSchemaListItem(node))
        .filter((item): item is SdSchemaListItem => !!item);

      return {
        Service: serviceSchemas,
        Contract: [],
      };
    }

    const asV1 = this.asRecord(response);
    const schemaNodes = asV1?.['schemas'];

    if (Array.isArray(schemaNodes)) {
      const serviceSchemas = schemaNodes
        .map(node => this.normalizeSchemaListItem(node))
        .filter((item): item is SdSchemaListItem => !!item);

      return {
        Service: serviceSchemas,
        Contract: [],
      };
    }

    return asV1 ? (asV1 as unknown as SdToolingSchemas) : {};
  }

  private normalizeResourceDescriptionsResponse(response: unknown): SdResourceDescriptionsResponse {
    const rec = this.asRecord(response);
    if (!rec) {
      return { items: [] };
    }
    const itemsRaw = rec['items'];
    const items = Array.isArray(itemsRaw) ? (itemsRaw as SdResourceDescriptionItem[]) : [];
    const totalCount = typeof rec['totalCount'] === 'number' ? rec['totalCount'] : undefined;
    return { totalCount, items };
  }

  private normalizeSchemaListItem(value: unknown): SdSchemaListItem | undefined {
    const node = this.asRecord(value);
    if (!node) {
      return undefined;
    }

    const id = this.asString(node['id']);
    if (!id) {
      return undefined;
    }

    return {
      id,
      label: this.asString(node['label']),
      title: this.asString(node['title']),
      name: this.asString(node['name']),
      description: this.asString(node['description']),
      version: this.asString(node['version']),
      resourceType: this.asString(node['resourceType']),
    };
  }
}
