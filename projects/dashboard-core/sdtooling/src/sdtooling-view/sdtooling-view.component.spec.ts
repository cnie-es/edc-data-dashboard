import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import {
  DASHBOARD_RUNTIME_FEATURE_FLAGS,
  DashboardStateService,
  ModalAndAlertService,
  OFFER_CREATION_PENDING_SCHEMA_STORAGE_KEY,
  SdMatchedAssetsWarmupService,
} from '@eclipse-edc/dashboard-core';
import type { EdcConfig } from '@eclipse-edc/dashboard-core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SdToolingViewComponent } from './sdtooling-view.component';
import { SdToolingService } from '../sdtooling.service';
import type {
  SdPolicyOptionsResult,
  SdResourceAddressTemplatesResult,
  SdSchemaContentResult,
  SdSharingMethodsResult,
  SdToolingSchemas,
} from '../sdtooling.service';

class MockSdToolingService {
  private readonly mockShacl = `@prefix gax-validation: <http://w3id.org/gaia-x/validation#> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix simpl: <http://w3id.org/gaia-x/simpl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

gax-validation:DataCorpusShape a sh:NodeShape ;
    sh:targetClass simpl:DataOffering ;
    sh:property [
        sh:path simpl:generalServiceProperties ;
        sh:node gax-validation:CorpusGeneralServicePropertiesShape ;
        sh:minCount 1 ;
        sh:maxCount 1
    ] .

gax-validation:CorpusGeneralServicePropertiesShape a sh:NodeShape ;
    sh:property
        [
            sh:path simpl:name ;
            sh:datatype xsd:string ;
            sh:minCount 1
        ],
        [
            sh:path simpl:keywords ;
            sh:datatype xsd:string ;
            sh:maxCount 4
        ] ;
    sh:targetClass simpl:GeneralServiceProperties .
`;

  allSchemas = jasmine.createSpy('allSchemas').and.returnValue(
    of({
      Service: [
        {
          id: 'infrastructure-offeringShape.ttl',
          name: 'Infrastructure offering',
          resourceType: 'infrastructure',
        },
        { id: 'data-CorpusShape.ttl', name: 'Data Corpus', resourceType: 'data' },
        { id: 'application-offeringShape.ttl', name: 'Application offering', resourceType: 'application' },
      ],
      Contract: ['contract-templateShape.ttl'],
    } as SdToolingSchemas),
  );
  schemaContent = jasmine.createSpy('schemaContent').and.returnValue(
    of({
      endpoint: '/sdtooling-api/v2/schemas/data-CorpusShape.ttl/content?schemaUIType=sdCreation',
      schemaId: 'data-CorpusShape.ttl',
      schemaUIType: 'sdCreation',
      content: this.mockShacl,
    } as SdSchemaContentResult),
  );
  sharingMethodsForOfferingType = jasmine.createSpy('sharingMethodsForOfferingType').and.returnValue(
    of({
      endpoint: '/sdtooling-api/v1/resourceAddresses/sharingMethods?offeringType=DATA',
      offeringType: 'DATA',
      sharingMethods: ['HTTP'],
    } as SdSharingMethodsResult),
  );
  resourceAddressTemplates = jasmine.createSpy('resourceAddressTemplates').and.returnValue(
    of({
      offeringType: 'DATA',
      sharingMethodId: 'HTTP',
      templates: [{ id: 'template-1', title: 'Default Template' }],
    } as SdResourceAddressTemplatesResult),
  );
  resourceAddressTemplateSchema = jasmine.createSpy('resourceAddressTemplateSchema').and.returnValue(
    of({
      endpoint: '/sdtooling-api/v1/resourceAddresses/templates/template-1/schema',
      templateId: 'template-1',
      schema: {
        type: 'object',
        title: 'Asset properties',
        properties: {
          endpoint: { type: 'string', title: 'Endpoint' },
        },
        required: ['endpoint'],
      },
    }),
  );
  resourceAddressTemplateUiSchema = jasmine.createSpy('resourceAddressTemplateUiSchema').and.returnValue(
    of({
      endpoint: '/sdtooling-api/v1/resourceAddresses/templates/template-1/uiSchema',
      templateId: 'template-1',
      uiSchema: {},
    }),
  );
  accessPolicyActions = jasmine.createSpy('accessPolicyActions').and.returnValue(
    of({
      endpoint: '/sdtooling-api/v1/policies/actions',
      options: [
        { label: 'Fetch', value: 'fetch' },
        { label: 'Return', value: 'return' },
      ],
    } as SdPolicyOptionsResult),
  );
  identityAttributes = jasmine.createSpy('identityAttributes').and.returnValue(
    of({
      endpoint: '/sdtooling-api/v1/policies/identityAttributes',
      options: [
        { label: 'identifier1', value: 'code1' },
        { label: 'identifier2', value: 'code2' },
      ],
    } as SdPolicyOptionsResult),
  );
  getBaseUrl = jasmine.createSpy('getBaseUrl').and.returnValue('/sdtooling-api/v2');

