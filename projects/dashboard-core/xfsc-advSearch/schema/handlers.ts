import type { Quad } from '@rdfjs/types';
import type { JSONSchema4, JSONSchema4TypeName } from 'json-schema';
import type { ShaclPropertyGroupMeta, SimplConfigurePropertyValue, SimplSDSchemaUIVariant } from './types';
import { toCompactURI } from '../util/uri-utils';

const SHACL_GROUP_KEY = 'group';
const SHACL_ORDER_KEY = 'order';

export const mapXsdTypetoJSONSchema = (xsdType: string): { type: JSONSchema4TypeName; format?: string } => {
  switch (xsdType) {
    case 'http://www.w3.org/2001/XMLSchema#string':
      return { type: 'string' };
    case 'http://www.w3.org/2001/XMLSchema#integer':
      return { type: 'integer' };
    case 'http://www.w3.org/2001/XMLSchema#boolean':
      return { type: 'boolean' };
    case 'http://www.w3.org/2001/XMLSchema#number':
      return { type: 'number' };
    case 'http://www.w3.org/2001/XMLSchema#decimal':
      return { type: 'number' };
    case 'http://www.w3.org/2001/XMLSchema#anyURI':
      return { type: 'string', format: 'uri' };
    case 'http://www.w3.org/2001/XMLSchema#dateTime':
      return { type: 'string', format: 'date-time' };
    case 'http://www.w3.org/2001/XMLSchema#date':
      return { type: 'string', format: 'date' };
    case 'http://www.w3.org/2001/XMLSchema#time':
      return { type: 'string', format: 'time' };
    default:
      return { type: 'string' };
  }
};

export const handleMinLengthProperty = (_quads: Quad[], node: Quad, shapeObject: JSONSchema4, propertyName: string) => {
  if (!shapeObject.properties) {
    throw new Error('properties not defined on jsonSchema object');
  }

  const value = parseInt(node.object.value, 10);

  if (shapeObject.properties[propertyName].type === 'array') {
    shapeObject.properties[propertyName].items ??= {};
    if (!Array.isArray(shapeObject.properties[propertyName].items)) {
      const items = shapeObject.properties[propertyName].items;
      items.minLength = value;
    }
  } else {
    shapeObject.properties[propertyName].minLength = value;
  }
};

export const handleDatatypeProperty = (
  _quads: Quad[],
  node: Quad,
  shapeObject: JSONSchema4,
  propertyName: string,
  prefixes: Record<string, string>,
) => {
  const { type, format } = mapXsdTypetoJSONSchema(node.object.value);
  const rdfType = toCompactURI(node.object.value, prefixes);

  if (!shapeObject.properties) {
    throw new Error('properties not defined on jsonSchema object');
  }

  if (shapeObject.properties[propertyName].type === 'array') {
    shapeObject.properties[propertyName].items ??= {};
    if (!Array.isArray(shapeObject.properties[propertyName].items)) {
      const items = shapeObject.properties[propertyName].items;
      items.type = type;
      items['rdfType'] = rdfType;
      if (format) {
        items.format = format;
      }
    }
  } else {
    if (!shapeObject.properties) {
      throw new Error('properties not defined on jsonSchema object');
    }
    shapeObject.properties[propertyName].type = type;
    shapeObject.properties[propertyName]['rdfType'] = rdfType;
    if (format) {
      shapeObject.properties[propertyName].format = format;
    }
  }
};

export const handleMinInclusiveProperty = (
  _quads: Quad[],
  node: Quad,
  shapeObject: JSONSchema4,
  propertyName: string,
) => {
  if (!shapeObject.properties) {
    throw new Error('properties not defined on jsonSchema object');
  }

  const value = parseFloat(node.object.value);
  shapeObject.properties[propertyName].minimum = value;
};

export const handleMaxInclusiveProperty = (
  _quads: Quad[],
  node: Quad,
  shapeObject: JSONSchema4,
  propertyName: string,
) => {
  if (!shapeObject.properties) {
    throw new Error('properties not defined on jsonSchema object');
  }
  const value = parseFloat(node.object.value);
  shapeObject.properties[propertyName].maximum = value;
};

