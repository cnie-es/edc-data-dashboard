import type { DynamicField } from '@eclipse-edc/dashboard-core/shacl-schema';
import { asRecord } from '../sdtooling-record.util';
import type { TemplateUiControlConfig } from '../sdtooling-view.types';

export const extractTemplateUiControlMap = (
  uiSchema: Record<string, unknown> | Record<string, unknown>[],
): Record<string, TemplateUiControlConfig> => {
  const controls: Record<string, TemplateUiControlConfig> = {};
  const root = Array.isArray(uiSchema) ? uiSchema[0] : uiSchema;
  const rootRecord = asRecord(root);
  const elements = Array.isArray(rootRecord?.['elements']) ? rootRecord['elements'] : [];

  for (const element of elements) {
    const record = asRecord(element);
    if (!record || record['type'] !== 'Control') {
      continue;
    }
    const scope = typeof record['scope'] === 'string' ? record['scope'] : '';
    const fieldKey = scope.replace('#/properties/', '').trim();
    if (!fieldKey) {
      continue;
    }

    const options = asRecord(record['options']) ?? {};
    controls[fieldKey] = {
      label: typeof record['label'] === 'string' ? record['label'] : undefined,
      readonly: options['readonly'] === true,
      inputType: options['format'] === 'password' ? 'password' : 'text',
    };
  }
  return controls;
};

export const extractTemplateUiFieldOrder = (
  uiSchema: Record<string, unknown> | Record<string, unknown>[],
): string[] => {
  const root = Array.isArray(uiSchema) ? uiSchema[0] : uiSchema;
  const rootRecord = asRecord(root);
  const elements = Array.isArray(rootRecord?.['elements']) ? rootRecord['elements'] : [];
  return elements
    .map(element => {
      const record = asRecord(element);
      const scope = typeof record?.['scope'] === 'string' ? record['scope'] : '';
      return scope.replace('#/properties/', '').trim();
    })
    .filter(value => value.length > 0);
};

export const sortFieldsByUiOrder = (fields: DynamicField[], orderedFieldKeys: string[]): DynamicField[] => {
  const rank = new Map<string, number>();
  orderedFieldKeys.forEach((key, index) => {
    rank.set(key, index);
  });
  return [...fields].sort((left, right) => {
    const leftRank = rank.get(left.key);
    const rightRank = rank.get(right.key);
    if (typeof leftRank === 'number' && typeof rightRank === 'number') {
      return leftRank - rightRank;
    }
    if (typeof leftRank === 'number') {
      return -1;
    }
    if (typeof rightRank === 'number') {
      return 1;
    }
    return 0;
  });
};

export const getTemplateFieldLabel = (
  field: DynamicField,
  uiControlsByFieldKey: Record<string, TemplateUiControlConfig>,
): string => {
  return uiControlsByFieldKey[field.key]?.label || field.label;
};

export const isTemplateFieldReadonly = (
  field: DynamicField,
  uiControlsByFieldKey: Record<string, TemplateUiControlConfig>,
): boolean => {
  return uiControlsByFieldKey[field.key]?.readonly === true;
};

export const getTemplateFieldInputType = (
  field: DynamicField,
  uiControlsByFieldKey: Record<string, TemplateUiControlConfig>,
): string => {
  const uiType = uiControlsByFieldKey[field.key]?.inputType;
  return uiType === 'password' ? 'password' : 'text';
};
