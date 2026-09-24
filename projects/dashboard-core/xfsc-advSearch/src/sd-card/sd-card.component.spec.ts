import { TestBed } from '@angular/core/testing';
import { SdCardComponent } from './sd-card.component';
import type { SelfDescriptorModel } from '../models/self-descriptor.model';

describe('SdCardComponent', () => {
  const sd: SelfDescriptorModel = {
    selfDescriptionId: 'did:web:test:1',
    claimsGraphUri0: ['did:web:test:1'],
    name: 'Test offering',
    description: 'Description text',
    inLanguage: 'en',
    offeringType: 'ms:data',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SdCardComponent],
    }).compileComponents();
  });

  it('renders Mis-ofertas-aligned card shell and title', () => {
    const fixture = TestBed.createComponent(SdCardComponent);
    fixture.componentRef.setInput('sd', sd);
    fixture.componentRef.setInput('showButtons', false);
    fixture.componentRef.setInput('showDetailsButton', true);
    fixture.componentRef.setInput('detailsActionEnabled', true);
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('.card');
    expect(card?.classList.contains('bg-base-100')).toBe(true);
    expect(fixture.nativeElement.querySelector('h3')?.textContent?.trim()).toBe('Test offering');
    expect(fixture.nativeElement.textContent).toContain('Description text');
    expect(fixture.nativeElement.textContent).toContain('EN');
  });

  it('formatOfferingType strips vocabulary prefix', () => {
    const fixture = TestBed.createComponent(SdCardComponent);
    const component = fixture.componentInstance;
    expect(component.formatOfferingType('ms:data')).toBe('data');
    expect(component.formatOfferingType('omtd:Corpus')).toBe('corpus');
  });
});
