import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { DynamicObjectArrayItemScalarField } from '@eclipse-edc/dashboard-core/shacl-schema';
import { SdtoolingObjectArrayItemFieldsComponent } from './sdtooling-object-array-item-fields.component';

describe('SdtoolingObjectArrayItemFieldsComponent', () => {
  let fixture: ComponentFixture<SdtoolingObjectArrayItemFieldsComponent>;
  let component: SdtoolingObjectArrayItemFieldsComponent;

  const amountField: DynamicObjectArrayItemScalarField = {
    kind: 'scalar',
    key: 'ms:amount',
    label: 'Amount',
    description: '',
    type: 'number',
    required: true,
    enumOptions: [],
    schema: {},
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SdtoolingObjectArrayItemFieldsComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(SdtoolingObjectArrayItemFieldsComponent);
    component = fixture.componentInstance;
    component.itemFields = [amountField];
    component.row = { 'ms:amount': '' };
    component.rowIndex = 0;
    component.nestedFieldErrors = [{ rowIndex: 0, path: ['ms:amount'], errors: { required: true } }];
    fixture.detectChanges();
  });

  it('renders nested scalar error when showErrors is true', () => {
    const translate = TestBed.inject(TranslateService);
    spyOn(translate, 'instant').and.callFake((key: string, params?: Record<string, unknown>) => {
      if (key === 'dynamicForm.fieldRequired') {
        return `${params?.['label']} is required.`;
      }
      return key;
    });

    component.showErrors = true;
    fixture.detectChanges();

    const error = fixture.nativeElement.querySelector('p.text-error');
    expect(error?.textContent?.trim()).toBe('Amount is required.');
    expect(fixture.nativeElement.querySelector('input.input-error')).not.toBeNull();
  });

  it('hides nested scalar error when showErrors is false', () => {
    component.showErrors = false;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('p.text-error')).toBeNull();
    expect(fixture.nativeElement.querySelector('input.input-error')).toBeNull();
  });
});
