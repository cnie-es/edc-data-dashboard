import { FormGroup } from '@angular/forms';
import {
  buildDynamicSectionsFromSchema,
  createDynamicFormGroup,
  isValueEmpty,
} from '@eclipse-edc/dashboard-core/shacl-schema';
import type { DynamicField, DynamicSection } from '@eclipse-edc/dashboard-core/shacl-schema';
import { asRecord } from '../sdtooling-record.util';
import { parseArrayTokens } from '../form-state/sdtooling-view.form-state';
import {
  extractTemplateUiControlMap,
  extractTemplateUiFieldOrder,
  sortFieldsByUiOrder,
} from './sdtooling-template-ui-schema';
import type { TemplateUiControlConfig } from '../sdtooling-view.types';

export const wrapTemplateSchemaAsRoot = (schema: Record<string, unknown>, assetPropertiesTitle: string): unknown => {
  const sectionNode = {
    type: 'object',
    title: typeof schema['title'] === 'string' ? schema['title'] : assetPropertiesTitle,
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

export interface TemplateFormBuildResult {
  sections: DynamicSection[];
  form: FormGroup;
}

export const buildTemplateFormFromSchema = (
  schema: Record<string, unknown>,
  assetPropertiesTitle: string,
): TemplateFormBuildResult => {
  const wrappedSchema = wrapTemplateSchemaAsRoot(schema, assetPropertiesTitle);
  const sections = buildDynamicSectionsFromSchema(wrappedSchema);
  return {
    sections,
    form: createDynamicFormGroup(sections),
  };
};

export const applyTemplateSchemaDefaults = (
  schema: Record<string, unknown>,
  sections: DynamicSection[],
  form: FormGroup,
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
      const control = form.get(field.controlName);
      if (!control) {
        continue;
      }
      control.setValue(defaultValue);
    }
  }
};

export const applyTemplateUiSchemaToForm = (
  uiSchema: Record<string, unknown> | Record<string, unknown>[],
  sections: DynamicSection[],
  form: FormGroup,
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
      const control = form.get(field.controlName);
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

const isPolicyCardField = (field: DynamicField): boolean => {
  return (field as DynamicField & { controlType: string }).controlType === 'policy-card-array';
};

export const normalizeTemplateFieldValue = (field: DynamicField, value: unknown): unknown => {
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

  if (isPolicyCardField(field)) {
    if (!Array.isArray(value)) {
      return undefined;
    }
    const cards = value
      .filter(card => card && typeof card === 'object')
      .map(card => card as Record<string, unknown>)
      .filter(card => Object.values(card).some(cardValue => !isValueEmpty(cardValue)));
    return cards.length > 0 ? cards : undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  return value;
};

export const buildPayloadFromSections = (
  sections: DynamicSection[],
  formGroup: FormGroup,
): Record<string, Record<string, unknown>> => {
  const payload: Record<string, Record<string, unknown>> = {};

  for (const section of sections) {
    const sectionPayload: Record<string, unknown> = {};
    for (const field of section.fields) {
      const rawValue = formGroup.get(field.controlName)?.value;
      const normalizedValue = normalizeTemplateFieldValue(field, rawValue);
      if (typeof normalizedValue !== 'undefined') {
        sectionPayload[field.key] = normalizedValue;
      }
    }
    if (Object.keys(sectionPayload).length > 0) {
      payload[section.key] = sectionPayload;
    }
  }

  return payload;
};

export const extractTemplateData = (payload: Record<string, Record<string, unknown>>): Record<string, unknown> => {
  const first = Object.values(payload)[0];
  return first && typeof first === 'object' ? first : {};
};

export const buildTemplatePayloadForSubmission = (
  templateSections: DynamicSection[],
  templateForm: FormGroup,
): Record<string, unknown> => {
  const sectionPayload = buildPayloadFromSections(templateSections, templateForm);
  return extractTemplateData(sectionPayload);
};
