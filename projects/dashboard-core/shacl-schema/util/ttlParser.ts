import type { NamedNode, Quad, Stream } from '@rdfjs/types';
import type { JSONSchema4 } from 'json-schema';
import { Parser } from 'n3';
import {
  handleDatatypeProperty,
  handleDescriptionProperty,
  handleGroupProperty,
  handleInProperty,
  handleMaxCountProperty,
  handleMaxInclusiveProperty,
  handleMaxLengthProperty,
  handleMinCountProperty,
  handleMinInclusiveProperty,
  handleMinLengthProperty,
  handleNameProperty,
  handleOrderProperty,
  handlePatternProperty,
  handleSimplConfigureProperty,
  pickReferencedPropertyGroups,
  preservePropertyShapeMetadata,
} from '../schema/handlers';
import {
  isDataTypeQuad,
  isDescriptionQuad,
  isGroupPropertyQuad,
  isInQuad,
  isMaxCountQuad,
  isMaxInclusiveQuad,
  isMaxLengthQuad,
  isMinCountQuad,
  isMinInclusiveQuad,
  isMinLengthQuad,
  isNamePropertyQuad,
  isNodeShape,
  isOrderPropertyQuad,
  isPathProperty,
  isPatternQuad,
  isProperty,
  isReferenceNode,
  isSimplConfigureQuad,
} from '../schema/matchers';
import type { ShaclPropertyGroupMeta, SimplSDSchemaUIVariant } from '../schema/types';
import { buildPropertyGroupCatalog } from './property-group-catalog';
import { getShapePropertyNameWithoutPath, toCompactURI } from './uri-utils';

const parseQuads = (
  stream: Stream,
): Promise<{
  quads: Quad[];
  prefixes: Record<string, string>;
}> => {
  const quads: Quad[] = [];
  const prefixes: Record<string, string> = {};

  return new Promise((resolve, reject) => {
    stream.on('prefix', (prefix: string, ns: { value: string }) => {
      const nsValue = typeof ns.value === 'string' ? ns.value : String(ns.value);
      prefixes[prefix] = nsValue.trim();
    });

    stream.on('data', (quad: Quad) => {
      quads.push(quad);
    });

    stream.on('end', () => {
      resolve({ quads, prefixes });
    });

    stream.on('error', (error: unknown) => {
      reject(error);
    });
  });
};

const handleValidationConstraints = (
  propertyDetailQuads: Quad[],
  quads: Quad[],
  shape: JSONSchema4,
  propertyName: string,
  prefixes: Record<string, string>,
) => {
  const descriptionQuad = propertyDetailQuads.find(isDescriptionQuad);
  if (descriptionQuad) {
    handleDescriptionProperty(quads, descriptionQuad, shape, propertyName);
  }

  const inQuad = propertyDetailQuads.find(isInQuad);
  if (inQuad) {
    handleInProperty(quads, inQuad, shape, propertyName, prefixes);
  }

  const patternQuad = propertyDetailQuads.find(isPatternQuad);
  if (patternQuad) {
    handlePatternProperty(quads, patternQuad, shape, propertyName);
  }

  const minLengthQuad = propertyDetailQuads.find(isMinLengthQuad);
  if (minLengthQuad) {
    handleMinLengthProperty(quads, minLengthQuad, shape, propertyName);
  }

  const maxLengthQuad = propertyDetailQuads.find(isMaxLengthQuad);
  if (maxLengthQuad) {
    handleMaxLengthProperty(quads, maxLengthQuad, shape, propertyName);
  }

  const minInclusiveQuad = propertyDetailQuads.find(isMinInclusiveQuad);
  if (minInclusiveQuad) {
    handleMinInclusiveProperty(quads, minInclusiveQuad, shape, propertyName);
  }

  const maxInclusiveQuad = propertyDetailQuads.find(isMaxInclusiveQuad);
  if (maxInclusiveQuad) {
    handleMaxInclusiveProperty(quads, maxInclusiveQuad, shape, propertyName);
  }
};

