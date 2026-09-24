import type { FormGroup } from '@angular/forms';
import {
  isAccessPolicyField,
  isUsagePolicyField,
  isValueEmpty,
  readNestedPathFromField,
  writeNestedValue,
  isObjectArrayArrayItemField,
  isObjectGroupArrayItemField,
  isScalarObjectArrayItemField,
  isTokenArrayObjectArrayItemField,
  type DynamicField,
  type DynamicObjectArrayItemField,
  type DynamicSection,
} from '@eclipse-edc/dashboard-core/shacl-schema';
import { parseArrayTokens } from '../form-state/sdtooling-view.form-state';
import { TOP_LEVEL_PRIMITIVE_SECTION_KEY } from '../sdtooling-view.types';
import { buildPolicyFieldSubmissionValue } from './sdtooling-policy-permissions.builder';

// Toda DynamicSection que NO sea el grupo de campos planos del root
// (TOP_LEVEL_PRIMITIVE_SECTION_KEY) representa, por construcción, un sh:node
// real del schema (DataProperties, AssetProperties, GeneralServiceProperties,
// ProviderInformation, etc. — ver buildDynamicSectionsFromSchema). Esos nodos
// deben viajar siempre como objeto en el payload, aunque ninguno de sus
// campos (todos opcionales o no) tenga valor, para que el nodo no desaparezca
// del JSON-LD solo por estar vacío. Como es estructural y no una lista de
// rdfTypes hardcodeada, cubre automáticamente cualquier sh:node opcional que
// se añada al schema en el futuro sin tener que tocar este archivo.
const isRealNodeSection = (section: DynamicSection): boolean => section.key !== TOP_LEVEL_PRIMITIVE_SECTION_KEY;

export const normalizeObjectArrayRow = (
  itemFields: DynamicObjectArrayItemField[],
  row: Record<string, unknown>,
): Record<string, unknown> | undefined => {
  const normalizedNode: Record<string, unknown> = {};

  for (const itemField of itemFields) {
    const rawValue = row[itemField.key];
    const normalizedValue = normalizeObjectArrayItemFieldValue(itemField, rawValue);
    if (typeof normalizedValue !== 'undefined') {
      normalizedNode[itemField.key] = normalizedValue;
    }
  }

  return Object.keys(normalizedNode).length > 0 ? normalizedNode : undefined;
};

const normalizeObjectArrayItemFieldValue = (itemField: DynamicObjectArrayItemField, value: unknown): unknown => {
  if (isScalarObjectArrayItemField(itemField)) {
    if (isValueEmpty(value)) {
      return undefined;
    }
    if (itemField.type === 'boolean') {
      return value === true || String(value).toLowerCase() === 'true';
    }
    if (itemField.type === 'number' || itemField.type === 'integer') {
      const asNumber = typeof value === 'number' ? value : Number.parseFloat(String(value));
      return Number.isFinite(asNumber) ? asNumber : undefined;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    return value;
  }

  if (isObjectGroupArrayItemField(itemField)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }
    return normalizeObjectArrayRow(itemField.fields, value as Record<string, unknown>);
  }

  if (isObjectArrayArrayItemField(itemField)) {
    if (!Array.isArray(value)) {
      return undefined;
    }
    const normalizedItems = value
      .filter(item => item && typeof item === 'object')
      .map(item => normalizeObjectArrayRow(itemField.itemFields, item as Record<string, unknown>))
      .filter((item): item is Record<string, unknown> => !!item);
    return normalizedItems.length > 0 ? normalizedItems : undefined;
  }

  if (isTokenArrayObjectArrayItemField(itemField)) {
    const tokens = parseArrayTokens(value);
    return tokens.length > 0 ? tokens : undefined;
  }

  return undefined;
};

export const normalizeFieldValueForSubmission = (field: DynamicField, value: unknown): unknown => {
  if (isValueEmpty(value)) {
    return undefined;
  }

  if (field.controlType === 'array') {
    const tokens = parseArrayTokens(value);
    return tokens.length > 0 ? tokens : undefined;
  }

  const controlType = (field as DynamicField & { controlType: string }).controlType;
  if (controlType === 'select-multiple') {
    if (!Array.isArray(value)) {
      return undefined;
    }
    const normalizedValues = value
      .map(item => (typeof item === 'string' ? item.trim() : String(item).trim()))
      .filter(item => item.length > 0);
    return normalizedValues.length > 0 ? normalizedValues : undefined;
  }
  if (field.controlType === 'object-array') {
    if (!Array.isArray(value)) {
      return undefined;
    }
    const itemFields = field.objectArrayFields ?? [];
    const normalizedItems = value
      .filter(item => item && typeof item === 'object')
      .map(item => normalizeObjectArrayRow(itemFields, item as Record<string, unknown>))
      .filter((item): item is Record<string, unknown> => !!item);
    return normalizedItems.length > 0 ? normalizedItems : undefined;
  }

  if (field.controlType === 'number') {
    const asNumber = typeof value === 'number' ? value : Number.parseFloat(String(value));
    return Number.isFinite(asNumber) ? asNumber : undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  return value;
};

export const buildSdToolingFormPayload = (sections: DynamicSection[], form: FormGroup): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};

  for (const section of sections) {
    const sectionPayload: Record<string, unknown> = {};

    for (const field of section.fields) {
      const rawValue = form.get(field.controlName)?.value;

      if (isAccessPolicyField(field.key) || isUsagePolicyField(field.key)) {
        const policyJson = buildPolicyFieldSubmissionValue(field, rawValue);
        if (policyJson) {
          sectionPayload[field.key] = policyJson;
        }
        continue;
      }

      const normalizedValue = normalizeFieldValueForSubmission(field, rawValue);
      if (typeof normalizedValue === 'undefined') {
        continue;
      }

      const nestedPath = readNestedPathFromField(field);
      if (nestedPath) {
        writeNestedValue(sectionPayload, nestedPath, normalizedValue);
      } else {
        sectionPayload[field.key] = normalizedValue;
      }
    }

    const mustAlwaysInclude = isRealNodeSection(section);
    if (Object.keys(sectionPayload).length > 0 || mustAlwaysInclude) {
      if (section.key === TOP_LEVEL_PRIMITIVE_SECTION_KEY) {
        for (const [propertyKey, propertyValue] of Object.entries(sectionPayload)) {
          payload[propertyKey] = propertyValue;
        }
        continue;
      }
      payload[section.key] = sectionPayload;
    }
  }

  return payload;
};
