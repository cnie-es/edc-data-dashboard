import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import type { EdcConfig } from '@eclipse-edc/dashboard-core';
import { DashboardStateService, SD_MATCHED_ASSETS_MOCK_CONTRACT_POLICY_ID } from '@eclipse-edc/dashboard-core';
import { PolicyDetailPanelComponent } from './policy-detail-panel.component';
import { PolicyService } from '../policy.service';

const POLICY_ID = 'contract-policy-1';

const USAGE_POLICY_DEFINITION = {
  '@id': POLICY_ID,
  '@type': 'PolicyDefinition',
  policy: {
    '@type': 'odrl:Set',
    'odrl:assigner': 'dataprovider03',
    'odrl:permission': {
      'odrl:action': { '@id': 'odrl:use' },
      'odrl:assignee': { uid: 'EDVAL_PARTICIPANT' },
      'odrl:constraint': {
        'odrl:leftOperand': { '@id': 'odrl:count' },
        'odrl:operator': { '@id': 'odrl:lteq' },
        'odrl:rightOperand': '10',
      },
    },
  },
};

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
  let policyServiceSpy: jasmine.SpyObj<PolicyService>;
  let currentEdcConfig$: BehaviorSubject<EdcConfig | undefined>;

  const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

  const render = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    policyServiceSpy = jasmine.createSpyObj<PolicyService>('PolicyService', ['getPolicyDefinitionById']);
    policyServiceSpy.getPolicyDefinitionById.and.resolveTo(USAGE_POLICY_DEFINITION as never);

    currentEdcConfig$ = new BehaviorSubject<EdcConfig | undefined>(defaultEdcConfig);

    await TestBed.configureTestingModule({
      imports: [PolicyDetailPanelComponent, TranslateModule.forRoot()],
      providers: [
        { provide: PolicyService, useValue: policyServiceSpy },
        {
          provide: DashboardStateService,
          useValue: { currentEdcConfig$: currentEdcConfig$.asObservable() },
        },
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('es', {
      identityAttribute: { EDVAL_PARTICIPANT: 'Participante' },
      sdtooling: { usageRestrictedNumber: 'Número restringido de usos' },
    });
    translate.use('es');

    fixture = TestBed.createComponent(PolicyDetailPanelComponent);
    fixture.componentRef.setInput('policyId', POLICY_ID);
  });

  it('shows the policy summary like the offer form usage policy cards', async () => {
    fixture.componentRef.setInput('policyKind', 'Contratación');
    await render();

    expect(policyServiceSpy.getPolicyDefinitionById).toHaveBeenCalledOnceWith(POLICY_ID);
    expect(text()).toContain('dataprovider03');
    expect(text()).toContain('Participante');
    expect(text()).toContain('Número restringido de usos');
    expect(text()).toContain('10');
  });

  it('loads ODRL JSON from embedded mock without calling management', async () => {
    fixture.componentRef.setInput('policyId', SD_MATCHED_ASSETS_MOCK_CONTRACT_POLICY_ID);
    await render();

    const odrlTab = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(b =>
      (b.textContent ?? '').includes('tabOdrl'),
    );
    (odrlTab as HTMLButtonElement).click();
    await render();

    expect(policyServiceSpy.getPolicyDefinitionById).not.toHaveBeenCalled();
    expect(text()).toContain('http://simpl.eu/odrl/actions/consume');
  });

  it('shows a load error when the policy definition cannot be fetched', async () => {
    policyServiceSpy.getPolicyDefinitionById.and.rejectWith(new Error('boom'));
    await render();

    expect(text()).toContain('policies.detail.odrlLoadError');
  });
});
