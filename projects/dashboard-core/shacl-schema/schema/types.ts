import type { JSONSchema4 } from 'json-schema';

export type RDFJsonSchema = JSONSchema4 & {
  rdfType: string;
};

export type SimplSDSchemaUIVariant = 'default' | 'sdCreation' | 'advancedSearch';

export type SimplConfigurePropertyValue = 'hiddenInFrontend' | 'useForAdvancedSearch' | 'requiredOnFrontendOnly';

/** Metadata for sh:PropertyGroup nodes attached to parsed object schemas as `propertyGroups`. */
export interface ShaclPropertyGroupMeta {
  label: string;
  order?: number;
}

export const isValidSimplSDSchemaUIVariant = (value: string | undefined | null): value is SimplSDSchemaUIVariant => {
  return !!value && ['default', 'sdCreation', 'advancedSearch'].includes(value);
};
