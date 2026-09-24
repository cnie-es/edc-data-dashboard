import type { ExtendedJsonSchema4 } from '../../util/formatDataToJsonLd';
import type { ParsedSchemaContent, SchemaFormattingContext } from '../sdtooling-view.types';

export const resolveSchemaFormattingContext = (schemaContent: unknown): SchemaFormattingContext | undefined => {
  const parsed = schemaContent as ParsedSchemaContent;
  const root = parsed.root;
  const prefixes = parsed.prefixes;

  if (!root || !prefixes) {
    return undefined;
  }

  const firstEntry = Object.entries(root)[0];
  if (!firstEntry) {
    return undefined;
  }

  return {
    formSchema: firstEntry[1] as ExtendedJsonSchema4,
    prefixes,
  };
};