const applyPropertyShapeMetadata = (
  propertyDetailQuads: Quad[],
  shape: JSONSchema4,
  propertyName: string,
  prefixes: Record<string, string>,
) => {
  const groupQuad = propertyDetailQuads.find(isGroupPropertyQuad);
  if (groupQuad) {
    handleGroupProperty([], groupQuad, shape, propertyName, prefixes);
  }

  const orderQuad = propertyDetailQuads.find(isOrderPropertyQuad);
  if (orderQuad) {
    handleOrderProperty([], orderQuad, shape, propertyName);
  }

  const nameQuad = propertyDetailQuads.find(isNamePropertyQuad);
  if (nameQuad) {
    handleNameProperty([], nameQuad, shape, propertyName);
  }
};

const readShapeSparqlConstraints = (quads: Quad[], shapeSubject: string) => {
  return quads
    .filter(quad => quad.subject.value === shapeSubject && quad.predicate.value === 'http://www.w3.org/ns/shacl#sparql')
    .map(sparqlQuad => {
      const constraintQuads = quads.filter(quad => quad.subject.value === sparqlQuad.object.value);
      const message = constraintQuads.find(quad => quad.predicate.value === 'http://www.w3.org/ns/shacl#message')
        ?.object.value;
      const select = constraintQuads.find(quad => quad.predicate.value === 'http://www.w3.org/ns/shacl#select')?.object
        .value;
      return typeof message === 'string' && typeof select === 'string' ? { message, select } : undefined;
    })
    .filter((constraint): constraint is { message: string; select: string } => !!constraint);
};

