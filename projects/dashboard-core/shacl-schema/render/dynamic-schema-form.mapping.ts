import type {
  DynamicField,
  DynamicObjectArrayItemField,
  DynamicObjectArrayItemScalarField,
  DynamicSection,
  DynamicSparqlConstraint,
} from './dynamic-schema-form.types';
import { asRecord, asString, asStringArray } from './dynamic-schema-form.normalizers';
import { resolveSelectOptions } from './dynamic-schema-form.object-array';
import { isPolicyCardFieldKey, POLICY_CARD_ARRAY_CONTROL_TYPE } from './dynamic-schema-form.policy';
import {
  buildItemFieldSubsections,
  buildSubsectionsFromFields,
  flattenSubsectionFields,
  parsePropertyGroupsFromNode,
  readFieldOrder,
  resolveEffectiveGroupKey,
} from './dynamic-schema-form.subsections';

export { buildSubsectionsFromFields, flattenSubsectionFields } from './dynamic-schema-form.subsections';
export type { DynamicSubsection } from './dynamic-schema-form.types';

export const TOP_LEVEL_PRIMITIVE_SECTION_KEY = '__top_level__';

export const buildDynamicSectionsFromSchema = (schemaContent: unknown): DynamicSection[] => {
  const schemaRoot = asRecord(schemaContent)?.['root'];
  const rootObject = asRecord(schemaRoot);
  if (!rootObject) {
    return [];
  }
  const shapeEntry = Object.entries(rootObject).find(([, value]) => asRecord(value));
  const shapeKey = shapeEntry?.[0] ?? 'topLevelProperties';
  const shapeObject = asRecord(shapeEntry?.[1]);
  const topProperties = asRecord(shapeObject?.['properties']);
  if (!topProperties) {
    return [];
  }
  const rootSparqlConstraints = readSparqlConstraints(shapeObject);
  const topLevelPrimitiveSectionKey = TOP_LEVEL_PRIMITIVE_SECTION_KEY;
  const defaultTopLevelPrimitiveSectionLabel =
    asString(shapeObject?.['name']) ?? asString(shapeObject?.['title']) ?? humanizeKey(shapeKey);

  const sections: DynamicSection[] = [];
  const metadataFields: DynamicField[] = [];
  const topLevelRequiredKeys = new Set(asStringArray(shapeObject?.['required']));
  for (const [sectionKey, sectionValue] of Object.entries(topProperties)) {
    const sectionNode = asRecord(sectionValue);
    if (!sectionNode) {
      continue;
    }
    const sectionType = asString(sectionNode['type']) ?? 'string';
    if (sectionType !== 'object') {
      if (isPrimitiveFieldType(sectionType)) {
        metadataFields.push(
          buildDynamicField(
            topLevelPrimitiveSectionKey,
            sectionKey,
            sectionNode,
            sectionType,
            topLevelRequiredKeys.has(sectionKey),
            [sectionKey],
          ),
        );
      }
      continue;
    }

    const sectionProperties = asRecord(sectionNode['properties']);
    if (!sectionProperties) {
      continue;
    }
    const requiredKeys = new Set(asStringArray(sectionNode['required']));
    const fields: DynamicField[] = [];
    collectFieldsRecursively(sectionKey, sectionProperties, requiredKeys, fields);
    if (fields.length) {
      sections.push(
        attachSubsectionsToSection(
          {
            key: sectionKey,
            label: asString(sectionNode['title']) ?? asString(sectionNode['name']) ?? humanizeKey(sectionKey),
            description: asString(sectionNode['description']) ?? '',
            rdfType: asString(sectionNode['rdfType']) ?? '',
            fields,
            sparqlConstraints: mergeSparqlConstraints(rootSparqlConstraints, readSparqlConstraints(sectionNode)),
          },
          sectionNode,
        ),
      );
    }
  }

  if (metadataFields.length) {
    const topLevelPrimitiveSectionLabel =
      metadataFields.length === 1 ? metadataFields[0].label : defaultTopLevelPrimitiveSectionLabel;
    sections.push({
      key: topLevelPrimitiveSectionKey,
      label: topLevelPrimitiveSectionLabel,
      description: '',
      rdfType: asString(shapeObject?.['rdfType']) ?? '',
      fields: metadataFields,
      sparqlConstraints: rootSparqlConstraints,
    });
  }

  return sections;
};

