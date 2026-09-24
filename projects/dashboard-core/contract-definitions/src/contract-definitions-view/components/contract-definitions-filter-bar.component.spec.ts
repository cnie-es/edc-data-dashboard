import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ContractDefinitionsFilterBarComponent } from './contract-definitions-filter-bar.component';
import { TranslateModule } from '@ngx-translate/core';

describe('ContractDefinitionsFilterBarComponent', () => {
  let component: ContractDefinitionsFilterBarComponent;
  let fixture: ComponentFixture<ContractDefinitionsFilterBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContractDefinitionsFilterBarComponent, TranslateModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ContractDefinitionsFilterBarComponent);
    component = fixture.componentInstance;
    component.appliedFilterChips = [
      { category: 'assetType', categoryLabel: 'Tipo de activo', value: 'corpus', label: 'Corpus' },
    ];
    fixture.detectChanges();
  });

  it('emits remove event when chip close button is clicked', () => {
    spyOn(component.removeFilterChip, 'emit');

    const button = fixture.debugElement.query(By.css('[data-cy="remove-filter-chip"]'))
      .nativeElement as HTMLButtonElement;
    button.click();

    expect(component.removeFilterChip.emit).toHaveBeenCalledWith(component.appliedFilterChips[0]);
  });
});
