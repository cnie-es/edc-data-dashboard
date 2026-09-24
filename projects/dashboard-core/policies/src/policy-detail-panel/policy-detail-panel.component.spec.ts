import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import type { EdcConfig } from '@eclipse-edc/dashboard-core';
import { DashboardStateService } from '@eclipse-edc/dashboard-core';
import { PolicyDetailPanelComponent } from './policy-detail-panel.component';
import { PolicyService } from '../policy.service';

const POLICY_ID = '46382ed4-2ee3-4aa2-aed0-c43363b01b25';
const LICENSE_URL = 'https://licence.test.com/plain.txt';

const defaultEdcConfig: EdcConfig = {
  connectorName: 'c',
  managementUrl: 'https://x/m',
  defaultUrl: 'https://x/a',
  protocolUrl: 'https://x/p',
  federatedCatalogEnabled: false,
  dashboardMocksEnabled: true,
};

describe('PolicyDetailPanelComponent', () => {
  let fixture: ComponentFixture<PolicyDetailPanelComponent>;
  let httpMock: HttpTestingController;
  let policyServiceSpy: jasmine.SpyObj<PolicyService>;
  let currentEdcConfig$: BehaviorSubject<EdcConfig | undefined>;

  beforeEach(async () => {
    policyServiceSpy = jasmine.createSpyObj<PolicyService>('PolicyService', ['getPolicyDefinitionById']);
    policyServiceSpy.getPolicyDefinitionById.and.resolveTo({
      '@id': POLICY_ID,
      '@type': 'PolicyDefinition',
      createdAt: 1771252803631,
    } as never);

    currentEdcConfig$ = new BehaviorSubject<EdcConfig | undefined>(defaultEdcConfig);

    await TestBed.configureTestingModule({
      imports: [PolicyDetailPanelComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PolicyService, useValue: policyServiceSpy },
        {
          provide: DashboardStateService,
          useValue: { currentEdcConfig$: currentEdcConfig$.asObservable() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PolicyDetailPanelComponent);
    httpMock = TestBed.inject(HttpTestingController);
    TestBed.inject(TranslateService).use('es');
    fixture.componentRef.setInput('policyId', POLICY_ID);
    fixture.componentRef.setInput('licenseUrl', LICENSE_URL);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('fetches and displays license text', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const req = httpMock.expectOne(LICENSE_URL);
    req.flush('Apache License\nVersion 2.0');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Apache License');
  });

  it('loads ODRL JSON from embedded mock without calling management', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    httpMock.expectOne(LICENSE_URL).flush('license');
    await fixture.whenStable();
    fixture.detectChanges();

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).filter(b =>
      (b.textContent ?? '').includes('ODRL'),
    );
    (buttons[0] as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(policyServiceSpy.getPolicyDefinitionById).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('http://simpl.eu/odrl/actions/consume');
  });
});
