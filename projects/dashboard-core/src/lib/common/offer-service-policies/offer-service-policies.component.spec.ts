import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { OfferServicePoliciesComponent } from './offer-service-policies.component';

const ACCESS_POLICY =
  '{"assigner":{"uid":"devtelefonica"},"permission":[' +
  '{"assignee":{"uid":"DATA_SEARCHER"},"action":["http://simpl.eu/odrl/actions/search"]},' +
  '{"assignee":{"uid":"CONSUMER"},"action":["http://simpl.eu/odrl/actions/consume"],"constraint":[' +
  '{"leftOperand":"http://www.w3.org/ns/odrl/2/dateTime","operator":"http://www.w3.org/ns/odrl/2/gteq","rightOperand":"2026-02-01T14:38:40Z"}]}]}';

const USAGE_POLICY =
  '{"permission":[' +
  '{"assignee":{"uid":"EDVAL_PARTICIPANT"},"action":["http://www.w3.org/ns/odrl/2/use"],"constraint":[' +
  '{"leftOperand":"http://www.w3.org/ns/odrl/2/count","operator":"http://www.w3.org/ns/odrl/2/lteq","rightOperand":"10"}]},' +
  '{"assignee":{"uid":"CONSUMER"},"action":["http://www.w3.org/ns/odrl/2/use"],"constraint":[' +
  '{"leftOperand":"http://www.w3.org/ns/odrl/2/deletion","operator":"http://www.w3.org/ns/odrl/2/eq","rightOperand":"after_use"}]}]}';

describe('OfferServicePoliciesComponent', () => {
  let fixture: ComponentFixture<OfferServicePoliciesComponent>;

  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfferServicePoliciesComponent, TranslateModule.forRoot()],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('es', {
      identityAttribute: { DATA_SEARCHER: 'Buscador de datos', CONSUMER: 'Consumidor', EDVAL_PARTICIPANT: 'Participante' },
      policyAction: { SEARCH: 'Buscar', CONSUME: 'Consumir' },
      sdtooling: {
        usageRestrictedNumber: 'Número restringido de usos',
        usageDeletionAfter: 'Eliminación tras el uso',
      },
    });
    translate.use('es');

    fixture = TestBed.createComponent(OfferServicePoliciesComponent);
  });

  it('shows every permission of the access and usage policies', () => {
    fixture.componentRef.setInput('accessPolicyRaw', ACCESS_POLICY);
    fixture.componentRef.setInput('usagePolicyRaw', USAGE_POLICY);
    fixture.detectChanges();

    const access = host().querySelector('[data-cy="offer-service-policy-access"]')?.textContent ?? '';
    expect(access).toContain('devtelefonica');
    expect(access).toContain('Buscar');
    expect(access).toContain('Buscador de datos');
    expect(access).toContain('Consumir');
    expect(access).toContain('Consumidor');

    const usage = host().querySelector('[data-cy="offer-service-policy-usage"]')?.textContent ?? '';
    expect(usage).toContain('Participante');
    expect(usage).toContain('Número restringido de usos');
    expect(usage).toContain('10');
    expect(usage).toContain('Eliminación tras el uso');
  });

  it('opens the ODRL of the selected policy', () => {
    fixture.componentRef.setInput('accessPolicyRaw', ACCESS_POLICY);
    fixture.componentRef.setInput('usagePolicyRaw', USAGE_POLICY);
    fixture.detectChanges();

    host().querySelector<HTMLButtonElement>('[data-cy="offer-service-policy-odrl-usage"]')?.click();
    fixture.detectChanges();

    const dialog = host().querySelector<HTMLDialogElement>('[data-cy="offer-service-policy-odrl-dialog"]');
    expect(dialog?.open).toBeTrue();
    expect(dialog?.textContent).toContain('http://www.w3.org/ns/odrl/2/count');
    expect(dialog?.textContent).not.toContain('http://simpl.eu/odrl/actions/search');
  });

  it('keeps the ODRL button when the policy JSON cannot be parsed', () => {
    fixture.componentRef.setInput('usagePolicyRaw', 'not json');
    fixture.detectChanges();

    expect(host().querySelector('[data-cy="offer-service-policy-access"]')).toBeNull();
    expect(host().querySelector('[data-cy="offer-service-policy-usage"]')?.textContent).toContain(
      'policies.detail.summaryEmpty',
    );
    expect(host().querySelector('[data-cy="offer-service-policy-odrl-usage"]')).not.toBeNull();
  });

  it('renders nothing without policies', () => {
    fixture.detectChanges();

    expect(host().querySelector('[data-cy="offer-service-policies"]')).toBeNull();
  });
});
