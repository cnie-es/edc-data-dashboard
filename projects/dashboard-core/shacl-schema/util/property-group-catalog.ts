import type { Quad } from '@rdfjs/types';
import { extractLabelFromURI } from '../schema/handlers';
import { isOrderPropertyQuad, isPropertyGroupTypeQuad, isRdfsLabelQuad } from '../schema/matchers';
import type { ShaclPropertyGroupMeta } from '../schema/types';
import { toCompactURI } from './uri-utils';

export const buildPropertyGroupCatalog = (
  quads: Quad[],
  prefixes: Record<string, string>,
): Record<string, ShaclPropertyGroupMeta> => {
  const groupSubjects = new Set<string>();

  quads.forEach(quad => {
    if (isPropertyGroupTypeQuad(quad)) {
      groupSubjects.add(quad.subject.value);
    }
  });

  const catalog: Record<string, ShaclPropertyGroupMeta> = {};

  groupSubjects.forEach(subjectValue => {
    const groupQuads = quads.filter(quad => quad.subject.value === subjectValue);
    const compactId = toCompactURI(subjectValue, prefixes);
    if (!compactId) {
      return;
    }

    const labelQuad = groupQuads.find(isRdfsLabelQuad);
    const orderQuad = groupQuads.find(isOrderPropertyQuad);
    const orderValue = orderQuad ? parseInt(orderQuad.object.value, 10) : undefined;

    catalog[compactId] = {
      label: labelQuad?.object.value ?? extractLabelFromURI(subjectValue),
      order: orderValue !== undefined && !Number.isNaN(orderValue) ? orderValue : undefined,
    };
  });

  return catalog;
};
