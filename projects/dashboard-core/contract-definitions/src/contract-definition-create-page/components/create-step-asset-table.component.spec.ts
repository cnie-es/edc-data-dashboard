import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateStepAssetTableComponent } from './create-step-asset-table.component';

describe('CreateStepAssetTableComponent', () => {
  let component: CreateStepAssetTableComponent;
  let fixture: ComponentFixture<CreateStepAssetTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateStepAssetTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateStepAssetTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('opens filters modal when requested', () => {
    const openSpy = jasmine.createSpy('open');
    (component as unknown as { filtersModal?: { open: () => void } }).filtersModal = { open: openSpy };

    component.openFiltersModal();

    expect(openSpy).toHaveBeenCalled();
  });

  it('applies selected filters as chips and removes chips', () => {
    component.toggleFilterSelection({ category: 'assetType', value: 'corpus', checked: true });
    component.draftVisibilityChanged('public');
    component.draftPriceChanged('free');
    component.applyFilters();

    expect(component.appliedFilterChips.length).toBe(3);
    expect(
      component.appliedFilterChips.some(chip => chip.category === 'assetType' && chip.value === 'corpus'),
    ).toBeTrue();
    expect(
      component.appliedFilterChips.some(chip => chip.category === 'visibility' && chip.value === 'public'),
    ).toBeTrue();
    expect(component.appliedFilterChips.some(chip => chip.category === 'price' && chip.value === 'free')).toBeTrue();

    component.clearSingleFilterChip('assetType', 'corpus');

    expect(component.appliedFilterChips.length).toBe(2);
    expect(component.appliedFilterChips.every(chip => chip.category !== 'assetType')).toBeTrue();
  });
});