const buildJsonObject = (
  quads: Quad[],
  shapeQuad: Quad,
  prefixes: Record<string, string>,
  root: JSONSchema4,
  propertyGroupCatalog: Record<string, ShaclPropertyGroupMeta>,
  child = false,
  schemaUIType: SimplSDSchemaUIVariant = 'default',
) => {
  const propertyName = getShapePropertyNameWithoutPath(shapeQuad);
  if (!propertyName) {
    throw new Error('Malformed property name');
  }

  if (root[propertyName]) {
    const shape = {
      ...root[propertyName],
    };
    return shape;
  }

  const targetClass = quads.find(
    quad =>
      quad.subject.value === shapeQuad.subject.value &&
      quad.predicate.value === 'http://www.w3.org/ns/shacl#targetClass',
  );

  if (!targetClass) {
    throw new Error('No target class found for shape');
  }

  const rdfType = toCompactURI(targetClass.object.value, prefixes);

  root[propertyName] = {
    ...root[propertyName],
    type: 'object',
    properties: {},
    child,
    rdfType,
  };

  const shape = root[propertyName];

  const propertyNodes = quads.filter(quad => quad.subject.value === shapeQuad.subject.value && isProperty(quad));

  propertyNodes.forEach(propertyNode => {
    const propertyDetailQuads = quads.filter(quad => quad.subject.value === propertyNode.object.value);

    const pathQuad = propertyDetailQuads.find(isPathProperty);
    if (!pathQuad) {
      throw new Error('No path defined for property');
    }
    const propertyName = toCompactURI(pathQuad.object.value, prefixes);

    if (!shape.properties) {
      throw new Error('properties not defined on jsonSchema object');
    }

    if (!propertyName) {
      throw new Error('Malformed property name or no path defined for property');
    }

    shape.properties[propertyName] = {};

    const simplConfigureQuad = propertyDetailQuads.find(isSimplConfigureQuad);
    if (simplConfigureQuad) {
      const result = handleSimplConfigureProperty(quads, simplConfigureQuad, shape, propertyName, schemaUIType);
      if (result === false) {
        delete shape.properties[propertyName];
        return;
      }
    }

    const minCountQuad = propertyDetailQuads.find(isMinCountQuad);
    const minCountValue = minCountQuad ? parseInt(minCountQuad.object.value, 10) : undefined;
    if (minCountQuad) {
      handleMinCountProperty(quads, minCountQuad, shape, propertyName);
    }
    const maxCountQuad = propertyDetailQuads.find(isMaxCountQuad);
    if (maxCountQuad) {
      handleMaxCountProperty(quads, maxCountQuad, shape, propertyName);
    }

    const datatypeQuad = propertyDetailQuads.find(isDataTypeQuad);
    if (datatypeQuad) {
      handleDatatypeProperty(quads, datatypeQuad, shape, propertyName, prefixes);
    }

    const minInclusiveQuad = propertyDetailQuads.find(isMinInclusiveQuad);
    if (minInclusiveQuad) {
      handleMinInclusiveProperty(quads, minInclusiveQuad, shape, propertyName);
    }

    const maxInclusiveQuad = propertyDetailQuads.find(isMaxInclusiveQuad);
    if (maxInclusiveQuad) {
      handleMaxInclusiveProperty(quads, maxInclusiveQuad, shape, propertyName);
    }

    const nodeQuad = propertyDetailQuads.find(isReferenceNode);

    if (nodeQuad) {
      handleNodeProperty(
        quads,
        nodeQuad,
        shape,
        propertyName,
        prefixes,
        root,
        propertyGroupCatalog,
        {
          hasExplicitMaxCount: !!maxCountQuad,
          minCount: Number.isNaN(minCountValue) ? undefined : minCountValue,
        },
        schemaUIType,
      );
    }

    applyPropertyShapeMetadata(propertyDetailQuads, shape, propertyName, prefixes);

    handleValidationConstraints(propertyDetailQuads, quads, shape, propertyName, prefixes);

    const propertySchema = shape.properties[propertyName] as JSONSchema4 | undefined;
    const hasSelectOptions = Array.isArray(propertySchema?.enum) || Array.isArray(propertySchema?.oneOf);
    if (minCountQuad && !maxCountQuad && hasSelectOptions && propertySchema && propertySchema.type !== 'array') {
      propertySchema.type = 'array';
      propertySchema.minItems = minCountValue ?? 1;
      propertySchema.items = {
        ...(propertySchema.items as JSONSchema4 | undefined),
        ...(Array.isArray(propertySchema.enum) ? { enum: propertySchema.enum } : {}),
        ...(Array.isArray(propertySchema.oneOf) ? { oneOf: propertySchema.oneOf } : {}),
      };
    }
  });

  const propertyGroups = pickReferencedPropertyGroups(
    shape.properties as Record<string, JSONSchema4> | undefined,
    propertyGroupCatalog,
  );
  if (propertyGroups) {
    shape['propertyGroups'] = propertyGroups;
  }

  const sparqlConstraints = readShapeSparqlConstraints(quads, shapeQuad.subject.value);
  if (sparqlConstraints.length > 0) {
    shape['sparqlConstraints'] = sparqlConstraints;
  }

  return shape;
};

export const handleNodeProperty = (
  quads: Quad[],
  node: Quad,
  shape: JSONSchema4,
  propertyName: string,
  prefixes: Record<string, string>,
  root: Record<string, JSONSchema4>,
  propertyGroupCatalog: Record<string, ShaclPropertyGroupMeta>,
  options: { hasExplicitMaxCount: boolean; minCount?: number },
  schemaUIType: SimplSDSchemaUIVariant = 'default',
) => {
  const nodeReference = quads.find(quad => quad.subject.value === node.object.value);
  if (!nodeReference) {
    throw new Error('Node reference not found');
  }
  if (!shape.properties) {
    throw new Error('properties not defined on jsonSchema object');
  }

  const propertySchema = shape.properties[propertyName] as JSONSchema4;
  const nodeSchema = buildJsonObject(quads, nodeReference, prefixes, root, propertyGroupCatalog, true, schemaUIType);
  const shouldDefaultToRepeatableComplexNode = schemaUIType === 'sdCreation' && !options.hasExplicitMaxCount;

  if (propertySchema?.type === 'array') {
    propertySchema.items = preservePropertyShapeMetadata(nodeSchema, propertySchema);
    if (typeof options.minCount === 'number' && options.minCount > 0) {
      propertySchema.minItems = options.minCount;
    }
    return;
  }

  if (shouldDefaultToRepeatableComplexNode) {
    const arraySchema: JSONSchema4 = {
      ...propertySchema,
      type: 'array',
      items: nodeSchema,
    };
    if (typeof options.minCount === 'number' && options.minCount > 0) {
      arraySchema.minItems = options.minCount;
    }
    shape.properties[propertyName] = preservePropertyShapeMetadata(arraySchema, propertySchema);
    return;
  }

  shape.properties[propertyName] = preservePropertyShapeMetadata(nodeSchema, propertySchema);
};