const parseList = (quads: Quad[], node: Quad, list: string[]) => {
  const subjNodes = quads.filter(quad => quad.subject.value === node.object.value);
  let restNodes: Quad[] = [];

  const first = subjNodes.find(quad => quad.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#first');
  if (!first) {
    throw new Error('No enum values found for SHACL in property');
  }
  list.push(first.object.value);

  const rest = subjNodes.find(quad => quad.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#rest');
  if (rest && rest.object.value !== 'http://www.w3.org/1999/02/22-rdf-syntax-ns#nil') {
    restNodes = quads.filter(quad => quad.subject.value === rest.object.value);
    parseRest(restNodes, quads, rest, list);
  }
};

const parseRest = (rest: Quad[], quads: Quad[], _node: Quad, list: string[]) => {
  const first = rest.find(quad => quad.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#first');
  if (!first) {
    throw new Error('No enum values found for SHACL in property');
  }
  list.push(first.object.value);

  const restNode = rest.find(quad => quad.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#rest');
  if (restNode && restNode.object.value !== 'http://www.w3.org/1999/02/22-rdf-syntax-ns#nil') {
    const restNodes = quads.filter(quad => quad.subject.value === restNode.object.value);
    parseRest(restNodes, quads, restNode, list);
  }
};

const isFullURI = (value: string): boolean => {
  return /^https?:\/\//i.test(value);
};

export const extractLabelFromURI = (uri: string): string => {
  const lastSegment = uri.split(/[/#]/).pop() || uri;
  const withSpaces = lastSegment.replace(/([a-z])([A-Z])/g, '$1 $2');
  return withSpaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const handleInProperty = (
  quads: Quad[],
  node: Quad,
  shapeObject: JSONSchema4,
  propertyName: string,
  prefixes: Record<string, string>,
) => {
  const enumValues: string[] = [];
  parseList(quads, node, enumValues);

  if (!shapeObject.properties) {
    throw new Error('properties not defined on jsonSchema object');
  }

  const compactValues = enumValues.map(value => (isFullURI(value) ? toCompactURI(value, prefixes) : value));
  const allAreURIs = enumValues.length > 0 && enumValues.every(isFullURI);

  if (allAreURIs) {
    shapeObject.properties[propertyName].oneOf = compactValues.map((value, index) => ({
      const: value,
      title: extractLabelFromURI(enumValues[index]),
    }));
  } else {
    shapeObject.properties[propertyName].enum = [...compactValues];
  }

  return compactValues;
};

export const handleMaxLengthProperty = (_quads: Quad[], node: Quad, shapeObject: JSONSchema4, propertyName: string) => {
  if (!shapeObject.properties) {
    throw new Error('properties not defined on jsonSchema object');
  }

  const value = parseInt(node.object.value, 10);

  if (shapeObject.properties[propertyName].type === 'array') {
    shapeObject.properties[propertyName].items ??= {};
    if (!Array.isArray(shapeObject.properties[propertyName].items)) {
      const items = shapeObject.properties[propertyName].items as JSONSchema4;
      items.maxLength = value;
    }
  } else {
    shapeObject.properties[propertyName].maxLength = value;
  }
};

export const handleDescriptionProperty = (
  _quads: Quad[],
  node: Quad,
  shapeObject: JSONSchema4,
  propertyName: string,
) => {
  if (!shapeObject.properties) {
    throw new Error('properties not defined on jsonSchema object');
  }
  shapeObject.properties[propertyName].description = node.object.value;
};

/** First sh:group quad wins if multiple are present (invalid SHACL). */
export const handleGroupProperty = (
  _quads: Quad[],
  node: Quad,
  shapeObject: JSONSchema4,
  propertyName: string,
  prefixes: Record<string, string>,
) => {
  if (!shapeObject.properties) {
    throw new Error('properties not defined on jsonSchema object');
  }
  const propertySchema = shapeObject.properties[propertyName] as JSONSchema4;
  if (propertySchema[SHACL_GROUP_KEY]) {
    return;
  }
  propertySchema[SHACL_GROUP_KEY] = toCompactURI(node.object.value, prefixes);
};

export const handleOrderProperty = (_quads: Quad[], node: Quad, shapeObject: JSONSchema4, propertyName: string) => {
  if (!shapeObject.properties) {
    throw new Error('properties not defined on jsonSchema object');
  }
  const value = parseInt(node.object.value, 10);
  if (!Number.isNaN(value)) {
    shapeObject.properties[propertyName][SHACL_ORDER_KEY] = value;
  }
};

export const handleNameProperty = (_quads: Quad[], node: Quad, shapeObject: JSONSchema4, propertyName: string) => {
  if (!shapeObject.properties) {
    throw new Error('properties not defined on jsonSchema object');
  }
  shapeObject.properties[propertyName]['name'] = node.object.value;
};

export const pickReferencedPropertyGroups = (
  properties: Record<string, JSONSchema4> | undefined,
  catalog: Record<string, ShaclPropertyGroupMeta>,
): Record<string, ShaclPropertyGroupMeta> | undefined => {
  if (!properties) {
    return undefined;
  }
  const referenced = new Set<string>();
  for (const propertySchema of Object.values(properties)) {
    const groupId = propertySchema[SHACL_GROUP_KEY];
    if (typeof groupId === 'string' && groupId.length > 0) {
      referenced.add(groupId);
    }
  }
  if (referenced.size === 0) {
    return undefined;
  }
  const propertyGroups: Record<string, ShaclPropertyGroupMeta> = {};
  for (const groupId of referenced) {
    const meta = catalog[groupId];
    if (meta) {
      propertyGroups[groupId] = meta;
    }
  }
  return Object.keys(propertyGroups).length > 0 ? propertyGroups : undefined;
};

export const preservePropertyShapeMetadata = (target: JSONSchema4, source: JSONSchema4 | undefined): JSONSchema4 => {
  if (!source) {
    return target;
  }
  const preserved: JSONSchema4 = { ...target };
  if (typeof source[SHACL_GROUP_KEY] === 'string') {
    preserved[SHACL_GROUP_KEY] = source[SHACL_GROUP_KEY];
  }
  if (typeof source[SHACL_ORDER_KEY] === 'number') {
    preserved[SHACL_ORDER_KEY] = source[SHACL_ORDER_KEY];
  }
  if (typeof source['name'] === 'string') {
    preserved['name'] = source['name'];
  }
  return preserved;
};

function parseEscapeChars(input: string) {
  return input.replace(/\\\\/g, '\\');
}

export const handlePatternProperty = (_quads: Quad[], node: Quad, shapeObject: JSONSchema4, propertyName: string) => {
  if (!shapeObject.properties) {
    throw new Error('properties not defined on jsonSchema object');
  }

  const rawPattern = node.object.value;
  const removedEscapedChars = parseEscapeChars(rawPattern);

  try {
    new RegExp(removedEscapedChars, 'u');
    shapeObject.properties[propertyName].pattern = removedEscapedChars;
  } catch {
    console.warn(`Invalid regex pattern for ${propertyName}: ${rawPattern}`);
  }
};

export const addRequiredProperty = (shapeObject: JSONSchema4, propertyName: string) => {
  shapeObject.required ??= [];
  if (Array.isArray(shapeObject.required)) {
    const hasPropertyAleady = shapeObject.required.find(prop => prop === propertyName);
    if (!hasPropertyAleady) {
      shapeObject.required.push(propertyName);
    }
  }
  return shapeObject;
};

export const handleMinCountProperty = (_quads: Quad[], node: Quad, shapeObject: JSONSchema4, propertyName: string) => {
  const value = parseInt(node.object.value, 10);
  if (value === 0) {
    return shapeObject;
  }
  if (value === 1) {
    addRequiredProperty(shapeObject, propertyName);
    return shapeObject;
  }
  if (!shapeObject.properties || !shapeObject.properties[propertyName]) {
    throw new Error('properties not defined on jsonSchema object');
  }

  const propertySchema = shapeObject.properties[propertyName] as JSONSchema4;
  propertySchema.type = 'array';
  propertySchema.minItems = value;
  propertySchema.items ??= {
    title: 'Item',
  };

  return shapeObject;
};

export const handleMaxCountProperty = (_quads: Quad[], node: Quad, shapeObject: JSONSchema4, propertyName: string) => {
  const value = parseInt(node.object.value, 10);

  if (value === 1) {
    return shapeObject;
  }

  if (shapeObject.properties) {
    const propertySchema = shapeObject.properties[propertyName] as JSONSchema4;
    if (propertySchema?.minItems && value < propertySchema.minItems) {
      throw new Error('maxCount cannot be less than minCount');
    }
    shapeObject.properties[propertyName].type = 'array';
    shapeObject.properties[propertyName].maxItems = value;
    shapeObject.properties[propertyName].items = {
      title: 'Item',
    };
  } else {
    shapeObject.type = 'array';
    shapeObject.maxItems = value;
    shapeObject.items = {};
  }
  return shapeObject;
};

export const handleSimplConfigureProperty = (
  quads: Quad[],
  node: Quad,
  shapeObject: JSONSchema4,
  propertyName: string,
  schemaUIType: SimplSDSchemaUIVariant = 'default',
): JSONSchema4 | false => {
  const enumValues: SimplConfigurePropertyValue[] = [];
  parseList(quads, node, enumValues);

  if (!shapeObject.properties) {
    throw new Error('properties not defined on jsonSchema object');
  }

  if (schemaUIType === 'sdCreation' && enumValues.includes('requiredOnFrontendOnly')) {
    addRequiredProperty(shapeObject, propertyName);
  }

  if (schemaUIType === 'advancedSearch' && !enumValues.includes('useForAdvancedSearch') && shapeObject['child']) {
    return false;
  }

  if (schemaUIType === 'sdCreation' && enumValues.includes('hiddenInFrontend')) {
    if (Array.isArray(shapeObject.required) && shapeObject.required.includes(propertyName)) {
      shapeObject.required = shapeObject.required.filter(prop => prop !== propertyName);
    }
    // Antes: `return false` eliminaba la propiedad del schema por completo,
    // así que nunca llegaba a existir como DynamicField/FormControl y por
    // tanto jamás podía enviarse, ni siquiera con un valor por defecto.
    //
    // Ahora: se conserva en `shapeObject.properties` (necesario para que
    // exista el control del formulario y para que formatDataToJsonLd no
    // falle con "property not found in schema" al construir el payload) y
    // se marca explícitamente como oculta. El valor por defecto en sí se
    // calcula más adelante, en initialFieldValue, que es donde ya se conoce
    // el tipo final del campo (aquí `type` puede no estar resuelto todavía,
    // según el orden en que se procesen los quads de sh:datatype).
    shapeObject.properties[propertyName]['hiddenInFrontend'] = true;
    return shapeObject;
  }

  if (schemaUIType === 'advancedSearch' && enumValues.includes('hiddenInFrontend')) {
    if (shapeObject.properties[propertyName].default === undefined) {
      shapeObject.properties[propertyName].default = 'default';
    }
  }

  return shapeObject;
};
