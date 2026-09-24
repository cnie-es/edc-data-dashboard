import type { DynamicObjectArrayItemField } from './dynamic-schema-form.types';
import { asNumber, asRecord, asString } from './dynamic-schema-form.normalizers';

export const isScalarObjectArrayItemField = (
  field: DynamicObjectArrayItemField,
): field is import('./dynamic-schema-form.types').DynamicObjectArrayItemScalarField => field.kind === 'scalar';

export const isObjectGroupArrayItemField = (
  field: DynamicObjectArrayItemField,
): field is import('./dynamic-schema-form.types').DynamicObjectArrayItemObjectGroupField =>
  field.kind === 'object-group';

export const isObjectArrayArrayItemField = (
  field: DynamicObjectArrayItemField,
): field is import('./dynamic-schema-form.types').DynamicObjectArrayItemObjectArrayField =>
  field.kind === 'object-array';

export const isTokenArrayObjectArrayItemField = (
  field: DynamicObjectArrayItemField,
): field is import('./dynamic-schema-form.types').DynamicObjectArrayItemTokenArrayField => field.kind === 'token-array';

export const getObjectArrayItemFields = (field: DynamicObjectArrayItemField): DynamicObjectArrayItemField[] => {
  if (isObjectArrayArrayItemField(field)) {
    return field.itemFields;
  }
  if (isObjectGroupArrayItemField(field)) {
    return field.fields;
  }
  return [];
};

export const createEmptyObjectArrayRow = (itemFields: DynamicObjectArrayItemField[]): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  for (const itemField of itemFields) {
    row[itemField.key] = initialValueForObjectArrayItemField(itemField);
  }
  return row;
};

export const initialValueForObjectArrayItemField = (itemField: DynamicObjectArrayItemField): unknown => {
  if (isScalarObjectArrayItemField(itemField)) {
    return itemField.type === 'boolean' ? false : '';
  }
  if (isObjectGroupArrayItemField(itemField)) {
    return createEmptyObjectArrayRow(itemField.fields);
  }
  if (isObjectArrayArrayItemField(itemField)) {
    const minItems = asNumber(itemField.schema['minItems']);
    const shouldInitializeWithItem = itemField.required || (typeof minItems === 'number' && minItems > 0);
    if (!shouldInitializeWithItem) {
      return [];
    }
    return [createEmptyObjectArrayRow(itemField.itemFields)];
  }
  if (isTokenArrayObjectArrayItemField(itemField)) {
    return [];
  }
  return '';
};

export const isObjectArrayItemFieldValueEmpty = (itemField: DynamicObjectArrayItemField, value: unknown): boolean => {
  if (isScalarObjectArrayItemField(itemField)) {
    if (itemField.type === 'boolean') {
      return value !== true;
    }
    if (value === undefined || value === null) {
      return true;
    }
    return String(value).trim().length === 0;
  }
  if (isObjectGroupArrayItemField(itemField)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return true;
    }
    const groupRecord = value as Record<string, unknown>;
    return itemField.fields.some(nestedField => {
      if (!nestedField.required) {
        return false;
      }
      return isObjectArrayItemFieldValueEmpty(nestedField, groupRecord[nestedField.key]);
    });
  }
  if (isObjectArrayArrayItemField(itemField)) {
    if (!Array.isArray(value) || value.length === 0) {
      return itemField.required;
    }
    return value.some(row => isObjectArrayRowInvalid(itemField.itemFields, row));
  }
  if (isTokenArrayObjectArrayItemField(itemField)) {
    if (!Array.isArray(value) || value.length === 0) {
      return itemField.required;
    }
    return value.every(token => String(token).trim().length === 0);
  }
  return true;
};

export const isObjectArrayRowInvalid = (itemFields: DynamicObjectArrayItemField[], row: unknown): boolean => {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return true;
  }
  const rowRecord = row as Record<string, unknown>;
  return itemFields.some(itemField => {
    if (!itemField.required) {
      return false;
    }
    return isObjectArrayItemFieldValueEmpty(itemField, rowRecord[itemField.key]);
  });
};

export const getObjectArrayMinItemsFromSchema = (schema: Record<string, unknown>): number | undefined => {
  return asNumber(schema['minItems']);
};

export const getObjectArrayMaxItemsFromSchema = (schema: Record<string, unknown>): number | undefined => {
  return asNumber(schema['maxItems']);
};

export const resolveSelectOptions = (
  fieldNode: Record<string, unknown>,
): { selectOptions: string[]; enumOptionLabels?: Record<string, string> } => {
  const enumOptions = Array.isArray(fieldNode['enum'])
    ? (fieldNode['enum'] as unknown[]).filter((option): option is string => typeof option === 'string')
    : [];
  const oneOfOptionNodes = Array.isArray(fieldNode['oneOf']) ? fieldNode['oneOf'].map(option => asRecord(option)) : [];
  const oneOfOptions = oneOfOptionNodes
    .map(option => asString(option?.['const']))
    .filter((option): option is string => typeof option === 'string');
  const oneOfOptionLabels = oneOfOptionNodes.reduce<Record<string, string>>((labels, option) => {
    const optionValue = asString(option?.['const']);
    const optionLabel = asString(option?.['title']);
    if (optionValue && optionLabel) {
      labels[optionValue] = optionLabel;
    }
    return labels;
  }, {});
  const selectOptions = enumOptions.length ? enumOptions : oneOfOptions;
  const enumOptionLabels =
    enumOptions.length || Object.keys(oneOfOptionLabels).length === 0 ? undefined : oneOfOptionLabels;
  return { selectOptions, enumOptionLabels };
};
