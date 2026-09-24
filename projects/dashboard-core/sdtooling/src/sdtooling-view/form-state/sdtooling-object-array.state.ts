import {
  createEmptyObjectArrayRow,
  getObjectArrayMaxItemsFromSchema,
  getObjectArrayMinItemsFromSchema,
  type DynamicObjectArrayItemField,
  type DynamicObjectArrayItemObjectArrayField,
} from '@eclipse-edc/dashboard-core/shacl-schema';
import type { DynamicField } from '@eclipse-edc/dashboard-core/shacl-schema';

export const getObjectArrayItemsFromValue = (rawValue: unknown): Record<string, unknown>[] => {
  if (!Array.isArray(rawValue)) {
    return [];
  }
  return rawValue.filter(item => item && typeof item === 'object') as Record<string, unknown>[];
};

export const getObjectArrayItemsFromRow = (row: Record<string, unknown>, key: string): Record<string, unknown>[] => {
  return getObjectArrayItemsFromValue(row[key]);
};

export const getObjectArrayMaxItems = (field: DynamicField): number | undefined => {
  const schemaNode = (field as unknown as { schema?: Record<string, unknown> }).schema;
  return getObjectArrayMaxItemsFromSchema(schemaNode ?? {});
};

export const getObjectArrayMinItems = (field: DynamicField): number | undefined => {
  const schemaNode = (field as unknown as { schema?: Record<string, unknown> }).schema;
  return getObjectArrayMinItemsFromSchema(schemaNode ?? {});
};

export const getNestedObjectArrayMaxItems = (itemField: DynamicObjectArrayItemObjectArrayField): number | undefined => {
  return getObjectArrayMaxItemsFromSchema(itemField.schema);
};

export const getNestedObjectArrayMinItems = (itemField: DynamicObjectArrayItemObjectArrayField): number | undefined => {
  return getObjectArrayMinItemsFromSchema(itemField.schema);
};

export const getArrayMaxItems = (field: DynamicField): number | undefined => {
  const schemaNode = (field as unknown as { schema?: Record<string, unknown> }).schema;
  const value = schemaNode?.['maxItems'];
  return typeof value === 'number' && !Number.isNaN(value) ? value : undefined;
};

export const addObjectArrayItem = (
  items: Record<string, unknown>[],
  itemFields: DynamicObjectArrayItemField[],
): Record<string, unknown>[] => {
  return [...items, createEmptyObjectArrayRow(itemFields)];
};

export const addObjectArrayItemForField = (
  items: Record<string, unknown>[],
  field: DynamicField,
): Record<string, unknown>[] => {
  const itemSchemaFields = Array.isArray(field.objectArrayFields) ? field.objectArrayFields : [];
  return addObjectArrayItem(items, itemSchemaFields);
};

export const addNestedObjectArrayItem = (
  row: Record<string, unknown>,
  nestedField: DynamicObjectArrayItemObjectArrayField,
): Record<string, unknown> => {
  const nestedItems = getObjectArrayItemsFromRow(row, nestedField.key);
  return {
    ...row,
    [nestedField.key]: addObjectArrayItem(nestedItems, nestedField.itemFields),
  };
};

export const removeObjectArrayItemAt = (items: Record<string, unknown>[], index: number): Record<string, unknown>[] => {
  return items.filter((_, itemIndex) => itemIndex !== index);
};

export const removeNestedObjectArrayItemAt = (
  row: Record<string, unknown>,
  nestedFieldKey: string,
  nestedIndex: number,
): Record<string, unknown> => {
  const nestedItems = getObjectArrayItemsFromRow(row, nestedFieldKey);
  return {
    ...row,
    [nestedFieldKey]: removeObjectArrayItemAt(nestedItems, nestedIndex),
  };
};

export const updateObjectArrayItemAt = (
  items: Record<string, unknown>[],
  index: number,
  key: string,
  value: unknown,
): Record<string, unknown>[] => {
  return items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item));
};

export const replaceObjectArrayItemAt = (
  items: Record<string, unknown>[],
  index: number,
  row: Record<string, unknown>,
): Record<string, unknown>[] => {
  return items.map((item, itemIndex) => (itemIndex === index ? row : item));
};

export const updateNestedObjectArrayItemAt = (
  row: Record<string, unknown>,
  nestedFieldKey: string,
  nestedIndex: number,
  key: string,
  value: unknown,
): Record<string, unknown> => {
  const nestedItems = getObjectArrayItemsFromRow(row, nestedFieldKey);
  return {
    ...row,
    [nestedFieldKey]: updateObjectArrayItemAt(nestedItems, nestedIndex, key, value),
  };
};

export const updateObjectGroupItemAt = (
  row: Record<string, unknown>,
  groupKey: string,
  key: string,
  value: unknown,
): Record<string, unknown> => {
  const groupValue = row[groupKey];
  const groupRecord =
    groupValue && typeof groupValue === 'object' && !Array.isArray(groupValue)
      ? { ...(groupValue as Record<string, unknown>) }
      : {};
  groupRecord[key] = value;
  return { ...row, [groupKey]: groupRecord };
};

export const hasReachedObjectArrayMax = (items: Record<string, unknown>[], field: DynamicField): boolean => {
  const maxItems = getObjectArrayMaxItems(field);
  if (maxItems === undefined) {
    return false;
  }
  return items.length >= maxItems;
};

export const hasReachedNestedObjectArrayMax = (
  row: Record<string, unknown>,
  nestedField: DynamicObjectArrayItemObjectArrayField,
): boolean => {
  const maxItems = getNestedObjectArrayMaxItems(nestedField);
  if (maxItems === undefined) {
    return false;
  }
  return getObjectArrayItemsFromRow(row, nestedField.key).length >= maxItems;
};

export const canRemoveObjectArrayItem = (items: Record<string, unknown>[], field: DynamicField): boolean => {
  const minItems = getObjectArrayMinItems(field) ?? 0;
  return items.length > minItems;
};

export const canRemoveNestedObjectArrayItem = (
  row: Record<string, unknown>,
  nestedField: DynamicObjectArrayItemObjectArrayField,
): boolean => {
  const minItems = getNestedObjectArrayMinItems(nestedField) ?? 0;
  return getObjectArrayItemsFromRow(row, nestedField.key).length > minItems;
};