const readSparqlConstraints = (node: Record<string, unknown> | undefined): DynamicSparqlConstraint[] => {
  const rawConstraints = Array.isArray(node?.['sparqlConstraints']) ? node?.['sparqlConstraints'] : [];
  return rawConstraints
    .map(constraint => {
      const constraintNode = asRecord(constraint);
      const message = asString(constraintNode?.['message']);
      const select = asString(constraintNode?.['select']);
      return message && select ? { message, select } : undefined;
    })
    .filter((constraint): constraint is DynamicSparqlConstraint => !!constraint);
};

const mergeSparqlConstraints = (
  left: DynamicSparqlConstraint[],
  right: DynamicSparqlConstraint[],
): DynamicSparqlConstraint[] => {
  const constraintsByMessage = new Map<string, DynamicSparqlConstraint>();
  [...left, ...right].forEach(constraint => constraintsByMessage.set(constraint.message, constraint));
  return Array.from(constraintsByMessage.values());
};

const attachSubsectionsToSection = (section: DynamicSection, sectionNode: Record<string, unknown>): DynamicSection => {
  const propertyGroups = parsePropertyGroupsFromNode(sectionNode);
  if (!propertyGroups) {
    return section;
  }
  const subsections = buildSubsectionsFromFields(section.fields, propertyGroups);
  if (subsections.length === 0) {
    return section;
  }
  return {
    ...section,
    subsections,
    fields: flattenSubsectionFields(subsections),
  };
};

const collectFieldsRecursively = (
  sectionKey: string,
  properties: Record<string, unknown>,
  requiredKeys: Set<string>,
  fields: DynamicField[],
  pathPrefix: string[] = [],
  inheritedGroup?: string,
) => {
  for (const [fieldKey, fieldValue] of Object.entries(properties)) {
    const fieldNode = asRecord(fieldValue);
    if (!fieldNode) {
      continue;
    }
    const fieldType = asString(fieldNode['type']) ?? 'string';
    const currentPath = [...pathPrefix, fieldKey];

    const effectiveGroup = resolveEffectiveGroupKey(fieldNode, inheritedGroup);

    if (fieldType === 'array') {
      const objectArrayField = tryBuildObjectArrayField(
        sectionKey,
        fieldKey,
        fieldNode,
        requiredKeys.has(fieldKey),
        currentPath,
        effectiveGroup,
      );
      if (objectArrayField) {
        fields.push(objectArrayField);
        continue;
      }
    }

    if (isPrimitiveFieldType(fieldType)) {
      fields.push(
        buildDynamicField(
          sectionKey,
          fieldKey,
          fieldNode,
          fieldType,
          requiredKeys.has(fieldKey),
          currentPath,
          effectiveGroup,
        ),
      );
      continue;
    }

    if (fieldType !== 'object') {
      continue;
    }
    const nestedProperties = asRecord(fieldNode['properties']);
    if (!nestedProperties) {
      continue;
    }
    const nestedRequiredKeys = new Set(asStringArray(fieldNode['required']));
    collectFieldsRecursively(sectionKey, nestedProperties, nestedRequiredKeys, fields, currentPath, effectiveGroup);
  }
};

const isPrimitiveFieldType = (value: string): value is DynamicField['type'] => {
  return value === 'string' || value === 'number' || value === 'integer' || value === 'boolean' || value === 'array';
};

