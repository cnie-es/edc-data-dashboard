import type { ValidationErrors } from '@angular/forms';
import type { TranslateService } from '@ngx-translate/core';
import type { DynamicField, DynamicObjectArrayItemScalarField } from './dynamic-schema-form.types';
import type { NestedFieldError } from './dynamic-schema-form.validators';

const pathsEqual = (left: string[], right: string[]): boolean =>
  left.length === right.length && left.every((segment, index) => segment === right[index]);

export const findNestedFieldError = (
  controlErrors: Record<string, unknown> | null | undefined,
  rowIndex: number,
  path: string[],
): ValidationErrors | null => {
  if (!controlErrors) {
    return null;
  }
  const nestedFieldErrors = controlErrors['nestedFieldErrors'];
  if (!Array.isArray(nestedFieldErrors)) {
    return null;
  }
  const match = (nestedFieldErrors as NestedFieldError[]).find(
    entry => entry.rowIndex === rowIndex && pathsEqual(entry.path, path),
  );
  return match?.errors ?? null;
};

const resolveValidationErrors = (
  label: string,
  errors: Record<string, unknown> | null | undefined,
  translate: TranslateService,
): string => {
  if (!errors) {
    return '';
  }
  const labelParams = { label };
  if (errors['sparqlConstraint']) {
    const sparqlConstraint = errors['sparqlConstraint'] as { message?: string };
    return sparqlConstraint.message ?? translate.instant('dynamicForm.fieldCheck', labelParams);
  }
  if (errors['required']) {
    return translate.instant('dynamicForm.fieldRequired', labelParams);
  }
  if (errors['minlength']) {
    const minlength = errors['minlength'] as { requiredLength?: number };
    return translate.instant('dynamicForm.fieldMinLength', {
      ...labelParams,
      min: minlength.requiredLength,
    });
  }
  if (errors['maxlength']) {
    const maxlength = errors['maxlength'] as { requiredLength?: number };
    return translate.instant('dynamicForm.fieldMaxLength', {
      ...labelParams,
      max: maxlength.requiredLength,
    });
  }
  if (errors['min']) {
    const min = errors['min'] as { min?: number };
    return translate.instant('dynamicForm.fieldMin', { ...labelParams, min: min.min });
  }
  if (errors['max']) {
    const max = errors['max'] as { max?: number };
    return translate.instant('dynamicForm.fieldMax', { ...labelParams, max: max.max });
  }
  if (errors['pattern']) {
    return translate.instant('dynamicForm.fieldInvalidFormat', labelParams);
  }
  if (errors['maxItems']) {
    const maxItems = errors['maxItems'] as { max?: number };
    return translate.instant('dynamicForm.fieldMaxItems', { ...labelParams, max: maxItems.max });
  }
  if (errors['minItems']) {
    const minItems = errors['minItems'] as { min?: number };
    return translate.instant('dynamicForm.fieldMinItems', { ...labelParams, min: minItems.min });
  }
  if (errors['itemMinLength']) {
    const itemMinLength = errors['itemMinLength'] as { min?: number };
    return translate.instant('dynamicForm.fieldItemMinLength', { ...labelParams, min: itemMinLength.min });
  }
  if (errors['objectArrayRequired']) {
    return translate.instant('dynamicForm.fieldObjectArrayRequired', labelParams);
  }
  if (errors['uri']) {
    return translate.instant('dynamicForm.fieldInvalidUri', labelParams);
  }
  return translate.instant('dynamicForm.fieldCheck', labelParams);
};

export const resolveDynamicFieldError = (
  field: DynamicField,
  errors: Record<string, unknown> | null | undefined,
  translate: TranslateService,
): string => {
  if (!errors) {
    return '';
  }
  if (Array.isArray(errors['nestedFieldErrors']) && (errors['nestedFieldErrors'] as NestedFieldError[]).length > 0) {
    return translate.instant('dynamicForm.objectArrayNestedErrors', { label: field.label });
  }
  if (Array.isArray(errors['policyCardErrors']) && errors['policyCardErrors'].length > 0) {
    return translate.instant('dynamicForm.policyCardIncomplete', { label: field.label });
  }
  return resolveValidationErrors(field.label, errors, translate);
};

export const resolveObjectArrayItemFieldError = (
  itemField: DynamicObjectArrayItemScalarField,
  errors: ValidationErrors | null | undefined,
  translate: TranslateService,
): string => resolveValidationErrors(itemField.label, errors, translate);
