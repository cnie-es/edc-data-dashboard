import type { ServiceSchemaOption } from '../sdtooling-view.types';

export const formatSchemaLabel = (schema: string): string => {
  const noExtension = schema.replace(/\.ttl$/i, '');
  const noShapeSuffix = noExtension.replace(/Shape$/i, '');
  return noShapeSuffix
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export const buildServiceSchemaOptions = (
  serviceSchemas: (string | { id?: string; label?: string; title?: string; name?: string; resourceType?: string })[],
): ServiceSchemaOption[] => {
  return serviceSchemas
    .map(schema => {
      if (typeof schema === 'string') {
        return undefined;
      }

      const schemaId = schema.id || schema.name || '';
      const resourceType = typeof schema.resourceType === 'string' ? schema.resourceType.trim() : '';
      if (!schemaId) {
        return undefined;
      }
      if (!resourceType) {
        return undefined;
      }

      return {
        value: schemaId,
        label: schema.title || schema.label || schema.name || formatSchemaLabel(schemaId),
        resourceType,
      };
    })
    .filter((value): value is ServiceSchemaOption => !!value);
};

export const resolveSelectedOfferingType = (resourceType: string | undefined): string | undefined => {
  const normalized = resourceType?.trim().toUpperCase() ?? '';
  return normalized.length > 0 ? normalized : undefined;
};

export const resolveSelectedSchemaOption = (
  options: ServiceSchemaOption[],
  selectedSchema: string,
): ServiceSchemaOption | undefined => {
  return options.find(option => option.value === selectedSchema);
};
