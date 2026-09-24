import type { FormGroup } from '@angular/forms';

export const applyControlValue = (
  form: FormGroup,
  controlName: string,
  value: unknown,
  options?: { markTouched?: boolean },
): void => {
  const control = form.get(controlName);
  if (!control) {
    return;
  }
  control.setValue(value);
  control.markAsDirty();
  if (options?.markTouched !== false) {
    control.markAsTouched();
  }
  control.updateValueAndValidity();
};

export const applyArrayTokensToControl = (form: FormGroup, controlName: string, tokens: string[]): void => {
  applyControlValue(form, controlName, tokens.join(', '));
};