const buildDynamicField = (
  sectionKey: string,
  fieldKey: string,
  fieldNode: Record<string, unknown>,
  fieldType: DynamicField['type'],
  required: boolean,
  fullPath: string[],
  inheritedGroup?: string,
): DynamicField => {
  const groupKey = resolveEffectiveGroupKey(fieldNode, inheritedGroup);
  const order = readFieldOrder(fieldNode);
  const itemSchema = asRecord(fieldNode['items']);
  const enumOptions = asStringArray(fieldNode['enum']);
  const itemEnumOptions = asStringArray(itemSchema?.['enum']);
  const oneOfOptionNodes = Array.isArray(fieldNode['oneOf'])
    ? fieldNode['oneOf'].map(option => asRecord(option))
    : Array.isArray(itemSchema?.['oneOf'])
      ? itemSchema['oneOf'].map(option => asRecord(option))
      : [];
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
  const selectOptions = enumOptions.length ? enumOptions : itemEnumOptions.length ? itemEnumOptions : oneOfOptions;
  const enumOptionLabels =
    enumOptions.length || itemEnumOptions.length || Object.keys(oneOfOptionLabels).length === 0
      ? undefined
      : oneOfOptionLabels;
  const isMultiSelect = fieldType === 'array' && selectOptions.length > 0 && fieldNode['type'] === 'array';
  const controlType: DynamicField['controlType'] = isPolicyCardFieldKey(fieldKey)
    ? POLICY_CARD_ARRAY_CONTROL_TYPE
    : selectOptions.length
      ? isMultiSelect
        ? 'select-multiple'
        : 'select'
      : fieldType === 'number' || fieldType === 'integer'
        ? 'number'
        : fieldType === 'boolean'
          ? 'checkbox'
          : fieldType === 'array'
            ? 'array'
            : 'text';

  return {
    key: fieldKey,
    controlName: toControlName(sectionKey, fullPath.join('_')),
    label: asString(fieldNode['title']) ?? asString(fieldNode['name']) ?? humanizeKey(fieldKey),
    description: asString(fieldNode['description']) ?? '',
    type: fieldType,
    controlType,
    enumOptions: selectOptions,
    enumOptionLabels,
    required,
    groupKey,
    order,
    schema:
      fullPath.length > 1
        ? {
            ...fieldNode,
            nestedPath: fullPath,
          }
        : fieldNode,
  };
};

export const collectObjectArrayItemFields = (
  itemProperties: Record<string, unknown>,
  itemRequiredKeys: Set<string>,
  inheritedGroup?: string,
): DynamicObjectArrayItemField[] => {
  const objectArrayFields: DynamicObjectArrayItemField[] = [];

  for (const [itemFieldKey, itemFieldNodeRaw] of Object.entries(itemProperties)) {
    const itemFieldNode = asRecord(itemFieldNodeRaw);
    if (!itemFieldNode) {
      continue;
    }
    const itemField = buildObjectArrayItemField(
      itemFieldKey,
      itemFieldNode,
      itemRequiredKeys.has(itemFieldKey),
      inheritedGroup,
    );
    if (itemField) {
      objectArrayFields.push(itemField);
    }
  }

  return objectArrayFields;
};

