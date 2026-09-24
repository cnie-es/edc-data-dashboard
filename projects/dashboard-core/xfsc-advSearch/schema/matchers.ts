import type { Quad } from '@rdfjs/types';

export const isNodeShape = (quad: Quad) => {
  return quad.object.value === 'http://www.w3.org/ns/shacl#NodeShape';
};

export const isProperty = (quad: Quad) => {
  return quad.predicate.value === 'http://www.w3.org/ns/shacl#property';
};

export const isPathProperty = (quad: Quad) => {
  return quad.predicate.value === 'http://www.w3.org/ns/shacl#path';
};

export const isReferenceNode = (quad: Quad) => {
  return quad.predicate.value === 'http://www.w3.org/ns/shacl#node';
};

export const isMaxLengthQuad = (quad: Quad) => {
  return quad.predicate.value === 'http://www.w3.org/ns/shacl#maxLength';
};

export const isMinLengthQuad = (quad: Quad) => {
  return quad.predicate.value === 'http://www.w3.org/ns/shacl#minLength';
};

export const isPatternQuad = (quad: Quad) => {
  return quad.predicate.value === 'http://www.w3.org/ns/shacl#pattern';
};

export const isInQuad = (quad: Quad) => {
  return quad.predicate.value === 'http://www.w3.org/ns/shacl#in';
};

export const isMinCountQuad = (quad: Quad) => {
  return quad.predicate.value === 'http://www.w3.org/ns/shacl#minCount';
};

export const isMaxCountQuad = (quad: Quad) => {
  return quad.predicate.value === 'http://www.w3.org/ns/shacl#maxCount';
};

export const isDataTypeQuad = (quad: Quad) => {
  return quad.predicate.value === 'http://www.w3.org/ns/shacl#datatype';
};

export const isMinInclusiveQuad = (quad: Quad) => {
  return quad.predicate.value === 'http://www.w3.org/ns/shacl#minInclusive';
};

export const isMaxInclusiveQuad = (quad: Quad) => {
  return quad.predicate.value === 'http://www.w3.org/ns/shacl#maxInclusive';
};

export const isDescriptionQuad = (quad: Quad) => {
  return quad.predicate.value === 'http://www.w3.org/ns/shacl#description';
};

export const isSimplConfigureQuad = (quad: Quad) => {
  return quad.predicate.value === 'http://w3id.org/gaia-x/simpl#configure';
};
