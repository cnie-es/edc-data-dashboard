import type { FormGroup } from '@angular/forms';
import { isValueEmpty } from '@eclipse-edc/dashboard-core/shacl-schema';
import type { DynamicField, DynamicSection } from '@eclipse-edc/dashboard-core/shacl-schema';

/**
 * What the user had filled in when the offer schema is swapped for another language variant
 * (`CorpusSchema_ES` → `CorpusSchema_EN`…). Control names derive from section keys and `sh:path`s, which are
 * the same across language variants, so values can be matched back by control name.
 */
export interface SdtoolingFormSnapshot {
  dynamicValues: Record<string, unknown>;
  arrayDrafts: Record<string, string>;
  stepIndex: number;
  sharingMethod: string;
  templateId: string;
  templateValues: Record<string, unknown>;
}

const isOptionOf = (field: DynamicField, value: unknown): boolean =>
  field.enumOptions.some(option => String(option) === String(value));

/** Select values are only restored when the option still exists in the newly loaded schema. */
const isRestorableValue = (field: DynamicField, value: unknown): boolean => {
  if (field.controlType === 'select') {
    return isOptionOf(field, value);
  }
  if (field.controlType === 'select-multiple') {
    return Array.isArray(value) && value.every(item => isOptionOf(field, item));
  }
  return true;
};

/**
 * Copies the non-empty snapshot values into the controls of the same name. Fields missing from the new schema,
 * disabled controls and select values that are no longer valid options are skipped.
 */
export const restoreFormValues = (
  form: FormGroup,
  sections: DynamicSection[],
  values: Record<string, unknown>,
): void => {
  for (const section of sections) {
    for (const field of section.fields) {
      if (!Object.prototype.hasOwnProperty.call(values, field.controlName)) {
        continue;
      }
      const value = values[field.controlName];
      if (isValueEmpty(value) || !isRestorableValue(field, value)) {
        continue;
      }
      const control = form.get(field.controlName);
      if (!control || control.disabled) {
        continue;
      }
      control.setValue(value);
      control.markAsDirty();
    }
  }
};
