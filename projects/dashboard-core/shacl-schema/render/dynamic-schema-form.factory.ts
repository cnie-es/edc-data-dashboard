import { FormControl, FormGroup } from '@angular/forms';
import type { DynamicField, DynamicSection } from './dynamic-schema-form.types';
import { buildDynamicSectionsFromSchema } from './dynamic-schema-form.mapping';
import { createEmptyObjectArrayRow } from './dynamic-schema-form.object-array';
import { createFieldValidators } from './dynamic-schema-form.validators';
import { createEmptyPolicyCardForField, isPolicyCardArrayField } from './dynamic-schema-form.policy';
import {
  applyKnownSparqlConstraintAutoCorrections,
  createKnownSparqlConstraintValidator,
} from './dynamic-schema-form.sparql-constraints';

export { buildDynamicSectionsFromSchema };
export type {
  DynamicControlType,
  DynamicField,
  DynamicFieldType,
  DynamicObjectArrayItemField,
  DynamicObjectArrayItemObjectArrayField,
  DynamicObjectArrayItemObjectGroupField,
  DynamicObjectArrayItemScalarField,
  DynamicObjectArrayItemSubsection,
  DynamicObjectArrayItemTokenArrayField,
  DynamicSection,
  DynamicSubsection,
  PolicyCardValue,
} from './dynamic-schema-form.types';
export {
  buildSubsectionsFromFields,
  flattenSubsectionFields,
  getDisplaySubsections,
} from './dynamic-schema-form.subsections';
export { collectObjectArrayItemFields } from './dynamic-schema-form.mapping';
export {
  createEmptyObjectArrayRow,
  getObjectArrayItemFields,
  getObjectArrayMaxItemsFromSchema,
  getObjectArrayMinItemsFromSchema,
  initialValueForObjectArrayItemField,
  isObjectArrayArrayItemField,
  isObjectArrayItemFieldValueEmpty,
  isObjectArrayRowInvalid,
  isObjectGroupArrayItemField,
  isScalarObjectArrayItemField,
  isTokenArrayObjectArrayItemField,
} from './dynamic-schema-form.object-array';
export {
  createEmptyPolicyCard,
  getPolicyCardErrorKeys,
  hasPolicyCardFieldError,
  isAccessPolicyField,
  isPolicyCardArrayField,
  isPolicyCardBlank,
  isUsagePolicyField,
  POLICY_CARD_ARRAY_CONTROL_TYPE,
  validatePolicyCardsValue,
} from './dynamic-schema-form.policy';
export type { PolicyCardError, PolicyCardErrorKey } from './dynamic-schema-form.policy';
export { isValueEmpty, toArrayValues } from './dynamic-schema-form.normalizers';
export { readNestedPathFromField, writeNestedValue } from './dynamic-schema-form.nested-path';

export const createDynamicFormGroup = (sections: DynamicSection[]): FormGroup => {
  const controls: Record<string, FormControl> = {};
  for (const section of sections) {
    for (const field of section.fields) {
      controls[field.controlName] = new FormControl(initialFieldValue(field), createFieldValidators(field));
    }
  }
  const formGroup = new FormGroup(controls);
  const sparqlConstraintValidator = createKnownSparqlConstraintValidator(sections);
  if (sparqlConstraintValidator) {
    formGroup.setValidators(sparqlConstraintValidator);
    applyKnownSparqlConstraintAutoCorrections(formGroup, sections);
    formGroup.updateValueAndValidity({ emitEvent: false });
  }
  return formGroup;
};

const initialFieldValue = (field: DynamicField): unknown => {
  if (isPolicyCardArrayField(field)) {
    return [createEmptyPolicyCardForField(field.key)];
  }
  if (field.controlType === 'object-array') {
    const minItems = typeof field.schema['minItems'] === 'number' ? (field.schema['minItems'] as number) : undefined;
    const shouldInitializeWithItem = field.required || (typeof minItems === 'number' && minItems > 0);
    if (!shouldInitializeWithItem) {
      return [];
    }
    const objectArrayFields = Array.isArray(field.objectArrayFields) ? field.objectArrayFields : [];
    return [createEmptyObjectArrayRow(objectArrayFields)];
  }
  if (field.controlType === 'select-multiple') {
    return [];
  }
  const defaultValue = field.schema['default'];
  if (typeof defaultValue !== 'undefined') {
    return defaultValue;
  }
  if (field.type === 'boolean') {
    return false;
  }

  // Campos hiddenInFrontend (ver handleSimplConfigureProperty): el usuario
  // nunca los rellena, así que si no traen ya un sh:defaultValue en el TTL
  // (leído arriba vía field.schema['default']), les damos un valor "de
  // sistema" por tipo para que nunca viajen vacíos y el campo (o, en
  // consecuencia, todo el nodo que lo contiene) desaparezca del payload.
  if (field.schema['hiddenInFrontend'] === true) {
    return hiddenFieldFallbackValue(field.type);
  }

  return '';
};

const hiddenFieldFallbackValue = (type: DynamicField['type']): unknown => {
  switch (type) {
    case 'boolean':
      return false;
    case 'number':
    case 'integer':
      return 0;
    case 'array':
      return [];
    default:
      // Placeholder alfanumérico neutro: pasa el sh:pattern habitual de los
      // campos de texto ocultos (p. ej. simpl:format). Si en el futuro un
      // campo oculto+requerido usa un patrón distinto (URL, fecha, etc.),
      // este fallback genérico puede no ser válido y habrá que tratarlo caso
      // a caso.
      return 'unspecified';
  }
};
