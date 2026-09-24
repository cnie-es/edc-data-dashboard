import { v4 as uuidv4 } from 'uuid';
import type { JSONSchema4 } from 'json-schema';

type FormDataType = string | number | Record<string, string | number | object | FormDataType[]> | FormDataType[];

export interface ExtendedJsonSchema4 extends JSONSchema4 {
  rdfType?: string;
  properties?: Record<string, ExtendedJsonSchema4>;
  items?: ExtendedJsonSchema4 | JSONSchema4 | undefined;
}

type JsonLdCompactCallback = (err: unknown, result: Record<string, unknown>) => void;

interface JsonLdModule {
  compact: (input: Record<string, unknown>, context: Record<string, string>, callback: JsonLdCompactCallback) => void;
}

const loadJsonLdModule = async (): Promise<JsonLdModule> => {
  // Use runtime dynamic import to avoid compile-time type resolution for transitive dependency typings.
  const dynamicImport = Function('return import("jsonld")') as () => Promise<unknown>;
  const fallbackModule: JsonLdModule = {
    compact: (input, _context, callback) => callback(undefined, input),
  };

  try {
    const loaded = await Promise.race<unknown>([
      dynamicImport(),
      new Promise<unknown>(resolve => setTimeout(() => resolve(fallbackModule), 1000)),
    ]);

    return loaded as JsonLdModule;
  } catch {
    return fallbackModule;
  }
};

const isStringOrNumberProperty = (schema: ExtendedJsonSchema4): boolean => {
  return schema.rdfType === 'xsd:string' || schema.rdfType === 'xsd:number';
};

const isCompactIri = (value: string, context: Record<string, string>): boolean => {
  const separatorIndex = value.indexOf(':');
  if (separatorIndex <= 0) {
    return false;
  }
  const prefix = value.slice(0, separatorIndex);
  const localPart = value.slice(separatorIndex + 1);
  if (!localPart || localPart.startsWith('//')) {
    return false;
  }
  return typeof context[prefix] === 'string' && context[prefix].length > 0;
};

const isIriLikeValue = (value: unknown, context: Record<string, string>): boolean => {
  if (typeof value !== 'string') {
    return false;
  }
  return /^https?:\/\//.test(value) || isCompactIri(value, context);
};

const isIRIEnumeration = (schema: ExtendedJsonSchema4, context: Record<string, string>): boolean => {
  if (schema.oneOf && schema.oneOf.length > 0 && !schema.rdfType) {
    const firstConst = schema.oneOf[0]['const'];
    return isIriLikeValue(firstConst, context);
  }
  if (schema.enum && schema.enum.length > 0 && !schema.rdfType) {
    return isIriLikeValue(schema.enum[0], context);
  }
  return false;
};

const parseDataProperty = (
  data: FormDataType | undefined,
  schema: ExtendedJsonSchema4,
  context: Record<string, string>,
): unknown => {
  if (typeof data === 'undefined') {
    return undefined;
  }

  if (schema.type === 'object' && !Array.isArray(data)) {
    const formattedData: Record<string, unknown> = {
      'rdf:type': {
        '@id': schema.rdfType,
      },
    };

    const dataObj = data as Record<string, FormDataType>;
    for (const propertyKey of Object.keys(dataObj)) {
      if (!schema.properties?.[propertyKey]) {
        throw new Error(`${propertyKey} property not found in schema`);
      }

      formattedData[propertyKey] = parseDataProperty(dataObj[propertyKey], schema.properties[propertyKey], context);
    }

    return formattedData;
  }

  if (schema.type === 'array' && Array.isArray(data)) {
    if (!schema.items) {
      throw new Error('Items not defined in schema');
    }

    const itemsSchema = schema.items as ExtendedJsonSchema4;
    return data.map(element => parseDataProperty(element, itemsSchema, context));
  }

  if (isIRIEnumeration(schema, context)) {
    return {
      '@id': data,
    };
  }

  if (schema.rdfType === 'rdf:langString') {
    return {
      '@value': data,
      '@language': 'en',
    };
  }

  // Primitive
  if (isStringOrNumberProperty(schema)) {
    return data;
  }

  return {
    '@value': data,
    '@type': schema.rdfType,
  };
};

/**
 * Formats schema-driven form data into the JSON-LD shape expected by `sdtooling-api`:
 * - adds `@context` + `@id` + `rdf:type`
 * - recursively formats nested objects/arrays based on `rdfType` information from SHACL -> JSON schema
 */
export const formatDataToJsonLd = async (
  data: Record<string, unknown>,
  schema: ExtendedJsonSchema4,
  context: Record<string, string>,
): Promise<Record<string, unknown>> => {
  const typeWithoutPrefix = schema.rdfType?.split(':')[1] ?? '';

  // The backend signer expects a stable JSON-LD, but for the demo app we can generate a new uuid.
  const uuid = uuidv4();

  const jsonFormattedData: Record<string, unknown> = {
    '@context': context,
    '@id': `did:web:registry.gaia-x.eu:${typeWithoutPrefix}:${uuid}`,
    'rdf:type': {
      '@id': schema.rdfType,
    },
  };

  for (const propertyKey of Object.keys(data)) {
    const propertyValue = data[propertyKey];
    if (!schema.properties?.[propertyKey]) {
      throw new Error(`${propertyKey} property not found in schema`);
    }

    jsonFormattedData[propertyKey] = parseDataProperty(
      propertyValue as FormDataType,
      schema.properties[propertyKey],
      context,
    );
  }

  const jsonldModule = await loadJsonLdModule();

  const compacted = await Promise.race<Record<string, unknown>>([
    new Promise<Record<string, unknown>>((resolve, reject) => {
      jsonldModule.compact(jsonFormattedData, context, (err: unknown, result: Record<string, unknown>) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      });
    }),
    new Promise<Record<string, unknown>>(resolve => {
      setTimeout(() => resolve(jsonFormattedData), 1500);
    }),
  ]);

  return compacted;
};
