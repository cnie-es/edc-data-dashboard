import type { Quad } from '@rdfjs/types';
import type { JSONSchema4 } from 'json-schema';
import { toCompactURI } from '../util/uri-utils';
import {
  handleMaxCountProperty,
  handleMaxLengthProperty,
  handleMinLengthProperty,
  handlePatternProperty,
} from './handlers';
import { isMaxCountQuad, isMaxLengthQuad, isMinLengthQuad, isPathProperty, isPatternQuad } from './matchers';

/** Item schema key holding an i18n key that explains a failed `pattern` on a token-array item. */
export const ITEM_PATTERN_HINT_KEY = 'patternHintKey';

interface DerivedConstraintRule {
  /** Property the user fills in, which receives the constraints. */
  targetKey: string;
  /** Property whose constraints apply to the target's values (usually hidden and filled from it by the backend). */
  sourceKey: string;
  patternHintKey: string;
}

/**
 * On publish, sdtooling-api-be (SDServiceImpl) copies the asset's `dcat:keyword` values into `simpl:keywords`
 * (hidden in the form), whose SHACL shape adds a pattern and length limits `dcat:keyword` does not declare.
 * Without them the form accepts keywords (e.g. only digits) that the self-description validation rejects.
 */
const DERIVED_CONSTRAINT_RULES: DerivedConstraintRule[] = [
  { targetKey: 'dcat:keyword', sourceKey: 'simpl:keywords', patternHintKey: 'sdtooling.keywordPatternHint' },
];

const ITEM_CONSTRAINT_KEYS = ['pattern', 'minLength', 'maxLength'] as const;
type ItemConstraints = Partial<Record<(typeof ITEM_CONSTRAINT_KEYS)[number], unknown>>;

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;

/** Per-value constraints of a property, read from its SHACL property shape with the regular handlers. */
const readItemConstraints = (
  quads: Quad[],
  prefixes: Record<string, string>,
  propertyKey: string,
): ItemConstraints | undefined => {
  const pathQuad = quads.find(
    quad => isPathProperty(quad) && toCompactURI(quad.object.value, prefixes) === propertyKey,
  );
  if (!pathQuad) {
    return undefined;
  }
  const detailQuads = quads.filter(quad => quad.subject.value === pathQuad.subject.value);
  const shape: JSONSchema4 = { properties: { [propertyKey]: {} } };
  const maxCountQuad = detailQuads.find(isMaxCountQuad);
  if (maxCountQuad) {
    handleMaxCountProperty(quads, maxCountQuad, shape, propertyKey);
  }
  const patternQuad = detailQuads.find(isPatternQuad);
  if (patternQuad) {
    handlePatternProperty(quads, patternQuad, shape, propertyKey);
  }
  const minLengthQuad = detailQuads.find(isMinLengthQuad);
  if (minLengthQuad) {
    handleMinLengthProperty(quads, minLengthQuad, shape, propertyKey);
  }
  const maxLengthQuad = detailQuads.find(isMaxLengthQuad);
  if (maxLengthQuad) {
    handleMaxLengthProperty(quads, maxLengthQuad, shape, propertyKey);
  }

  const property = asRecord(shape.properties?.[propertyKey]) ?? {};
  const items = asRecord(property['items']) ?? {};
  const constraints: ItemConstraints = {};
  for (const key of ITEM_CONSTRAINT_KEYS) {
    const value = items[key] ?? property[key];
    if (value !== undefined) {
      constraints[key] = value;
    }
  }
  return Object.keys(constraints).length > 0 ? constraints : undefined;
};

/** Adds the constraints the property schema does not declare itself (per item for arrays). */
const addConstraints = (propertySchema: Record<string, unknown>, constraints: ItemConstraints, hintKey: string) => {
  const isArray = propertySchema['type'] === 'array';
  const target = isArray ? (asRecord(propertySchema['items']) ?? {}) : propertySchema;
  let addedPattern = false;
  for (const key of ITEM_CONSTRAINT_KEYS) {
    if (constraints[key] !== undefined && target[key] === undefined && propertySchema[key] === undefined) {
      target[key] = constraints[key];
      addedPattern ||= key === 'pattern';
    }
  }
  if (addedPattern) {
    target[ITEM_PATTERN_HINT_KEY] = hintKey;
  }
  if (isArray) {
    propertySchema['items'] = target;
  }
};

const forEachPropertySchema = (
  node: unknown,
  propertyKey: string,
  callback: (schema: Record<string, unknown>) => void,
  visited = new Set<unknown>(),
): void => {
  if (!node || typeof node !== 'object' || visited.has(node)) {
    return;
  }
  visited.add(node);
  const properties = asRecord((node as Record<string, unknown>)['properties']);
  const propertySchema = asRecord(properties?.[propertyKey]);
  if (propertySchema && !visited.has(propertySchema)) {
    visited.add(propertySchema);
    callback(propertySchema);
  }
  Object.values(node).forEach(child => forEachPropertySchema(child, propertyKey, callback, visited));
};

/**
 * Gives each rule's target property the per-value constraints of its source property, as if the TTL declared
 * them on the target. Runs on the parsed schema, so the form validators pick them up like any other constraint.
 */
export const applyDerivedConstraints = (
  root: Record<string, JSONSchema4>,
  quads: Quad[],
  prefixes: Record<string, string>,
): void => {
  for (const rule of DERIVED_CONSTRAINT_RULES) {
    const constraints = readItemConstraints(quads, prefixes, rule.sourceKey);
    if (!constraints) {
      continue;
    }
    forEachPropertySchema(root, rule.targetKey, schema => addConstraints(schema, constraints, rule.patternHintKey));
  }
};
