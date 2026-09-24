import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PRICE_FILTER_OPTIONS, VISIBILITY_FILTER_OPTIONS } from '../../contract-definitions-ui.constants';
import { ContractDefinitionsFiltersModalComponent } from './contract-definitions-filters-modal.component';

describe('ContractDefinitionsFiltersModalComponent', () => {
  let component: ContractDefinitionsFiltersModalComponent;
  let fixture: ComponentFixture<ContractDefinitionsFiltersModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContractDefinitionsFiltersModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ContractDefinitionsFiltersModalComponent);
    component = fixture.componentInstance;
    component.assetTypeOptions = [{ value: 'corpus', label: 'Corpus', count: 2 }];
    component.visibilityOptions = VISIBILITY_FILTER_OPTIONS;
    component.priceOptions = PRICE_FILTER_OPTIONS;
    component.selectedAssetTypeValues = ['corpus'];
    component.selectedVisibility = 'public';
    component.selectedPrice = 'free';
    fixture.detectChanges();
  });

  it('returns true for selected asset type value', () => {
    expect(component.isAssetTypeSelected('corpus')).toBeTrue();
    expect(component.isAssetTypeSelected('mlmodel')).toBeFalse();
  });

  it('emits visibility and price changes', () => {
    const visibilitySpy = jasmine.createSpy('visibilityChanged');
    const priceSpy = jasmine.createSpy('priceChanged');
    component.visibilityChanged.subscribe(visibilitySpy);
    component.priceChanged.subscribe(priceSpy);

    component.onVisibilityChange('private');
    component.onPriceChange('paid');

    expect(visibilitySpy).toHaveBeenCalledWith('private');
    expect(priceSpy).toHaveBeenCalledWith('paid');
  });
});