  enrichAndValidateSchema = jasmine
    .createSpy('enrichAndValidateSchema')
    .and.callFake((_schemaId: string, _templateId: string, payload: Record<string, unknown>) =>
      of({ ...payload, id: 'urn:example:enriched-sd' }),
    );

  publishSelfDescriptionToCatalogue = jasmine
    .createSpy('publishSelfDescriptionToCatalogue')
    .and.callFake((selfDescription: Record<string, unknown>) =>
      of({ ...selfDescription, id: 'urn:example:published-sd' }),
    );

  signSelfDescription = jasmine
    .createSpy('signSelfDescription')
    .and.callFake((credentialSubject: Record<string, unknown>) =>
      of({
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        credentialSubject,
        proof: {
          type: 'JsonWebSignature2020',
        },
        type: 'VerifiableCredential',
      }),
    );
}

describe('SdToolingViewComponent', () => {
  let component: SdToolingViewComponent;
  let service: MockSdToolingService;
  let fixture: ComponentFixture<SdToolingViewComponent>;
  let showAlert: jasmine.Spy;
  let sdWarmupRun: jasmine.Spy;
  let routerNavigate: jasmine.Spy;
  const currentEdcConfig$ = new BehaviorSubject<EdcConfig | undefined>({
    connectorName: 'c1',
    managementUrl: 'https://example/m',
    defaultUrl: 'https://example/d',
    protocolUrl: 'https://example/p',
    federatedCatalogEnabled: false,
    dashboardMocksEnabled: false,
  });

  beforeEach(async () => {
    service = new MockSdToolingService();
    showAlert = jasmine.createSpy('showAlert');
    sdWarmupRun = jasmine.createSpy('run').and.returnValue(Promise.resolve());
    routerNavigate = jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [SdToolingViewComponent, TranslateModule.forRoot()],
      providers: [
        { provide: SdToolingService, useValue: service },
        {
          provide: DASHBOARD_RUNTIME_FEATURE_FLAGS,
          useValue: {
            authMode: 'bypass',
          },
        },
        { provide: ModalAndAlertService, useValue: { showAlert } },
        { provide: SdMatchedAssetsWarmupService, useValue: { run: sdWarmupRun } },
        { provide: DashboardStateService, useValue: { currentEdcConfig$: currentEdcConfig$.asObservable() } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({ schemaId: 'data-CorpusShape.ttl' }) },
          },
        },
        { provide: Router, useValue: { navigate: routerNavigate } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SdToolingViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should not render schema selector', () => {
    expect(fixture.nativeElement.querySelector('#service-schema-selector')).toBeNull();
  });

  it('should load and format service options from schemas', () => {
    expect(service.allSchemas).toHaveBeenCalled();
    expect(component.serviceSchemaOptions.length).toBe(3);
    expect(component.serviceSchemaOptions.map(option => option.label)).toEqual([
      'Infrastructure offering',
      'Data Corpus',
      'Application offering',
    ]);
  });

  it('should redirect to offer selection when schemaId query param is missing', async () => {
    TestBed.resetTestingModule();
    const redirectNavigate = jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true));
    await TestBed.configureTestingModule({
      imports: [SdToolingViewComponent, TranslateModule.forRoot()],
      providers: [
        { provide: SdToolingService, useValue: service },
        { provide: DASHBOARD_RUNTIME_FEATURE_FLAGS, useValue: { authMode: 'bypass' } },
        { provide: ModalAndAlertService, useValue: { showAlert } },
        { provide: SdMatchedAssetsWarmupService, useValue: { run: sdWarmupRun } },
        { provide: DashboardStateService, useValue: { currentEdcConfig$: currentEdcConfig$.asObservable() } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
        { provide: Router, useValue: { navigate: redirectNavigate } },
      ],
    }).compileComponents();

    const redirectFixture = TestBed.createComponent(SdToolingViewComponent);
    redirectFixture.detectChanges();
    await redirectFixture.whenStable();

    expect(redirectNavigate).toHaveBeenCalledWith(['/contract-definitions/new']);
  });

  it('should map v2 schema objects with label=title when available and value=id', async () => {
    service.allSchemas.and.returnValue(
      of({
        Service: [
          {
            id: 'data-DataSchema',
            name: 'DataSchema',
            title: 'DataSchema title',
            resourceType: 'data',
          },
          {
            id: 'application-ApplicationSchema',
            name: 'ApplicationSchema',
            resourceType: 'application',
          },
          {
            id: 'data-NoResourceTypeSchema',
            name: 'Invalid schema',
          },
        ],
      } as SdToolingSchemas),
    );

    fixture = TestBed.createComponent(SdToolingViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.serviceSchemaOptions).toEqual([
      { value: 'data-DataSchema', label: 'DataSchema title', resourceType: 'data' },
      { value: 'application-ApplicationSchema', label: 'ApplicationSchema', resourceType: 'application' },
    ]);
  });

  it('should use schema id for schema content and resourceType for offeringType calls', async () => {
    service.allSchemas.and.returnValue(
      of({
        Service: [
          {
            id: 'data-DataSchema',
            name: 'DataSchema',
            resourceType: 'data',
          },
        ],
      } as SdToolingSchemas),
    );

    fixture = TestBed.createComponent(SdToolingViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    component.selectedSchema = 'data-DataSchema';
    component.onSchemaSelected();
    await fixture.whenStable();

    expect(service.schemaContent).toHaveBeenCalledWith('data-DataSchema', 'sdCreation');
    expect(service.sharingMethodsForOfferingType).toHaveBeenCalledWith('DATA');
  });

  it('should trigger schema content and sharing methods calls on selection', async () => {
    component.selectedSchema = 'data-CorpusShape.ttl';
    component.onSchemaSelected();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(service.schemaContent).toHaveBeenCalledWith('data-CorpusShape.ttl', 'sdCreation');
    expect(service.sharingMethodsForOfferingType).toHaveBeenCalledWith('DATA');
    expect(service.resourceAddressTemplates).not.toHaveBeenCalled();
    expect(service.resourceAddressTemplateSchema).not.toHaveBeenCalled();
    expect(service.resourceAddressTemplateUiSchema).not.toHaveBeenCalled();
    expect(service.accessPolicyActions).toHaveBeenCalled();
    expect(service.identityAttributes).toHaveBeenCalled();
    expect(component.schemaContentResult?.schemaId).toBe('data-CorpusShape.ttl');
    expect(component.sharingMethodsResult?.offeringType).toBe('DATA');
    expect(component.selectedSharingMethod).toBe('');
    expect(component.selectedTemplateId).toBe('');
    expect(component.policyActionOptions).toEqual([
      { label: 'Fetch', value: 'fetch' },
      { label: 'Return', value: 'return' },
    ]);
    expect(component.policyAttributeOptions).toEqual([
      { label: 'identifier1', value: 'code1' },
      { label: 'identifier2', value: 'code2' },
    ]);
    expect(component.sections.length).toBeGreaterThan(0);
    expect(component.templateSections.length).toBe(0);
    expect(component.dynamicForm.contains('simpl_generalServiceProperties_simpl_name')).toBeTrue();
  });

  it('should exclude schema options that do not have resourceType', async () => {
    service.allSchemas.and.returnValue(
      of({
        Service: [
          {
            id: 'data-DataSchema',
            name: 'DataSchema',
            resourceType: 'data',
          },
          { id: 'invalid-schema', name: 'Invalid schema without resourceType' },
        ],
      } as SdToolingSchemas),
    );

    fixture = TestBed.createComponent(SdToolingViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.serviceSchemaOptions).toEqual([
      { value: 'data-DataSchema', label: 'DataSchema', resourceType: 'data' },
    ]);
    expect(component.serviceSchemaOptions.find(option => option.value === 'invalid-schema')).toBeUndefined();
  });

  it('loads template details only after explicit template selection', async () => {
    component.selectedSchema = 'data-CorpusShape.ttl';
    component.onSchemaSelected();
    await fixture.whenStable();
    fixture.detectChanges();

    component.selectedSharingMethod = 'HTTP';
    component.onSharingMethodChanged();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(service.resourceAddressTemplates).toHaveBeenCalledWith('HTTP', 'DATA');
    expect(component.templateOptions.length).toBe(1);
    expect(component.selectedTemplateId).toBe('');

    component.selectedTemplateId = 'template-1';
    component.onTemplateChanged();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(service.resourceAddressTemplateSchema).toHaveBeenCalledWith('template-1');
    expect(service.resourceAddressTemplateUiSchema).toHaveBeenCalledWith('template-1');
    expect(component.templateSections.length).toBeGreaterThan(0);
    expect(component.templateForm.contains('simpl_assetProperties_endpoint')).toBeTrue();
  });

  it('renders dynamic form fields after selecting data-CorpusShape', async () => {
    component.selectedSchema = 'data-CorpusShape.ttl';
    component.onSchemaSelected();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const dynamicInput = compiled.querySelector('#simpl_generalServiceProperties_simpl_name');

    expect(dynamicInput).toBeTruthy();
  });

  it('blocks next step when current section is invalid', async () => {
    component.selectedSchema = 'data-CorpusShape.ttl';
    component.onSchemaSelected();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.currentStepIndex).toBe(0);
    expect(component.canGoNextStep()).toBeFalse();

    component.nextStep();
    fixture.detectChanges();

    expect(component.currentStepIndex).toBe(0);
    expect(component.getNextStepBlockReason()).toContain('Completa los campos obligatorios');
  });

  it('allows next step when current section is valid', async () => {
    component.selectedSchema = 'data-CorpusShape.ttl';
    component.onSchemaSelected();
    await fixture.whenStable();
    fixture.detectChanges();

    (
      component.dynamicForm.get('simpl_generalServiceProperties_simpl_name') as {
        setValue: (value: string) => void;
      } | null
    )?.setValue('My Data Offer');
    expect(component.canGoNextStep()).toBeTrue();

    component.nextStep();
    fixture.detectChanges();

    expect(component.currentStepIndex).toBe(1);
    expect(component.isSummaryStep()).toBeTrue();
  });

  it('shows review summary details and selected field values in summary step', async () => {
    component.selectedSchema = 'data-CorpusShape.ttl';
    component.onSchemaSelected();
    await fixture.whenStable();
    fixture.detectChanges();

    (
      component.dynamicForm.get('simpl_generalServiceProperties_simpl_name') as {
        setValue: (value: string) => void;
      } | null
    )?.setValue('My Data Offer');
    component.nextStep();
    fixture.detectChanges();

    const reviewSections = component.getReviewSummarySections();
    const flattenedValues = reviewSections.flatMap(section => section.fields.flatMap(field => field.values));
    const flattenedLabels = reviewSections.flatMap(section => section.fields.map(field => field.label.toLowerCase()));

    expect(reviewSections.length).toBeGreaterThan(0);
    expect(flattenedValues).toContain('My Data Offer');
    expect(flattenedLabels).toContain('name');
    expect(flattenedLabels).not.toContain('keywords');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Review before submit');
    expect(compiled.textContent).toContain('Schema ID:');
    expect(compiled.textContent).toContain('data-CorpusShape.ttl');
    expect(compiled.textContent).toContain('My Data Offer');
    expect(compiled.textContent).not.toContain('Form payload preview');
    expect(compiled.textContent).not.toContain('Template payload preview');
    expect(compiled.textContent).not.toContain('Request cURL Preview (Bypass Mode)');
  });

  it('builds self-description payload including assetProperties derived from template endpoint', async () => {
    component.selectedSchema = 'data-CorpusShape.ttl';
    component.onSchemaSelected();
    await fixture.whenStable();
    fixture.detectChanges();

    component.selectedSharingMethod = 'HTTP';
    component.onSharingMethodChanged();
    await fixture.whenStable();
    fixture.detectChanges();

    component.selectedTemplateId = 'template-1';
    component.onTemplateChanged();
    await fixture.whenStable();
    fixture.detectChanges();

    (
      component.dynamicForm.get('simpl_generalServiceProperties_simpl_name') as {
        setValue: (value: string) => void;
      } | null
    )?.setValue('My Data Offer');
    (
      component.templateForm.get('simpl_assetProperties_endpoint') as { setValue: (value: string) => void } | null
    )?.setValue('https://provider.example/data');
    fixture.detectChanges();

    const enrichSpy = (
      service as unknown as {
        enrichAndValidateSchema: jasmine.Spy;
      }
    ).enrichAndValidateSchema;
    const signSpy = (
      service as unknown as {
        signSelfDescription: jasmine.Spy;
      }
    ).signSelfDescription;
    const publishSpy = (
      service as unknown as {
        publishSelfDescriptionToCatalogue: jasmine.Spy;
      }
    ).publishSelfDescriptionToCatalogue;

    await component.submitCreateSelfDescription();

    expect(enrichSpy).toHaveBeenCalled();
    expect(signSpy).toHaveBeenCalled();
    expect(publishSpy).toHaveBeenCalled();

    const payload = enrichSpy.calls.mostRecent().args[2] as Record<string, unknown>;
    expect(payload['simpl:assetProperties']).toBeDefined();
    const assetProps = payload['simpl:assetProperties'] as Record<string, unknown>;
    expect(assetProps['simpl:providerDataAddress']).toBe('{"endpoint":"https://provider.example/data"}');

    const signPayload = signSpy.calls.mostRecent().args[0] as Record<string, unknown>;
    expect(signPayload['@type']).toBe('simpl:DataOffering');

    const publishPayload = publishSpy.calls.mostRecent().args[0] as Record<string, unknown>;
    expect(publishPayload['credentialSubject']).toBeDefined();
    expect(publishPayload['proof']).toBeDefined();
    expect(showAlert).toHaveBeenCalledWith(jasmine.any(String), undefined, 'success', 6);
    expect(sdWarmupRun).toHaveBeenCalledWith({ trigger: 'sd-publish' });
    expect(component.submissionPublishedId).toBe('');
  });

  it('fails submit when signer response is not direct verifiable credential', async () => {
    service.signSelfDescription.and.returnValue(
      of({
        unexpected: true,
      }),
    );

    component.selectedSchema = 'data-CorpusShape.ttl';
    component.onSchemaSelected();
    await fixture.whenStable();
    fixture.detectChanges();

    component.selectedSharingMethod = 'HTTP';
    component.onSharingMethodChanged();
    await fixture.whenStable();
    fixture.detectChanges();

    component.selectedTemplateId = 'template-1';
    component.onTemplateChanged();
    await fixture.whenStable();
    fixture.detectChanges();

    (
      component.dynamicForm.get('simpl_generalServiceProperties_simpl_name') as {
        setValue: (value: string) => void;
      } | null
    )?.setValue('My Data Offer');
    (
      component.templateForm.get('simpl_assetProperties_endpoint') as { setValue: (value: string) => void } | null
    )?.setValue('https://provider.example/data');

    await component.submitCreateSelfDescription();
    expect(component.submissionError).toContain('direct verifiable credential');
  });

  it('shows published id from nested response shape', async () => {
    service.publishSelfDescriptionToCatalogue.and.returnValue(
      of({
        resourceDescription: {
          id: 'urn:example:nested-published-sd',
        },
      }),
    );

    component.selectedSchema = 'data-CorpusShape.ttl';
    component.onSchemaSelected();
    await fixture.whenStable();
    fixture.detectChanges();

    component.selectedSharingMethod = 'HTTP';
    component.onSharingMethodChanged();
    await fixture.whenStable();
    fixture.detectChanges();

    component.selectedTemplateId = 'template-1';
    component.onTemplateChanged();
    await fixture.whenStable();
    fixture.detectChanges();

    (
      component.dynamicForm.get('simpl_generalServiceProperties_simpl_name') as {
        setValue: (value: string) => void;
      } | null
    )?.setValue('My Data Offer');
    (
      component.templateForm.get('simpl_assetProperties_endpoint') as { setValue: (value: string) => void } | null
    )?.setValue('https://provider.example/data');

    await component.submitCreateSelfDescription();

    expect(showAlert).toHaveBeenCalledWith(
      jasmine.stringMatching(/urn:example:nested-published-sd/),
      undefined,
      'success',
      6,
    );
    expect(sdWarmupRun).toHaveBeenCalledWith({ trigger: 'sd-publish' });
    expect(component.submissionPublishedId).toBe('');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.alert-success')).toBeNull();
  });
});