const buildObjectArrayItemField = (
  itemFieldKey: string,
  itemFieldNode: Record<string, unknown>,
  required: boolean,
  inheritedGroup?: string,
): DynamicObjectArrayItemField | undefined => {
  const itemFieldType = asString(itemFieldNode['type']) ?? 'string';
  const label = asString(itemFieldNode['title']) ?? asString(itemFieldNode['name']) ?? humanizeKey(itemFieldKey);
  const description = asString(itemFieldNode['description']) ?? '';
  const groupKey = resolveEffectiveGroupKey(itemFieldNode, inheritedGroup);
  const order = readFieldOrder(itemFieldNode);
  const withGroupMetadata = <T extends DynamicObjectArrayItemField>(field: T): T => ({
    ...field,
    groupKey,
    order,
  });

  if (itemFieldType === 'array') {
    const itemsSchema = asRecord(itemFieldNode['items']);
    if (!itemsSchema) {
      return undefined;
    }
    const itemsType = asString(itemsSchema['type']);
    if (itemsType === 'object') {
      const nestedProperties = asRecord(itemsSchema['properties']);
      if (!nestedProperties) {
        return undefined;
      }
      const nestedRequiredKeys = new Set(asStringArray(itemsSchema['required']));
      const itemFields = collectObjectArrayItemFields(nestedProperties, nestedRequiredKeys, groupKey);
      if (itemFields.length === 0) {
        return undefined;
      }
      return withGroupMetadata({
        kind: 'object-array',
        key: itemFieldKey,
        label,
        description,
        required,
        schema: itemFieldNode,
        itemFields,
      });
    }
    return withGroupMetadata({
      kind: 'token-array',
      key: itemFieldKey,
      label,
      description,
      required,
      schema: itemFieldNode,
    });
  }

  if (itemFieldType === 'object') {
    const nestedProperties = asRecord(itemFieldNode['properties']);
    if (!nestedProperties) {
      return undefined;
    }
    const nestedRequiredKeys = new Set(asStringArray(itemFieldNode['required']));
    const fields = collectObjectArrayItemFields(nestedProperties, nestedRequiredKeys, groupKey);
    if (fields.length === 0) {
      return undefined;
    }
    return withGroupMetadata({
      kind: 'object-group',
      key: itemFieldKey,
      label,
      description,
      required,
      schema: itemFieldNode,
      fields,
    });
  }

  if (!isObjectArrayItemScalarType(itemFieldType)) {
    return undefined;
  }

  const { selectOptions, enumOptionLabels } = resolveSelectOptions(itemFieldNode);
  return withGroupMetadata({
    kind: 'scalar',
    key: itemFieldKey,
    label,
    description,
    type: itemFieldType,
    required,
    enumOptions: selectOptions,
    enumOptionLabels,
    schema: itemFieldNode,
  });
};

const isObjectArrayItemScalarType = (value: string): value is DynamicObjectArrayItemScalarField['type'] => {
  return value === 'string' || value === 'number' || value === 'integer' || value === 'boolean';
};

const tryBuildObjectArrayField = (
  sectionKey: string,
  fieldKey: string,
  fieldNode: Record<string, unknown>,
  required: boolean,
  fullPath: string[],
  inheritedGroup?: string,
): DynamicField | undefined => {
  const itemsSchema = asRecord(fieldNode['items']);
  if (!itemsSchema || asString(itemsSchema['type']) !== 'object') {
    return undefined;
  }
  const itemProperties = asRecord(itemsSchema['properties']);
  if (!itemProperties) {
    return undefined;
  }
  const itemRequiredKeys = new Set(asStringArray(itemsSchema['required']));
  const objectArrayFields = collectObjectArrayItemFields(itemProperties, itemRequiredKeys, inheritedGroup);
  const propertyGroups = parsePropertyGroupsFromNode(itemsSchema);
  const objectArrayItemSubsections = propertyGroups
    ? buildItemFieldSubsections(objectArrayFields, propertyGroups)
    : undefined;

  if (objectArrayFields.length === 0) {
    return undefined;
  }

  const groupKey = resolveEffectiveGroupKey(fieldNode, inheritedGroup);
  const order = readFieldOrder(fieldNode);

  return {
    key: fieldKey,
    controlName: toControlName(sectionKey, fullPath.join('_')),
    label: asString(fieldNode['title']) ?? asString(fieldNode['name']) ?? humanizeKey(fieldKey),
    description: asString(fieldNode['description']) ?? '',
    type: 'array',
    controlType: 'object-array',
    enumOptions: [],
    required,
    groupKey,
    order,
    objectArrayFields,
    objectArrayItemSubsections,
    schema:
      fullPath.length > 1
        ? {
            ...fieldNode,
            nestedPath: fullPath,
            itemPropertyGroups: propertyGroups,
          }
        : {
            ...fieldNode,
            itemPropertyGroups: propertyGroups,
          },
  };
};

const humanizeKey = (key: string): string => {
  const lastToken = key.includes(':') ? (key.split(':').pop() ?? key) : key;
  const withSpaces = lastToken.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
};

const toControlName = (sectionKey: string, fieldKey: string): string => {
  return `${sectionKey}_${fieldKey}`.replace(/[^a-zA-Z0-9_]/g, '_');
};
