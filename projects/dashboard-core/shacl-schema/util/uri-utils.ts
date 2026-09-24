import type { Quad } from '@rdfjs/types';

export const toCompactURI = (uri: string, prefixes: Record<string, string>) => {
  const normalizedURI = uri.trim();

  if (normalizedURI.includes('#')) {
    const hashIndex = normalizedURI.indexOf('#');
    const uriMatch = normalizedURI.substring(0, hashIndex + 1);
    const postFix = normalizedURI.substring(hashIndex + 1);

    const prefix = Object.keys(prefixes).find(key => prefixes[key] === uriMatch);
    if (prefix) {
      return `${prefix}:${postFix}`;
    }
  }

  let bestMatch: { prefix: string; namespace: string; localName: string } | null = null;

  for (const [prefixKey, namespaceValue] of Object.entries(prefixes)) {
    const normalizedNs = namespaceValue.trim();
    if (normalizedURI.startsWith(normalizedNs)) {
      const localName = normalizedURI.substring(normalizedNs.length);
      if (localName && !localName.includes('/') && !localName.includes('#')) {
        if (!bestMatch || normalizedNs.length > bestMatch.namespace.length) {
          bestMatch = { prefix: prefixKey, namespace: normalizedNs, localName };
        }
      }
    }
  }

  if (bestMatch) {
    return `${bestMatch.prefix}:${bestMatch.localName}`;
  }

  return normalizedURI;
};

export const getShapePropertyNameWithoutPath = (shapeQuad: Quad) => {
  return shapeQuad.subject.value.split('#').pop();
};
