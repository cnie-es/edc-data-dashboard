import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, inject, type OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { type FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import type { DynamicField } from '@eclipse-edc/dashboard-core/shacl-schema';
import { ResourceSharingMethodStateService } from '../state/resource-sharing-method-state.service';

@Component({
  selector: 'lib-sd-transfer-resource-sharing',
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './sd-transfer-resource-sharing.component.html',
})
export class SdTransferResourceSharingComponent implements OnInit {
  readonly state = inject(ResourceSharingMethodStateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.state.refresh$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.cdr.markForCheck();
      // Si solo hay una opción, seleccionarla automáticamente
      if (this.state.templateOptions.length === 1 && !this.state.selectedTemplate) {
        const uniqueValue = this.state.templateOptions[0].value;
        this.state.selectTemplate(uniqueValue);
      }
    });
  }
  get templateForm(): FormGroup {
    return this.state.templateForm;
  }

  onTemplateChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.state.selectTemplate(value);
  }

  getTemplateFieldLabel(field: DynamicField): string {
    return this.state.getTemplateFieldLabel(field.key, field.label);
  }

  isTemplateFieldReadonly(field: DynamicField): boolean {
    return this.state.isTemplateFieldReadonly(field.key);
  }

  getTemplateFieldInputType(field: DynamicField): string {
    return this.state.getTemplateFieldInputType(field.key);
  }

  isTemplateFieldInvalid(field: DynamicField): boolean {
    const control = this.templateForm.get(field.controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  getTemplateFieldError(field: DynamicField): string {
    const control = this.templateForm.get(field.controlName);
    const errors = control?.errors;
    if (!errors) {
      return '';
    }
    if (errors['required']) {
      return `${this.getTemplateFieldLabel(field)} is required.`;
    }
    return `${this.getTemplateFieldLabel(field)} is invalid.`;
  }
}
