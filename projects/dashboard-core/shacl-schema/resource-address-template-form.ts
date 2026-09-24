import type { FormGroup } from '@angular/forms';
import {
  buildDynamicSectionsFromSchema,
  createDynamicFormGroup,
  isValueEmpty,
  type DynamicField,
  type DynamicSection,
} from './render/dynamic-schema-form.factory';

export interface TemplateUiControlConfig {
  label?: string;
  readonly?: boolean;
  inputType?: 'text' | 'password';
}

export interface TemplateFormBuildResult {
  sections: DynamicSection[];
  formGroup: FormGroup;
  uiControlsByFieldKey: Record<string, TemplateUiControlConfig>;
}

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;

export const wrapTemplateSchemaAsRoot = (schema: Record<string, unknown>): unknown => {
  const sectionNode = {
    type: 'object',
    title: typeof schema['title'] === 'string' ? schema['title'] : 'Asset properties',
    properties: asRecord(schema['properties']) ?? {},
    required: Array.isArray(schema['required']) ? schema['required'] : [],
  };

  return {
    root: {
      'simpl:TemplateShape': {
        type: 'object',
        properties: {
          'simpl:assetProperties': sectionNode,
        },
      },
    },
  };
};

const extractTemplateUiControlMap = (
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

const extractTemplateUiFieldOrder = (uiSchema: Record<string, unknown> | Record<string, unknown>[]): string[] => {
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

const sortFieldsByUiOrder = (fields: DynamicField[], orderedFieldKeys: string[]): DynamicField[] => {
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

const applyTemplateSchemaDefaults = (
  schema: Record<string, unknown>,
  sections: DynamicSection[],
  formGroup: FormGroup,
): void => {
  const properties = asRecord(schema['properties']) ?? {};
  for (const section of sections) {
    for (const field of section.fields) {
      const propertySchema = asRecord(properties[field.key]);
      if (!propertySchema) {
        continue;
      }
      const defaultValue = propertySchema['const'] ?? propertySchema['default'];
      if (typeof defaultValue === 'undefined') {
        continue;
      }
      const control = formGroup.get(field.controlName);
      if (!control) {
        continue;
      }
      control.setValue(defaultValue);
    }
  }
};

const applyTemplateUiSchemaToForm = (
  sections: DynamicSection[],
  formGroup: FormGroup,
  uiSchema: Record<string, unknown> | Record<string, unknown>[],
): { sections: DynamicSection[]; uiControlsByFieldKey: Record<string, TemplateUiControlConfig> } => {
  const orderedFieldKeys = extractTemplateUiFieldOrder(uiSchema);
  let nextSections = sections;
  if (orderedFieldKeys.length > 0) {
    nextSections = sections.map(section => ({
      ...section,
      fields: sortFieldsByUiOrder(section.fields, orderedFieldKeys),
    }));
  }
  const controlMap = extractTemplateUiControlMap(uiSchema);
  for (const section of nextSections) {
    for (const field of section.fields) {
      const control = formGroup.get(field.controlName);
      if (!control) {
        continue;
      }
      const isReadonly = controlMap[field.key]?.readonly === true;
      if (isReadonly) {
        control.disable({ emitEvent: false });
      } else {
        control.enable({ emitEvent: false });
      }
    }
  }
  return { sections: nextSections, uiControlsByFieldKey: controlMap };
};

export const buildTemplateFormFromSchema = (
  schema: Record<string, unknown>,
  uiSchema?: Record<string, unknown> | Record<string, unknown>[],
): TemplateFormBuildResult => {
  const wrappedSchema = wrapTemplateSchemaAsRoot(schema);
  let sections = buildDynamicSectionsFromSchema(wrappedSchema);
  const formGroup = createDynamicFormGroup(sections);
  applyTemplateSchemaDefaults(schema, sections, formGroup);

  let uiControlsByFieldKey: Record<string, TemplateUiControlConfig> = {};
  if (uiSchema) {
    const applied = applyTemplateUiSchemaToForm(sections, formGroup, uiSchema);
    sections = applied.sections;
    uiControlsByFieldKey = applied.uiControlsByFieldKey;
  }

  return { sections, formGroup, uiControlsByFieldKey };
};

const parseArrayTokens = (rawValue: unknown): string[] => {
  if (typeof rawValue !== 'string') {
    return [];
  }
  return rawValue
    .split(',')
    .map(token => token.trim())
    .filter(token => token.length > 0);
};

const normalizeFieldValue = (field: DynamicField, value: unknown): unknown => {
  if (isValueEmpty(value)) {
    return undefined;
  }

  if (field.controlType === 'array') {
    if (typeof value !== 'string') {
      return undefined;
    }
    const tokens = parseArrayTokens(value);
    return tokens.length > 0 ? tokens : undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  return value;
};

export const buildResourceAddressPayload = (
  sections: DynamicSection[],
  formGroup: FormGroup,
): Record<string, unknown> => {
  const payload: Record<string, Record<string, unknown>> = {};

  for (const section of sections) {
    const sectionPayload: Record<string, unknown> = {};
    for (const field of section.fields) {
      const rawValue = formGroup.get(field.controlName)?.value;
      const normalizedValue = normalizeFieldValue(field, rawValue);
      if (typeof normalizedValue !== 'undefined') {
        sectionPayload[field.key] = normalizedValue;
      }
    }
    if (Object.keys(sectionPayload).length > 0) {
      payload[section.key] = sectionPayload;
    }
  }

  const first = Object.values(payload)[0];
  return first && typeof first === 'object' ? first : {};
};