describe('SdToolingViewComponent offer-creation deep link', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('merges pending schema from sessionStorage and loads schema content for schemaId query', async () => {
    sessionStorage.setItem(
      OFFER_CREATION_PENDING_SCHEMA_STORAGE_KEY,
      JSON.stringify({ id: 'CorpusSchema_ES', resourceType: 'data', label: 'Corpus' }),
    );

    const deepService = new MockSdToolingService();
    deepService.allSchemas.and.returnValue(of({ Service: [], Contract: [] }));

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SdToolingViewComponent, TranslateModule.forRoot()],
      providers: [
        { provide: SdToolingService, useValue: deepService },
        { provide: DASHBOARD_RUNTIME_FEATURE_FLAGS, useValue: { authMode: 'bypass' } },
        { provide: ModalAndAlertService, useValue: { showAlert: jasmine.createSpy('showAlert') } },
        { provide: SdMatchedAssetsWarmupService, useValue: { run: jasmine.createSpy('run') } },
        {
          provide: DashboardStateService,
          useValue: { currentEdcConfig$: new BehaviorSubject<EdcConfig | undefined>(undefined).asObservable() },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({ schemaId: 'CorpusSchema_ES' }) },
          },
        },
        {
          provide: Router,
          useValue: { navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)) },
        },
      ],
    }).compileComponents();

    const deepFixture = TestBed.createComponent(SdToolingViewComponent);
    const comp = deepFixture.componentInstance;
    deepFixture.detectChanges();
    await deepFixture.whenStable();

    expect(deepFixture.nativeElement.querySelector('#service-schema-selector')).toBeNull();
    expect(deepService.schemaContent).toHaveBeenCalledWith('CorpusSchema_ES', 'sdCreation');
    expect(comp.selectedSchema).toBe('CorpusSchema_ES');
    expect(sessionStorage.getItem(OFFER_CREATION_PENDING_SCHEMA_STORAGE_KEY)).toBeNull();
    expect(comp.offerTypeLabel).toBe('offers.createPage.corpus.title');
    const heading = deepFixture.nativeElement.querySelector('h1');
    expect(heading?.textContent?.trim()).toBe('createoffer');
    expect(deepFixture.nativeElement.querySelector('lib-breadcrumbs')).not.toBeNull();
    expect(deepFixture.nativeElement.textContent).not.toContain('SD Tooling');
    expect(deepFixture.nativeElement.querySelector('[data-cy="offer-wizard-stepper-panel"]')).not.toBeNull();
    expect(deepFixture.nativeElement.querySelector('.offer-wizard-step-active')).not.toBeNull();
    expect(deepFixture.nativeElement.querySelector('[data-cy="offer-wizard-form-panel"]')).not.toBeNull();
  });

  it('uses pending offer label for page title when schema id has no i18n mapping', async () => {
    sessionStorage.setItem(
      OFFER_CREATION_PENDING_SCHEMA_STORAGE_KEY,
      JSON.stringify({ id: 'legacy-CorpusShape.ttl', resourceType: 'data', label: 'Corpus legacy' }),
    );

    const deepService = new MockSdToolingService();
    deepService.allSchemas.and.returnValue(of({ Service: [], Contract: [] } as SdToolingSchemas));

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SdToolingViewComponent, TranslateModule.forRoot()],
      providers: [
        { provide: SdToolingService, useValue: deepService },
        { provide: DASHBOARD_RUNTIME_FEATURE_FLAGS, useValue: { authMode: 'bypass' } },
        { provide: ModalAndAlertService, useValue: { showAlert: jasmine.createSpy('showAlert') } },
        { provide: SdMatchedAssetsWarmupService, useValue: { run: jasmine.createSpy('run') } },
        {
          provide: DashboardStateService,
          useValue: { currentEdcConfig$: new BehaviorSubject<EdcConfig | undefined>(undefined).asObservable() },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({ schemaId: 'legacy-CorpusShape.ttl' }) },
          },
        },
        {
          provide: Router,
          useValue: { navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)) },
        },
      ],
    }).compileComponents();

    const deepFixture = TestBed.createComponent(SdToolingViewComponent);
    const comp = deepFixture.componentInstance;
    deepFixture.detectChanges();
    await deepFixture.whenStable();

    expect(comp.offerTypeLabel).toBe('Corpus legacy');
    expect(deepFixture.nativeElement.querySelector('h1')?.textContent?.trim()).toBe('createoffer');
  });

  it('remaps offer schema and reloads when dashboard language changes', async () => {
    const deepService = new MockSdToolingService();
    deepService.allSchemas.and.returnValue(
      of({
        Service: [
          { id: 'CorpusSchema_ES', name: 'Corpus ES', resourceType: 'data' },
          { id: 'CorpusSchema_CA', name: 'Corpus CA', resourceType: 'data' },
        ],
        Contract: [],
      } as SdToolingSchemas),
    );
    const navigate = jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true));
    const showAlert = jasmine.createSpy('showAlert');

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SdToolingViewComponent, TranslateModule.forRoot()],
      providers: [
        { provide: SdToolingService, useValue: deepService },
        { provide: DASHBOARD_RUNTIME_FEATURE_FLAGS, useValue: { authMode: 'bypass' } },
        { provide: ModalAndAlertService, useValue: { showAlert } },
        { provide: SdMatchedAssetsWarmupService, useValue: { run: jasmine.createSpy('run') } },
        {
          provide: DashboardStateService,
          useValue: { currentEdcConfig$: new BehaviorSubject<EdcConfig | undefined>(undefined).asObservable() },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({ schemaId: 'CorpusSchema_ES' }) },
          },
        },
        { provide: Router, useValue: { navigate } },
      ],
    }).compileComponents();

    const deepFixture = TestBed.createComponent(SdToolingViewComponent);
    const comp = deepFixture.componentInstance;
    deepFixture.detectChanges();
    await deepFixture.whenStable();

    expect(comp.selectedSchema).toBe('CorpusSchema_ES');
    deepService.schemaContent.calls.reset();
    navigate.calls.reset();

    TestBed.inject(TranslateService).use('ca');
    await deepFixture.whenStable();

    expect(navigate).toHaveBeenCalledWith([], {
      relativeTo: jasmine.anything(),
      queryParams: { schemaId: 'CorpusSchema_CA' },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    expect(deepService.schemaContent).toHaveBeenCalledWith('CorpusSchema_CA', 'sdCreation');
    expect(comp.selectedSchema).toBe('CorpusSchema_CA');
    expect(showAlert).not.toHaveBeenCalled();
  });

  it('shows unavailable toast and keeps schema when target locale is missing', async () => {
    sessionStorage.setItem(
      OFFER_CREATION_PENDING_SCHEMA_STORAGE_KEY,
      JSON.stringify({ id: 'CorpusSchema_ES', resourceType: 'data', label: 'Corpus' }),
    );

    const deepService = new MockSdToolingService();
    deepService.allSchemas.and.returnValue(of({ Service: [], Contract: [] } as SdToolingSchemas));
    const navigate = jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true));
    const showAlert = jasmine.createSpy('showAlert');

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SdToolingViewComponent, TranslateModule.forRoot()],
      providers: [
        { provide: SdToolingService, useValue: deepService },
        { provide: DASHBOARD_RUNTIME_FEATURE_FLAGS, useValue: { authMode: 'bypass' } },
        { provide: ModalAndAlertService, useValue: { showAlert } },
        { provide: SdMatchedAssetsWarmupService, useValue: { run: jasmine.createSpy('run') } },
        {
          provide: DashboardStateService,
          useValue: { currentEdcConfig$: new BehaviorSubject<EdcConfig | undefined>(undefined).asObservable() },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({ schemaId: 'CorpusSchema_ES' }) },
          },
        },
        { provide: Router, useValue: { navigate } },
      ],
    }).compileComponents();

    const deepFixture = TestBed.createComponent(SdToolingViewComponent);
    const comp = deepFixture.componentInstance;
    deepFixture.detectChanges();
    await deepFixture.whenStable();

    expect(comp.selectedSchema).toBe('CorpusSchema_ES');
    navigate.calls.reset();

    TestBed.inject(TranslateService).use('ca');
    await deepFixture.whenStable();

    expect(showAlert).toHaveBeenCalledWith('offers.createPage.typeUnavailableCorpus', undefined, 'error', 6);
    expect(deepService.schemaContent).toHaveBeenCalledTimes(1);
    expect(deepService.schemaContent).toHaveBeenCalledWith('CorpusSchema_ES', 'sdCreation');
    expect(comp.selectedSchema).toBe('CorpusSchema_ES');
    expect(navigate).not.toHaveBeenCalled();
  });
});
