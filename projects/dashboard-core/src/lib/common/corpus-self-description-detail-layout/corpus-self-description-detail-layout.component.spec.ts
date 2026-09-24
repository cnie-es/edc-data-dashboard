import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { ComponentFixture } from '@angular/core/testing';
import { CorpusSelfDescriptionDetailLayoutComponent } from './corpus-self-description-detail-layout.component';
import type { OfferSelfDescriptionDetailViewModel } from '../../sd/corpus-offering-self-description.mapper';

describe('CorpusSelfDescriptionDetailLayoutComponent formatters', () => {
  let fixture: ComponentFixture<CorpusSelfDescriptionDetailLayoutComponent>;
  let component: CorpusSelfDescriptionDetailLayoutComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CorpusSelfDescriptionDetailLayoutComponent, TranslateModule.forRoot()],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CorpusSelfDescriptionDetailLayoutComponent);
    component = fixture.componentInstance;
  });

  it('formatDisplayLabel strips vocabulary prefixes', () => {
    expect(component.formatDisplayLabel('ms:image')).toBe('image');
    expect(component.formatDisplayLabel('omtd:pdf')).toBe('pdf');
    expect(component.formatDisplayLabel('ms:seconds')).toBe('seconds');
  });

  it('formatBoolean normalizes yes/no flags for dpLabel', () => {
    expect(component.formatBoolean('ms:noA')).toBe('no');
    expect(component.formatBoolean('noA')).toBe('no');
    expect(component.formatBoolean('ms:yesP')).toBe('yes');
    expect(component.formatBoolean('unknown')).toBe('unknown');
  });

  it('isEuroCurrency detects euro currency codes', () => {
    expect(component.isEuroCurrency('EUR')).toBeTrue();
    expect(component.isEuroCurrency('€')).toBeTrue();
    expect(component.isEuroCurrency('euro')).toBeTrue();
    expect(component.isEuroCurrency('USD')).toBeFalse();
  });

  it('formatOfferPriceLine appends VAT suffix only for euro currencies', async () => {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('es', {
      offers: {
        detail: {
          priceLine: 'Precio: {{amount}} {{currency}}',
          priceLineWithVat: 'Precio: {{amount}} {{currency}} (+IVA)',
        },
      },
    });
    await translate.use('es');
    expect(component.formatOfferPriceLine('10', 'EUR')).toContain('(+IVA)');
    expect(component.formatOfferPriceLine('10', 'USD')).not.toContain('(+IVA)');
  });

  it('does not render byte-size distribution aside when byteSize and packageFormat are empty', () => {
    const translate = TestBed.inject(TranslateService);
    const distributionTitle = translate.instant('offers.detail.cardDistribution');
    // Fixture de test: se castea en lugar de anotar. El view model tiene ~60 campos
    // (incluida la seccion `sections`), y enumerarlos aqui solo para satisfacer al
    // compilador haria que este fixture se rompiera en cada cambio del modelo.
    const vm = {
      documentId: 'doc',
      title: 'Test',
      providerLabel: 'Provider',
      offeringTypeLabel: '',
      version: '',
      isPublicOffering: false,
      description: '',
      keywords: [],
      mediaTypeLabels: [],
      lingualityLabel: '',
      modelFunctionLabels: [],
      personalDataLabel: '',
      sensitiveDataLabel: '',
      anonymizedLabel: '',
      licenseUrl: '',
      priceAmount: '',
      priceCurrency: '',
      priceType: '',
      contractTemplateUrl: '',
      usagePolicyRaw: '',
      issuanceDateIso: '',
      byteSize: '',
      packageFormat: '',
      fileFormatLabels: [],
      sizeAmount: '',
      sizeUnit: '',
      citationText: '',
      languages: [],
      relatedDocuments: [],
      provenanceBlocks: [],
    } as unknown as OfferSelfDescriptionDetailViewModel;

    fixture.componentRef.setInput('vm', vm);
    fixture.componentRef.setInput('layoutMode', 'asset');
    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain(distributionTitle);
  });
});
