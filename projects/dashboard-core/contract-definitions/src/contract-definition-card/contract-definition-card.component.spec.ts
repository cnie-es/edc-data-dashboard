import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import type { ContractDefinition } from '@think-it-labs/edc-connector-client';

import { ContractDefinitionCardComponent } from './contract-definition-card.component';
import type { OfferCardViewModel } from '../offer-card-view-model';
import { formatOfferPublishedAt } from '../format-offer-published-at';

describe('formatOfferPublishedAt', () => {
  it('formats a slash-separated calendar date with Spanish month abbreviations', () => {
    expect(formatOfferPublishedAt('2026/01/27')).toBe('27 Ene 2026');
  });

  it('returns the raw value when the string is not a valid date', () => {
    expect(formatOfferPublishedAt('Unknown date')).toBe('Unknown date');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(formatOfferPublishedAt('   ')).toBe('');
  });
});

describe('ContractDefinitionCardComponent', () => {
  let component: ContractDefinitionCardComponent;
  let fixture: ComponentFixture<ContractDefinitionCardComponent>;

  const minimalCard: OfferCardViewModel = {
    contractDefinition: { id: 'x' } as ContractDefinition,
    id: 'x',
    accessPolicyId: 'a',
    contractPolicyId: 'c',
    assetsSelector: [],
    offerSelfDescriptionId: 'did:test:1',
    title: 'T',
    providerLabel: 'P',
    subtitle: 'S',
    description: 'D',
    publishedAt: new Date('2026-01-01').toISOString(),
    assetDisplayName: 'T',
    policySummary: 'pol',
    policyEnrichmentStatus: 'ready',
    priceLabel: 'Gratuito',
    statusBadge: 'Cat. Público',
    keywords: [],
    license: { title: '', spdx: '', url: '' },
    assetTypeKey: 'corpus',
    isPublicOffering: true,
    isFreeOffering: true,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContractDefinitionCardComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(ContractDefinitionCardComponent);
    component = fixture.componentInstance;
    component.contractDefinition = minimalCard;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('disables Ver oferta when disableOpenDetails is true', () => {
    component.disableOpenDetails = true;
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('[data-cy="offer-view-details"]') as HTMLButtonElement | null;
    expect(btn?.disabled).toBe(true);
  });

  it('disables Ver oferta when offerSelfDescriptionId is missing', () => {
    component.disableOpenDetails = false;
    component.contractDefinition = { ...minimalCard, offerSelfDescriptionId: undefined };
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('[data-cy="offer-view-details"]') as HTMLButtonElement | null;
    expect(btn?.disabled).toBe(true);
  });

  it('enables Ver oferta when offerSelfDescriptionId is set and disableOpenDetails is false', () => {
    component.disableOpenDetails = false;
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('[data-cy="offer-view-details"]') as HTMLButtonElement | null;
    expect(btn?.disabled).toBe(false);
  });

  it('hides Ver oferta and flags the card when the offer belongs to this connector', () => {
    component.isOwnOffer = true;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-cy="offer-view-details"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-cy="offer-own-badge"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-cy="offer-own-hint"]')).toBeTruthy();
  });

  it('shows skeleton placeholders for all card fields while policy enrichment is pending', () => {
    component.contractDefinition = { ...minimalCard, policyEnrichmentStatus: 'loading' };
    fixture.detectChanges();
    const skeletons = fixture.nativeElement.querySelectorAll('.skeleton');
    expect(skeletons.length).toBeGreaterThanOrEqual(10);
    expect(fixture.nativeElement.textContent).not.toContain('T');
    expect(fixture.nativeElement.textContent).not.toContain('Gratuito');
    expect(fixture.nativeElement.querySelector('[data-cy="offer-view-details"]')).toBeNull();
  });
});
