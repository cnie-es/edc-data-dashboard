import type { ShaclPropertyGroupMeta } from '../schema/types';
import type {
  DynamicField,
  DynamicObjectArrayItemField,
  DynamicSection,
  DynamicSubsection,
} from './dynamic-schema-form.types';
import { asRecord, asString } from './dynamic-schema-form.normalizers';

export const UNGROUPED_SUBSECTION_KEY = '__ungrouped__';
const UNGROUPED_SUBSECTION_ORDER = Number.MAX_SAFE_INTEGER;

const resolveFieldGroupKey = (field: { groupKey?: string }): string => {
  return field.groupKey ?? UNGROUPED_SUBSECTION_KEY;
};

const sortFieldsByOrder = <T extends { order?: number }>(fields: T[]): T[] => {
  return fields
    .map((field, index) => ({ field, index }))
    .sort((a, b) => {
      const orderA = typeof a.field.order === 'number' ? a.field.order : Number.MAX_SAFE_INTEGER;
      const orderB = typeof b.field.order === 'number' ? b.field.order : Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.index - b.index;
    })
    .map(entry => entry.field);
};

const resolveGroupLabel = (groupKey: string, propertyGroups: Record<string, ShaclPropertyGroupMeta>): string => {
  if (groupKey === UNGROUPED_SUBSECTION_KEY) {
    return '';
  }
  const meta = propertyGroups[groupKey];
  if (meta?.label) {
    return meta.label;
  }
  return humanizeGroupKey(groupKey);
};

const resolveGroupOrder = (groupKey: string, propertyGroups: Record<string, ShaclPropertyGroupMeta>): number => {
  if (groupKey === UNGROUPED_SUBSECTION_KEY) {
    return UNGROUPED_SUBSECTION_ORDER;
  }
  const order = propertyGroups[groupKey]?.order;
  return typeof order === 'number' ? order : UNGROUPED_SUBSECTION_ORDER - 1;
};

const humanizeGroupKey = (groupKey: string): string => {
  const lastToken = groupKey.includes(':') ? (groupKey.split(':').pop() ?? groupKey) : groupKey;
  const withSpaces = lastToken.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
};

export const buildSubsectionsFromFields = (
  fields: DynamicField[],
  propertyGroups: Record<string, ShaclPropertyGroupMeta>,
): DynamicSubsection[] => {
  const buckets = new Map<string, DynamicField[]>();

  for (const field of fields) {
    const groupKey = resolveFieldGroupKey(field);
    const bucket = buckets.get(groupKey) ?? [];
    bucket.push(field);
    buckets.set(groupKey, bucket);
  }

  const subsections: DynamicSubsection[] = [];

  for (const [groupKey, bucketFields] of buckets.entries()) {
    const sortedFields = sortFieldsByOrder(bucketFields);
    if (sortedFields.length === 0) {
      continue;
    }
    subsections.push({
      key: groupKey,
      label: resolveGroupLabel(groupKey, propertyGroups),
      order: resolveGroupOrder(groupKey, propertyGroups),
      fields: sortedFields,
    });
  }

  return subsections.sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.label.localeCompare(b.label);
  });
};

export const flattenSubsectionFields = (subsections: DynamicSubsection[]): DynamicField[] => {
  return subsections.flatMap(subsection => subsection.fields);
};

const isHiddenInFrontend = (field: DynamicField): boolean => field.schema?.['hiddenInFrontend'] === true;

// Filtra los campos ocultos SOLO para lo que se pinta en pantalla.
// section.fields (usado por createDynamicFormGroup y por el builder del
// payload de envío) se deja intacto a propósito: el campo oculto sigue
// teniendo FormControl con su valor por defecto y sigue viajando en el
// payload, solo que el usuario nunca lo ve ni lo puede tocar.
const filterVisibleFields = (fields: DynamicField[]): DynamicField[] => {
  return fields.filter(field => !isHiddenInFrontend(field));
};

export const getDisplaySubsections = (section: DynamicSection): DynamicSubsection[] => {
  if (section.subsections?.length) {
    return section.subsections
      .map(subsection => ({ ...subsection, fields: filterVisibleFields(subsection.fields) }))
      .filter(subsection => subsection.fields.length > 0);
  }
  return [
    {
      key: '__flat__',
      label: '',
      order: 0,
      fields: filterVisibleFields(section.fields),
    },
  ];
};

export const parsePropertyGroupsFromNode = (
  sectionNode: Record<string, unknown>,
): Record<string, ShaclPropertyGroupMeta> | undefined => {
  const raw = asRecord(sectionNode['propertyGroups']);
  if (!raw) {
    return undefined;
  }
  const propertyGroups: Record<string, ShaclPropertyGroupMeta> = {};
  for (const [groupId, metaRaw] of Object.entries(raw)) {
    const meta = asRecord(metaRaw);
    if (!meta) {
      continue;
    }
    const label = asString(meta['label']);
    if (!label) {
      continue;
    }
    const orderValue = meta['order'];
    propertyGroups[groupId] = {
      label,
      order: typeof orderValue === 'number' ? orderValue : undefined,
    };
  }
  return Object.keys(propertyGroups).length > 0 ? propertyGroups : undefined;
};

export const resolveEffectiveGroupKey = (
  fieldNode: Record<string, unknown>,
  inheritedGroup?: string,
): string | undefined => {
  const explicit = asString(fieldNode['group']);
  if (explicit) {
    return explicit;
  }
  return inheritedGroup;
};

export const readFieldOrder = (fieldNode: Record<string, unknown>): number | undefined => {
  const orderValue = fieldNode['order'];
  return typeof orderValue === 'number' ? orderValue : undefined;
};

export type ItemFieldWithGroup = DynamicObjectArrayItemField & { groupKey?: string; order?: number };

export const buildItemFieldSubsections = (
  fields: DynamicObjectArrayItemField[],
  propertyGroups: Record<string, ShaclPropertyGroupMeta>,
): import('./dynamic-schema-form.types').DynamicObjectArrayItemSubsection[] => {
  const buckets = new Map<string, DynamicObjectArrayItemField[]>();

  for (const field of fields as ItemFieldWithGroup[]) {
    const groupKey = field.groupKey ?? UNGROUPED_SUBSECTION_KEY;
    const bucket = buckets.get(groupKey) ?? [];
    bucket.push(field);
    buckets.set(groupKey, bucket);
  }

  const subsections: import('./dynamic-schema-form.types').DynamicObjectArrayItemSubsection[] = [];

  for (const [groupKey, bucketFields] of buckets.entries()) {
    const sortedFields = sortFieldsByOrder(bucketFields as ItemFieldWithGroup[]) as DynamicObjectArrayItemField[];
    if (sortedFields.length === 0) {
      continue;
    }
    subsections.push({
      key: groupKey,
      label: resolveGroupLabel(groupKey, propertyGroups),
      order: resolveGroupOrder(groupKey, propertyGroups),
      fields: sortedFields,
    });
  }

  return subsections.sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.label.localeCompare(b.label);
  });
};