export const parseStream = async (stream: Stream, schemaUIType: SimplSDSchemaUIVariant = 'default') => {
  const { quads, prefixes } = await parseQuads(stream);
  return buildSchemaFromQuads(quads, prefixes, schemaUIType);
};

export const parseTtlToSchema = async (ttlText: string, schemaUIType: SimplSDSchemaUIVariant = 'advancedSearch') => {
  if (!ttlText.trim()) {
    throw new Error('Invalid TTL: empty content.');
  }

  try {
    const parser = new Parser({ format: 'text/turtle' });
    const quads: Quad[] = [];
    const prefixes: Record<string, string> = {};

    await new Promise<void>((resolve, reject) => {
      parser.parse(
        ttlText,
        (error, quad) => {
          if (error) {
            reject(error);
            return;
          }
          if (quad) {
            quads.push(quad);
            return;
          }
          resolve();
        },
        (prefix: string, iri: NamedNode) => {
          prefixes[prefix] = iri.value;
        },
      );
    });

    if (quads.length === 0) {
      throw new Error('Invalid TTL: no RDF statements found.');
    }

    return buildSchemaFromQuads(quads, prefixes, schemaUIType);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parser failure.';
    throw new Error(`Failed to parse SHACL TTL: ${message}`);
  }
};

const buildSchemaFromQuads = (
  quads: Quad[],
  prefixes: Record<string, string>,
  schemaUIType: SimplSDSchemaUIVariant,
) => {
  const root: Record<string, JSONSchema4> = {};
  const propertyGroupCatalog = buildPropertyGroupCatalog(quads, prefixes);

  const shapes: Quad[] = [];

  quads.forEach(q => {
    if (isNodeShape(q)) {
      shapes.push(q);
    }
  });

  shapes.forEach(shapeQuad => {
    buildJsonObject(quads, shapeQuad, prefixes, root, propertyGroupCatalog, false, schemaUIType);
  });

  deleteChildNodes(root);
  deleteNodesWithEmptyProperties(root);
  if (schemaUIType === 'advancedSearch') {
    deleteAllRequiredProperties(root);
  }

  return { root, prefixes };
};

const deleteChildNodes = (root: Record<string, JSONSchema4>) => {
  Object.keys(root).forEach(key => {
    if (root[key]['child']) {
      delete root[key];
    } else {
      delete root[key]['child'];
    }
  });
};

const deleteNodesWithEmptyProperties = (root: Record<string, JSONSchema4>, deletedKeys: string[] = []) => {
  if (Object.keys(root).length === 0) {
    return deletedKeys;
  }
  Object.keys(root).forEach(key => {
    if (root[key].properties) {
      deletedKeys = [...deletedKeys, ...deleteNodesWithEmptyProperties(root[key].properties, deletedKeys)];
    }

    if (root[key].properties && Object.keys(root[key].properties).length === 0) {
      delete root[key];
      deletedKeys.push(key);
    }

    if (Array.isArray(root[key]?.required) && root[key].required.some(r => deletedKeys.includes(r))) {
      root[key].required = root[key].required.filter(r => !deletedKeys.includes(r));
    }
  });

  return deletedKeys;
};

const deleteAllRequiredProperties = (root: Record<string, JSONSchema4>) => {
  if (Object.keys(root).length === 0) {
    return;
  }

  Object.keys(root).forEach(key => {
    if (root[key].properties) {
      deleteAllRequiredProperties(root[key].properties);
    }

    if (root[key].required) {
      delete root[key].required;
    }
  });
};
