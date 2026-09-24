import type { FormGroup } from '@angular/forms';
import {
  isValueEmpty,
  readNestedPathFromField,
  toArrayValues,
  writeNestedValue,
} from '@eclipse-edc/dashboard-core/shacl-schema';
import type { DynamicField, DynamicSection } from '@eclipse-edc/dashboard-core/shacl-schema';

export type AdvancedPayload = Record<string, Record<string, unknown>>;

export const buildAdvancedSearchPayload = (
  sections: DynamicSection[],
  form: FormGroup,
): { payload: AdvancedPayload; signature: string } => {
  const payload: AdvancedPayload = {};

  for (const section of sections) {
    const sectionPayload = buildSectionPayload(section, form);
    if (sectionPayload) {
      payload[sectionPayload.key] = sectionPayload.value;
    }
  }

  return {
    payload,
    signature: JSON.stringify(payload),
  };
};

interface SectionPayloadEntry {
  key: string;
  value: Record<string, unknown>;
}

const buildSectionPayload = (section: DynamicSection, form: FormGroup): SectionPayloadEntry | undefined => {
  const sectionPayloadKey = toSectionPayloadKey(section);
  const sectionAtType = toSectionAtType(sectionPayloadKey);
  const sectionPayload: Record<string, unknown> = { '@type': sectionAtType };

  let hasFieldValues = false;
  for (const field of section.fields) {
    const rawValue = form.get(field.controlName)?.value;
    if (isValueEmpty(rawValue)) {
      continue;
    }
    const value = normalizeFieldValue(field, rawValue);
    const nestedPath = readNestedPathFromField(field);
    if (nestedPath) {
      writeNestedValue(sectionPayload, nestedPath, value, stripNamespace);
    } else {
      sectionPayload[stripNamespace(field.key)] = value;
    }
    hasFieldValues = true;
  }

  if (!hasFieldValues) {
    return undefined;
  }
  return {
    key: sectionPayloadKey,
    value: sectionPayload,
  };
};

const normalizeFieldValue = (field: DynamicField, rawValue: unknown): unknown => {
  const normalizers: Record<DynamicField['type'], (value: unknown) => unknown> = {
    array: normalizeArrayValue,
    boolean: normalizeBooleanValue,
    integer: normalizeNumberValue,
    number: normalizeNumberValue,
    string: normalizeStringValue,
  };
  return normalizers[field.type](rawValue);
};

const normalizeArrayValue = (rawValue: unknown): string[] => {
  return toArrayValues(rawValue);
};

const normalizeNumberValue = (rawValue: unknown): number | undefined => {
  return rawValue === '' || rawValue === null || rawValue === undefined ? undefined : Number(rawValue);
};

const normalizeBooleanValue = (rawValue: unknown): boolean => {
  return rawValue === true;
};

const normalizeStringValue = (rawValue: unknown): unknown => {
  return rawValue;
};

const toSectionPayloadKey = (section: DynamicSection): string => {
  if (section.rdfType) {
    return section.rdfType;
  }
  const { prefix, local } = splitNamespace(section.key);
  const localWithUpperFirst = local.length ? local.charAt(0).toUpperCase() + local.slice(1) : section.key;
  return prefix ? `${prefix}:${localWithUpperFirst}` : localWithUpperFirst;
};

const toSectionAtType = (sectionPayloadKey: string): string => {
  const { prefix, local } = splitNamespace(sectionPayloadKey);
  const localWithLowerFirst = local.length ? local.charAt(0).toLowerCase() + local.slice(1) : sectionPayloadKey;
  return prefix ? `${prefix}:${localWithLowerFirst}` : localWithLowerFirst;
};

const splitNamespace = (value: string): { prefix: string; local: string } => {
  const separatorIndex = value.indexOf(':');
  if (separatorIndex < 0) {
    return { prefix: '', local: value };
  }
  return {
    prefix: value.slice(0, separatorIndex),
    local: value.slice(separatorIndex + 1),
  };
};

const stripNamespace = (value: string): string => {
  const separatorIndex = value.indexOf(':');
  return separatorIndex < 0 ? value : value.slice(separatorIndex + 1);
};
