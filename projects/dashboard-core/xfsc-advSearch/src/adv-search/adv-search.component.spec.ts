import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { DASHBOARD_RUNTIME_FEATURE_FLAGS } from '@eclipse-edc/dashboard-core';
import { AdvSearchComponent } from './adv-search.component';
import { SimplAdvancedSearchService } from '../advanced-search.service';
import { AdvancedSearchStateService } from '../advanced-search-state.service';
import type { SchemaList } from '../advanced-search.service';

class MockAdvancedSearchService {
  allSchemas = jasmine.createSpy('allSchemas').and.returnValue(
    of({
      Service: ['first.ttl', 'second.ttl'],
    } as SchemaList),
  );
  schemaContent = jasmine.createSpy('schemaContent');
  getBaseUrl = jasmine.createSpy('getBaseUrl').and.returnValue('/xfsc-advsearch-be/v1');
}

class MockAdvancedSearchStateService {
  readonly info$ = new BehaviorSubject<string | undefined>(undefined);
  readonly results$ = of([]);
  readonly loading$ = of(false);
  readonly error$ = of(undefined);
  readonly hasCompletedSearch$ = of(false);

  clearResults = jasmine.createSpy('clearResults');
  searchSimple = jasmine.createSpy('searchSimple');
  searchAdvanced = jasmine.createSpy('searchAdvanced');
}

const makeSchema = (sectionKey: string, fieldKey: string) =>
  JSON.stringify({
    root: {
      RootShape: {
        type: 'object',
        properties: {
          [sectionKey]: {
            type: 'object',
            properties: {
              [fieldKey]: {
                type: 'string',
              },
            },
          },
        },
      },
    },
  });

describe('AdvSearchComponent', () => {
  let component: AdvSearchComponent;
  let service: MockAdvancedSearchService;

  beforeEach(async () => {
    service = new MockAdvancedSearchService();

    await TestBed.configureTestingModule({
      imports: [AdvSearchComponent],
      providers: [
        { provide: SimplAdvancedSearchService, useValue: service },
        { provide: AdvancedSearchStateService, useValue: new MockAdvancedSearchStateService() },
      ],
    })
      .overrideComponent(AdvSearchComponent, {
        set: {
          template: '',
        },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(AdvSearchComponent);
    component = fixture.componentInstance;
  });

  it('ignores stale schema responses when selection changes quickly', () => {
    const firstResponse$ = new Subject<string>();
    const secondResponse$ = new Subject<string>();
    service.schemaContent.and.returnValues(firstResponse$, secondResponse$);

    component.selectedTtl = 'first.ttl';
    component.onSchemaChange();
    component.selectedTtl = 'second.ttl';
    component.onSchemaChange();

    secondResponse$.next(makeSchema('simpl:secondSection', 'simpl:secondField'));
    secondResponse$.complete();
    firstResponse$.next(makeSchema('simpl:firstSection', 'simpl:firstField'));
    firstResponse$.complete();

    expect(component.sections.length).toBe(1);
    expect(component.sections[0].key).toBe('simpl:secondSection');
  });

  it('does not generate request cURL preview when bypass mode is disabled', () => {
    service.schemaContent.and.returnValue(of(makeSchema('simpl:section', 'simpl:field')));

    component.selectedTtl = 'first.ttl';
    component.onSchemaChange();
    (component.dynamicForm.get('simpl_section_simpl_field') as any)?.setValue('abc');
    component.onSearch();

    expect(component.searchPayloadPreview).toContain('"simpl:section"');
    expect(component.requestCurlPreview).toBe('');
    expect(component.requestEndpointPreview).toBe('');
  });

  it('generates bypass request cURL preview after search', async () => {
    await TestBed.resetTestingModule();

    const bypassService = new MockAdvancedSearchService();
    bypassService.schemaContent.and.returnValue(of(makeSchema('simpl:section', 'simpl:field')));

    await TestBed.configureTestingModule({
      imports: [AdvSearchComponent],
      providers: [
        { provide: SimplAdvancedSearchService, useValue: bypassService },
        { provide: AdvancedSearchStateService, useValue: new MockAdvancedSearchStateService() },
        {
          provide: DASHBOARD_RUNTIME_FEATURE_FLAGS,
          useValue: {
            authMode: 'bypass',
          },
        },
      ],
    })
      .overrideComponent(AdvSearchComponent, {
        set: {
          template: '',
        },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(AdvSearchComponent);
    const bypassComponent = fixture.componentInstance;
    bypassComponent.selectedTtl = 'first.ttl';
    bypassComponent.onSchemaChange();
    (bypassComponent.dynamicForm.get('simpl_section_simpl_field') as any)?.setValue('abc');
    bypassComponent.onSearch();

    expect(bypassComponent.requestEndpointPreview).toBe('/xfsc-advsearch-be/v1/selfDescriptions/advanced');
    expect(bypassComponent.requestCurlPreview).toContain(
      'curl -X POST "/xfsc-advsearch-be/v1/selfDescriptions/advanced"',
    );
    expect(bypassComponent.requestCurlPreview).toContain('Authorization: Bearer <not-required-in-bypass-mode>');
    expect(bypassComponent.requestCurlPreview).toContain('"simpl:section"');
  });

  it('copies cURL preview to clipboard in bypass mode', async () => {
    await TestBed.resetTestingModule();

    const bypassService = new MockAdvancedSearchService();
    bypassService.schemaContent.and.returnValue(of(makeSchema('simpl:section', 'simpl:field')));

    await TestBed.configureTestingModule({
      imports: [AdvSearchComponent],
      providers: [
        { provide: SimplAdvancedSearchService, useValue: bypassService },
        { provide: AdvancedSearchStateService, useValue: new MockAdvancedSearchStateService() },
        {
          provide: DASHBOARD_RUNTIME_FEATURE_FLAGS,
          useValue: {
            authMode: 'bypass',
          },
        },
      ],
    })
      .overrideComponent(AdvSearchComponent, {
        set: {
          template: '',
        },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(AdvSearchComponent);
    const bypassComponent = fixture.componentInstance;
    bypassComponent.selectedTtl = 'first.ttl';
    bypassComponent.onSchemaChange();
    (bypassComponent.dynamicForm.get('simpl_section_simpl_field') as any)?.setValue('abc');
    bypassComponent.onSearch();

    const clipboardWriteSpy = jasmine.createSpy('writeText').and.resolveTo();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteSpy,
      },
    });

    await bypassComponent.copyCurlPreview();

    expect(clipboardWriteSpy).toHaveBeenCalledWith(bypassComponent.requestCurlPreview);
    expect(bypassComponent.requestPreviewMessage).toBe('cURL copied to clipboard.');
  });
});
