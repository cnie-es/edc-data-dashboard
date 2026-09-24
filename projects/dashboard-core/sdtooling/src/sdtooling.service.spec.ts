import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { DashboardStateService } from '@eclipse-edc/dashboard-core';
import { SdToolingService } from './sdtooling.service';
import type { SdToolingSchemas } from './sdtooling.service';
import type { EdcConfig } from '../../src/lib/models/edc-config';

describe('SdToolingService', () => {
  let service: SdToolingService;
  let httpMock: HttpTestingController;
  let currentEdcConfig$: BehaviorSubject<EdcConfig | undefined>;

  beforeEach(() => {
    currentEdcConfig$ = new BehaviorSubject<EdcConfig | undefined>(undefined);

    TestBed.configureTestingModule({
      providers: [
        SdToolingService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: DashboardStateService,
          useValue: {
            currentEdcConfig$: currentEdcConfig$.asObservable(),
          },
        },
      ],
    });

    service = TestBed.inject(SdToolingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should use default SD tooling base URL by default', () => {
    expect(service.getBaseUrl()).toBe('/sdtooling-api/v2');
  });

  it('should use connector-specific base URL when provided', () => {
    currentEdcConfig$.next({
      connectorName: 'dp03',
      managementUrl: 'https://example.com/management',
      defaultUrl: 'https://example.com/api',
      protocolUrl: 'https://example.com/protocol',
      federatedCatalogEnabled: false,
      sdToolingApiBaseUrl: '/custom-gateway/sdtooling/',
    });

    expect(service.getBaseUrl()).toBe('/custom-gateway/sdtooling');
  });

  it('should append default v2 when base URL points to sdtooling root', () => {
    currentEdcConfig$.next({
      connectorName: 'dp03',
      managementUrl: 'https://example.com/management',
      defaultUrl: 'https://example.com/api',
      protocolUrl: 'https://example.com/protocol',
      federatedCatalogEnabled: false,
      sdToolingApiBaseUrl: '/sdtooling-api',
    });

    expect(service.getBaseUrl()).toBe('/sdtooling-api/v2');
  });

  it('should keep explicit base URL version as configured', () => {
    currentEdcConfig$.next({
      connectorName: 'dp03',
      managementUrl: 'https://example.com/management',
      defaultUrl: 'https://example.com/api',
      protocolUrl: 'https://example.com/protocol',
      federatedCatalogEnabled: false,
      sdToolingApiBaseUrl: '/sdtooling-api/v3',
    });

    expect(service.getBaseUrl()).toBe('/sdtooling-api/v3');
  });

  it('should call signer endpoint with sd-ui compatible payload', () => {
    const credentialSubject = {
      '@id': 'did:web:registry.gaia-x.eu:DataOffering:example',
      '@type': 'simpl:DataOffering',
    } as Record<string, unknown>;

    let result: unknown;
    service.signSelfDescription(credentialSubject).subscribe(response => {
      result = response;
    });

    const req = httpMock.expectOne('/signer/v1/credential');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      context: ['https://w3id.org/security/suites/jws-2020/v1'],
      credentialSubject,
      issuer: 'did:web:did.dev.simpl-europa.eu',
      key: 'gaia-x-key1',
      namespace: 'transit',
      group: 'simpl',
    });

    req.flush({ signed: true });
    expect(result).toEqual({ signed: true });
  });

  it('should use configured signer endpoint when provided', () => {
    currentEdcConfig$.next({
      connectorName: 'dp03',
      managementUrl: 'https://example.com/management',
      defaultUrl: 'https://example.com/api',
      protocolUrl: 'https://example.com/protocol',
      federatedCatalogEnabled: false,
      sdToolingApiBaseUrl: '/custom-gateway/sdtooling',
      signerApiBaseUrl: '/custom-signer',
    });

    service.signSelfDescription({ foo: 'bar' }).subscribe();

    const req = httpMock.expectOne('/custom-signer/v1/credential');
    expect(req.request.method).toBe('POST');
    req.flush({ ok: true });
  });

  it('should call schemas endpoint by default', () => {
    let result: SdToolingSchemas | undefined;

    service.allSchemas().subscribe(response => {
      result = response;
    });

    const req = httpMock.expectOne('/sdtooling-api/v2/schemas');
    expect(req.request.method).toBe('GET');
    req.flush({ Service: ['data-CorpusShape.ttl'], Contract: ['contract-templateShape.ttl'] });
    expect(result?.['Service']).toEqual(['data-CorpusShape.ttl']);
  });

  it('should normalize v2 schemas[] payload into Service options', () => {
    let result: SdToolingSchemas | undefined;

    service.allSchemas().subscribe(response => {
      result = response;
    });

    const req = httpMock.expectOne('/sdtooling-api/v2/schemas');
    expect(req.request.method).toBe('GET');
    req.flush({
      schemas: [
        {
          id: 'data-DataSchema',
          name: 'DataSchema',
          title: 'DataSchema title',
          description: 'DataSchema description',
          version: '1.0.0',
          resourceType: 'data',
        },
        {
          id: 'application-ApplicationSchema',
          name: 'ApplicationSchema',
          title: 'ApplicationSchema title',
          description: 'ApplicationSchema description',
          version: '1.0.0',
          resourceType: 'application',
        },
        {
          name: 'InvalidWithoutId',
        },
      ],
    });

    expect(result?.['Service']).toEqual([
      jasmine.objectContaining({
        id: 'data-DataSchema',
        name: 'DataSchema',
        title: 'DataSchema title',
        description: 'DataSchema description',
        version: '1.0.0',
        resourceType: 'data',
      }),
      jasmine.objectContaining({
        id: 'application-ApplicationSchema',
        name: 'ApplicationSchema',
        title: 'ApplicationSchema title',
        description: 'ApplicationSchema description',
        version: '1.0.0',
        resourceType: 'application',
      }),
    ]);
    expect(result?.['Contract']).toEqual([]);
  });

  it('should normalize direct array schema payload into Service options', () => {
    let result: SdToolingSchemas | undefined;

    service.allSchemas().subscribe(response => {
      result = response;
    });

    const req = httpMock.expectOne('/sdtooling-api/v2/schemas');
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        id: 'data-DataSchema',
        name: 'DataSchema',
      },
      {
        id: 'application-ApplicationSchema',
        title: 'Application',
      },
    ]);

    expect(result?.['Service']).toEqual([
      jasmine.objectContaining({ id: 'data-DataSchema', name: 'DataSchema' }),
      jasmine.objectContaining({ id: 'application-ApplicationSchema', title: 'Application' }),
    ]);
    expect(result?.['Contract']).toEqual([]);
  });

  it('should call schema content endpoint with sdCreation UI type by default', () => {
    let resultEndpoint = '';
    let resultContent = '';
    service.schemaContent('data-CorpusShape.ttl', 'sdCreation').subscribe(result => {
      resultEndpoint = result.endpoint;
      resultContent = result.content;
    });

    const req = httpMock.expectOne(
      r =>
        r.url === '/sdtooling-api/v2/schemas/data-CorpusShape.ttl/content' &&
        r.params.get('schemaUIType') === 'sdCreation',
    );
    expect(req.request.method).toBe('GET');
    req.flush('@prefix sh: <http://www.w3.org/ns/shacl#> .');

    expect(resultEndpoint).toBe('/sdtooling-api/v2/schemas/data-CorpusShape.ttl/content?schemaUIType=sdCreation');
    expect(resultContent).toContain('@prefix sh:');
  });

  it('should call sharing methods endpoint with DATA offering type', () => {
    let resultEndpoint = '';
    let offeringType = '';
    let methods: Array<string | { id?: string; label?: string; description?: string; value?: string }> = [];

    service.sharingMethodsForOfferingType('DATA').subscribe(result => {
      resultEndpoint = result.endpoint;
      offeringType = result.offeringType;
      methods = result.sharingMethods;
    });

    const req = httpMock.expectOne(
      r => r.url === '/sdtooling-api/v1/resourceAddresses/sharingMethods' && r.params.get('offeringType') === 'DATA',
    );
    expect(req.request.method).toBe('GET');
    req.flush(['HTTP']);

    expect(offeringType).toBe('DATA');
    expect(resultEndpoint).toBe('/sdtooling-api/v1/resourceAddresses/sharingMethods?offeringType=DATA');
    expect(methods).toEqual(['HTTP']);
  });

  it('should uppercase offering type when calling sharing methods endpoint', () => {
    let resultEndpoint = '';
    let offeringType = '';
    let methods: Array<string | { id?: string; label?: string; description?: string; value?: string }> = [];

    service.sharingMethodsForOfferingType('infrastructure').subscribe(result => {
      resultEndpoint = result.endpoint;
      offeringType = result.offeringType;
      methods = result.sharingMethods;
    });

    const req = httpMock.expectOne(
      r =>
        r.url === '/sdtooling-api/v1/resourceAddresses/sharingMethods' &&
        r.params.get('offeringType') === 'INFRASTRUCTURE',
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);

    expect(offeringType).toBe('INFRASTRUCTURE');
    expect(resultEndpoint).toBe('/sdtooling-api/v1/resourceAddresses/sharingMethods?offeringType=INFRASTRUCTURE');
    expect(methods).toEqual([]);
  });

  it('should call backend schemas endpoint with custom base URL', () => {
    currentEdcConfig$.next({
      connectorName: 'dp03',
      managementUrl: 'https://example.com/management',
      defaultUrl: 'https://example.com/api',
      protocolUrl: 'https://example.com/protocol',
      federatedCatalogEnabled: false,
      sdToolingApiBaseUrl: '/custom-gateway/sdtooling',
    });

    let result: SdToolingSchemas | undefined;
    service.allSchemas().subscribe(response => {
      result = response;
    });

    const req = httpMock.expectOne('/custom-gateway/sdtooling/schemas');
    expect(req.request.method).toBe('GET');
    req.flush({ Service: ['data-CorpusShape.ttl'] });

    expect(result?.['Service']).toEqual(['data-CorpusShape.ttl']);
  });

  it('should call backend schema content endpoint and map response when mocks are disabled', () => {
    currentEdcConfig$.next({
      connectorName: 'dp03',
      managementUrl: 'https://example.com/management',
      defaultUrl: 'https://example.com/api',
      protocolUrl: 'https://example.com/protocol',
      federatedCatalogEnabled: false,
      sdToolingApiBaseUrl: '/custom-gateway/sdtooling',
    });

    let resultContent = '';
    let resultEndpoint = '';
    service.schemaContent('data-CorpusShape.ttl', 'sdCreation').subscribe(result => {
      resultContent = result.content;
      resultEndpoint = result.endpoint;
    });

    const req = httpMock.expectOne(
      r =>
        r.url === '/custom-gateway/sdtooling/schemas/data-CorpusShape.ttl/content' &&
        r.params.get('schemaUIType') === 'sdCreation',
    );
    expect(req.request.method).toBe('GET');
    req.flush('@prefix sh: <http://www.w3.org/ns/shacl#> .');

    expect(resultEndpoint).toBe(
      '/custom-gateway/sdtooling/schemas/data-CorpusShape.ttl/content?schemaUIType=sdCreation',
    );
    expect(resultContent).toContain('@prefix sh:');
  });

  it('should call backend sharing methods endpoint and map response when mocks are disabled', () => {
    currentEdcConfig$.next({
      connectorName: 'dp03',
      managementUrl: 'https://example.com/management',
      defaultUrl: 'https://example.com/api',
      protocolUrl: 'https://example.com/protocol',
      federatedCatalogEnabled: false,
      sdToolingApiBaseUrl: '/custom-gateway/sdtooling',
    });

    let resultEndpoint = '';
    let offeringType = '';
    let methods: Array<string | { id?: string; label?: string; description?: string; value?: string }> = [];
    service.sharingMethodsForOfferingType('data').subscribe(result => {
      resultEndpoint = result.endpoint;
      offeringType = result.offeringType;
      methods = result.sharingMethods;
    });

    const req = httpMock.expectOne(
      r =>
        r.url === '/custom-gateway/sdtooling/v1/resourceAddresses/sharingMethods' &&
        r.params.get('offeringType') === 'DATA',
    );
    expect(req.request.method).toBe('GET');
    req.flush(['HTTP', 'S3']);

    expect(resultEndpoint).toBe('/custom-gateway/sdtooling/v1/resourceAddresses/sharingMethods?offeringType=DATA');
    expect(offeringType).toBe('DATA');
    expect(methods).toEqual(['HTTP', 'S3']);
  });

  it('should enforce v1 endpoints on the same domain when base URL is absolute v2', () => {
    currentEdcConfig$.next({
      connectorName: 'dp03',
      managementUrl: 'https://example.com/management',
      defaultUrl: 'https://example.com/api',
      protocolUrl: 'https://example.com/protocol',
      federatedCatalogEnabled: false,
      sdToolingApiBaseUrl: 'https://localhost:8080/sdtooling-api/v2',
    });

    service.sharingMethodsForOfferingType('DATA').subscribe();

    const req = httpMock.expectOne(
      r =>
        r.url === 'https://localhost:8080/sdtooling-api/v1/resourceAddresses/sharingMethods' &&
        r.params.get('offeringType') === 'DATA',
    );
    expect(req.request.method).toBe('GET');
    req.flush(['HTTP']);
  });

  it('should normalize wrapped methods payload for sharing methods endpoint', () => {
    let methods: Array<string | { id?: string; label?: string; description?: string; value?: string }> = [];

    service.sharingMethodsForOfferingType('DATA').subscribe(result => {
      methods = result.sharingMethods;
    });

    const req = httpMock.expectOne(
      r => r.url === '/sdtooling-api/v1/resourceAddresses/sharingMethods' && r.params.get('offeringType') === 'DATA',
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      methods: [{ id: 'HTTP', label: 'HTTP' }, 'S3'],
    });

    expect(methods).toEqual([{ id: 'HTTP', label: 'HTTP' }, 'S3']);
  });

  it('should fail fast when offering type is empty', () => {
    let error: unknown;
    service.sharingMethodsForOfferingType('   ').subscribe({
      next: () => fail('expected error'),
      error: err => {
        error = err;
      },
    });

    expect(error instanceof Error).toBeTrue();
    expect((error as Error).message).toContain('offeringType is required');
  });

  it('should call backend actions endpoint and map label/value payload', () => {
    currentEdcConfig$.next({
      connectorName: 'dp03',
      managementUrl: 'https://example.com/management',
      defaultUrl: 'https://example.com/api',
      protocolUrl: 'https://example.com/protocol',
      federatedCatalogEnabled: false,
      sdToolingApiBaseUrl: '/custom-gateway/sdtooling',
    });

    let endpoint = '';
    let options: { label: string; value: string }[] = [];
    service.accessPolicyActions().subscribe(result => {
      endpoint = result.endpoint;
      options = result.options;
    });

    const req = httpMock.expectOne('/custom-gateway/sdtooling/v1/policies/actions');
    expect(req.request.method).toBe('GET');
    req.flush([
      { label: 'Fetch', value: 'fetch' },
      { label: 'Return', value: 'return' },
    ]);

    expect(endpoint).toBe('/custom-gateway/sdtooling/v1/policies/actions');
    expect(options).toEqual([
      { label: 'Fetch', value: 'fetch' },
      { label: 'Return', value: 'return' },
    ]);
  });

  it('should normalize wrapped v2-style actions payload', () => {
    let options: { label: string; value: string }[] = [];
    service.accessPolicyActions().subscribe(result => {
      options = result.options;
    });

    const req = httpMock.expectOne('/sdtooling-api/v1/policies/actions');
    req.flush({
      actions: [
        { id: 'USE', label: 'Use' },
        { id: 'READ', name: 'Read' },
      ],
    });

    expect(options).toEqual([
      { label: 'Use', value: 'USE' },
      { label: 'Read', value: 'READ' },
    ]);
  });

  it('should call backend identityAttributes endpoint and map identifier/code payload', () => {
    currentEdcConfig$.next({
      connectorName: 'dp03',
      managementUrl: 'https://example.com/management',
      defaultUrl: 'https://example.com/api',
      protocolUrl: 'https://example.com/protocol',
      federatedCatalogEnabled: false,
      sdToolingApiBaseUrl: '/custom-gateway/sdtooling',
    });

    let endpoint = '';
    let options: { label: string; value: string }[] = [];
    service.identityAttributes().subscribe(result => {
      endpoint = result.endpoint;
      options = result.options;
    });

    const req = httpMock.expectOne('/custom-gateway/sdtooling/v1/policies/identityAttributes');
    expect(req.request.method).toBe('GET');
    req.flush([
      { identifier: 'identifier1', code: 'code1' },
      { identifier: 'identifier2', code: 'code2' },
    ]);

    expect(endpoint).toBe('/custom-gateway/sdtooling/v1/policies/identityAttributes');
    expect(options).toEqual([
      { label: 'identifier1', value: 'code1' },
      { label: 'identifier2', value: 'code2' },
    ]);
  });

  it('should map fallback action fields name/id when label/value are missing', () => {
    let options: { label: string; value: string }[] = [];
    service.accessPolicyActions().subscribe(result => {
      options = result.options;
    });

    const req = httpMock.expectOne('/sdtooling-api/v1/policies/actions');
    req.flush([{ name: 'Fetch', id: 'fetch' }]);

    expect(options).toEqual([{ label: 'Fetch', value: 'fetch' }]);
  });

  it('should raise explicit error for incompatible non-empty actions payload', () => {
    let error: unknown;
    service.accessPolicyActions().subscribe({
      next: () => fail('expected parsing error'),
      error: err => {
        error = err;
      },
    });

    const req = httpMock.expectOne('/sdtooling-api/v1/policies/actions');
    req.flush({
      actions: [{ unsupported: 'shape' }],
    });

    expect(error instanceof Error).toBeTrue();
    expect((error as Error).message).toContain('Unsupported sdtooling actions payload shape');
  });

  it('should normalize raw array response for templates endpoint', () => {
    let templates: unknown[] = [];
    service.resourceAddressTemplates('IONOS_S3', 'DATA').subscribe(result => {
      templates = result.templates;
    });

    const req = httpMock.expectOne(
      '/sdtooling-api/v1/resourceAddresses/sharingMethods/IONOS_S3/templates?offeringType=DATA',
    );
    expect(req.request.method).toBe('GET');
    req.flush([
      { id: '1', label: 'Data Template IonosS3 (1)' },
      { id: '2', label: 'Data Template IonosS3 (2)' },
    ]);

    expect(templates).toEqual([
      { id: '1', label: 'Data Template IonosS3 (1)' },
      { id: '2', label: 'Data Template IonosS3 (2)' },
    ]);
  });

  it('should normalize wrapped resourceAddressTemplates response for templates endpoint', () => {
    let templates: unknown[] = [];
    service.resourceAddressTemplates('IONOS_S3', 'DATA').subscribe(result => {
      templates = result.templates;
    });

    const req = httpMock.expectOne(
      '/sdtooling-api/v1/resourceAddresses/sharingMethods/IONOS_S3/templates?offeringType=DATA',
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      resourceAddressTemplates: [{ id: 'template-1', label: 'Template 1' }],
      sharingMethodId: 'IONOS_S3',
      offeringType: 'DATA',
    });

    expect(templates).toEqual([{ id: 'template-1', label: 'Template 1' }]);
  });

  it('should call template schema endpoint and normalize object response', () => {
    currentEdcConfig$.next({
      connectorName: 'dp03',
      managementUrl: 'https://example.com/management',
      defaultUrl: 'https://example.com/api',
      protocolUrl: 'https://example.com/protocol',
      federatedCatalogEnabled: false,
      sdToolingApiBaseUrl: '/custom-gateway/sdtooling',
    });

    let endpoint = '';
    let schema: Record<string, unknown> = {};
    service.resourceAddressTemplateSchema('template-http').subscribe(result => {
      endpoint = result.endpoint;
      schema = result.schema;
    });

    const req = httpMock.expectOne('/custom-gateway/sdtooling/v1/resourceAddresses/templates/template-http/schema');
    expect(req.request.method).toBe('GET');
    req.flush({ type: 'object', properties: { endpoint: { type: 'string' } } });

    expect(endpoint).toBe('/custom-gateway/sdtooling/v1/resourceAddresses/templates/template-http/schema');
    expect(schema).toEqual({ type: 'object', properties: { endpoint: { type: 'string' } } });
  });

  it('should normalize non-object template schema response to empty object', () => {
    let schema: Record<string, unknown> = { not: 'empty' };
    service.resourceAddressTemplateSchema('template-http').subscribe(result => {
      schema = result.schema;
    });

    const req = httpMock.expectOne('/sdtooling-api/v1/resourceAddresses/templates/template-http/schema');
    expect(req.request.method).toBe('GET');
    req.flush('invalid');

    expect(schema).toEqual({});
  });

  it('should fallback to sd-ui style schema endpoint when templates route fails', () => {
    let schema: Record<string, unknown> = {};
    service.resourceAddressTemplateSchema('1').subscribe(result => {
      schema = result.schema;
    });

    const firstReq = httpMock.expectOne('/sdtooling-api/v1/resourceAddresses/templates/1/schema');
    expect(firstReq.request.method).toBe('GET');
    firstReq.flush({ title: 'not-found' }, { status: 404, statusText: 'Not Found' });

    const fallbackReq = httpMock.expectOne('/sdtooling-api/v1/resourceAddresses/1/schema');
    expect(fallbackReq.request.method).toBe('GET');
    fallbackReq.flush({ type: 'object', properties: { endpoint: { type: 'string' } } });

    expect(schema).toEqual({ type: 'object', properties: { endpoint: { type: 'string' } } });
  });

  it('should call template uiSchema endpoint and normalize array payload', () => {
    let endpoint = '';
    let uiSchema: Record<string, unknown> | Record<string, unknown>[] = {};
    service.resourceAddressTemplateUiSchema('template-http').subscribe(result => {
      endpoint = result.endpoint;
      uiSchema = result.uiSchema;
    });

    const req = httpMock.expectOne('/sdtooling-api/v1/resourceAddresses/templates/template-http/uiSchema');
    expect(req.request.method).toBe('GET');
    req.flush([{ type: 'Control', scope: '#/properties/endpoint' }, 'invalid-item']);

    expect(endpoint).toBe('/sdtooling-api/v1/resourceAddresses/templates/template-http/uiSchema');
    expect(Array.isArray(uiSchema)).toBeTrue();
    expect(uiSchema as unknown).toEqual([{ type: 'Control', scope: '#/properties/endpoint' }]);
  });

  it('should fallback to sd-ui style uiSchema endpoint when templates route fails', () => {
    let uiSchema: Record<string, unknown> | Record<string, unknown>[] = {};
    service.resourceAddressTemplateUiSchema('1').subscribe(result => {
      uiSchema = result.uiSchema;
    });

    const firstReq = httpMock.expectOne('/sdtooling-api/v1/resourceAddresses/templates/1/uiSchema');
    expect(firstReq.request.method).toBe('GET');
    firstReq.flush({ title: 'not-found' }, { status: 404, statusText: 'Not Found' });

    const fallbackReq = httpMock.expectOne('/sdtooling-api/v1/resourceAddresses/1/uiSchema');
    expect(fallbackReq.request.method).toBe('GET');
    fallbackReq.flush([{ type: 'Control', scope: '#/properties/endpoint' }]);

    expect(Array.isArray(uiSchema)).toBeTrue();
    expect(uiSchema as unknown).toEqual([{ type: 'Control', scope: '#/properties/endpoint' }]);
  });

  it('should call enrichAndValidateSchema on v3 with sdJson wrapper payload', () => {
    const payload: Record<string, unknown> = {
      '@id': 'did:web:registry.gaia-x.eu:DataOffering:example',
      'simpl:dataProperties': {
        'simpl:format': 'csv',
      },
      'simpl:assetProperties': {
        'simpl:providerDataAddress': '{"type":"HttpData","baseUrl":"https://example.org"}',
        'simpl:otherField': 'preserve-me',
      },
    };

    let responseBody: unknown;
    service.enrichAndValidateSchema('data-offeringShape.ttl', 'template-3', payload).subscribe(result => {
      responseBody = result;
    });

    const req = httpMock.expectOne(
      r =>
        r.url === '/sdtooling-api/v3/selfDescriptions/enriched' &&
        r.params.get('schemaId') === 'data-offeringShape.ttl',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('templateId')).toBeNull();
    expect(req.request.body).toEqual({
      sdJson: {
        '@id': 'did:web:registry.gaia-x.eu:DataOffering:example',
        'simpl:dataProperties': {
          'simpl:format': 'csv',
        },
        'simpl:assetProperties': {
          'simpl:otherField': 'preserve-me',
        },
      },
      properties: {
        resourceAddress: {
          value: '{"type":"HttpData","baseUrl":"https://example.org"}',
          templateId: 'template-3',
        },
      },
    });

    req.flush({ enriched: true });
    expect(responseBody).toEqual({ enriched: true });
  });

  it('should call accessPolicyJsonLd on v1 endpoint', () => {
    let responseBody: unknown;
    service
      .accessPolicyJsonLd({
        resourceUri: 'urn:example:sd',
        permissions: [{ assignee: 'urn:party', action: 'USE' }],
      })
      .subscribe(result => {
        responseBody = result;
      });

    const req = httpMock.expectOne('/sdtooling-api/v1/policies/access');
    expect(req.request.method).toBe('POST');
    req.flush({ ok: true });

    expect(responseBody).toEqual({ ok: true });
  });

  it('should call usagePolicyJsonLd on v1 endpoint', () => {
    let responseBody: unknown;
    service
      .usagePolicyJsonLd({
        resourceUri: 'urn:example:sd',
        permissions: [
          {
            assignee: 'urn:party',
            action: 'USE',
            constraints: [{ type: 'Deletion', assignee: 'urn:party', afterUse: true }],
          },
        ],
      })
      .subscribe(result => {
        responseBody = result;
      });

    const req = httpMock.expectOne('/sdtooling-api/v1/policies/usage');
    expect(req.request.method).toBe('POST');
    req.flush({ ok: true });

    expect(responseBody).toEqual({ ok: true });
  });

  it('should call publishSelfDescriptionToCatalogue on v1 endpoint', () => {
    let responseBody: unknown;
    service
      .publishSelfDescriptionToCatalogue({
        verifiableCredential: { credentialSubject: { '@id': 'urn:example:sd' } },
      })
      .subscribe(result => {
        responseBody = result;
      });

    const req = httpMock.expectOne('/sdtooling-api/v1/selfDescriptions/publications');
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'urn:example:published' });

    expect(responseBody).toEqual({ id: 'urn:example:published' });
  });

  it('should GET resourceDescriptions with orderBy only', async () => {
    const promise = firstValueFrom(service.resourceDescriptionsRequest());

    const req = httpMock.expectOne(
      r =>
        r.url === '/sdtooling-api/v1/resourceDescriptions' &&
        r.method === 'GET' &&
        r.params.get('orderBy') === 'publicationDate' &&
        r.params.keys().length === 1,
    );
    req.flush({ totalCount: 0, items: [] });

    const result = await promise;
    expect(result.items).toEqual([]);
  });

  it('should POST resourceDescriptions/{id}/revoke with encoded offer id', async () => {
    const offerId = 'did:web:example.com:path/segment';
    const promise = firstValueFrom(service.resourceDescriptionsRevoke(offerId));

    const req = httpMock.expectOne(
      r =>
        r.url === '/sdtooling-api/v1/resourceDescriptions/' + encodeURIComponent(offerId) + '/revoke' &&
        r.method === 'POST',
    );
    expect(req.request.body).toBeNull();
    req.flush(null);

    await promise;
  });
});
