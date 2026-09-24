import type { ExtendedJsonSchema4 } from '../../util/formatDataToJsonLd';
import { asRecord, asString } from '../sdtooling-record.util';

export const hasDctTerms = (node: unknown): boolean => {
  if (Array.isArray(node)) {
    return node.some(item => hasDctTerms(item));
  }

  const record = asRecord(node);
  if (!record) {
    return false;
  }

  return Object.entries(record).some(([key, value]) => key.startsWith('dct:') || hasDctTerms(value));
};

export const normalizeForPublication = (payload: Record<string, unknown>): Record<string, unknown> => {
  const normalized: Record<string, unknown> = { ...payload };

  const contextNode = asRecord(normalized['@context']) ?? {};
  const hasDct = hasDctTerms(normalized);
  if (hasDct && !contextNode['dct']) {
    contextNode['dct'] = 'http://purl.org/dc/terms/';
  }
  if (Object.keys(contextNode).length > 0) {
    normalized['@context'] = contextNode;
  }

  const rootTypeNode = asRecord(normalized['rdf:type']);
  const rootTypeId =
    typeof rootTypeNode?.['@id'] === 'string'
      ? (rootTypeNode['@id'] as string)
      : typeof normalized['rdf:type'] === 'string'
        ? (normalized['rdf:type'] as string)
        : undefined;

  if (rootTypeId && typeof normalized['@type'] !== 'string') {
    normalized['@type'] = rootTypeId;
  }

  return normalized;
};

export const extractSignedCredential = (signedPayload: Record<string, unknown>): Record<string, unknown> => {
  const credentialSubject = asRecord(signedPayload['credentialSubject']);
  if (!credentialSubject) {
    throw new Error('Signing response is not a direct verifiable credential payload.');
  }

  return signedPayload;
};

export const extractPublishedId = (published: unknown): string => {
  const node = asRecord(published);
  if (!node) {
    return '';
  }

  const topLevel =
    asString(node['id']) ?? asString(node['resourceDescriptionId']) ?? asString(node['selfDescriptionId']);
  if (topLevel) {
    return topLevel;
  }

  const nestedResource = asRecord(node['resourceDescription']);
  if (nestedResource) {
    const nestedId = asString(nestedResource['id']) ?? asString(nestedResource['resourceDescriptionId']);
    if (nestedId) {
      return nestedId;
    }
  }

  const nestedSelfDescription = asRecord(node['selfDescription']);
  if (nestedSelfDescription) {
    const nestedId = asString(nestedSelfDescription['id']) ?? asString(nestedSelfDescription['selfDescriptionId']);
    if (nestedId) {
      return nestedId;
    }
  }

  return '';
};

export const validateSelfDescriptionStructure = (
  selfDescriptionJsonLd: Record<string, unknown>,
  options: {
    currentFormSchema?: ExtendedJsonSchema4;
    hasAssetPropertiesSection: boolean;
  },
): void => {
  const missingSections: string[] = [];

  // OJO: `properties['simpl:dataProperties']` existe siempre que la sección esté
  // declarada en el schema, independientemente de si sh:minCount la hace
  // obligatoria o no. simpl:dataProperties tiene sh:maxCount 1 SIN sh:minCount
  // (es opcional), así que aquí hay que mirar `required`, no `properties`.
  // `required` en JSONSchema4 admite tanto string[] (draft-4) como boolean
  // (compat. draft-3), así que hay que comprobar que es array antes de usar includes.
  const requiredProperties = options.currentFormSchema?.required;
  const expectsDataProperties =
    Array.isArray(requiredProperties) && requiredProperties.includes('simpl:dataProperties');
  if (expectsDataProperties && !selfDescriptionJsonLd['simpl:dataProperties']) {
    missingSections.push('simpl:dataProperties');
  }

  if (options.hasAssetPropertiesSection && !selfDescriptionJsonLd['simpl:assetProperties']) {
    missingSections.push('simpl:assetProperties');
  }

  if (missingSections.length > 0) {
    throw new Error(`Missing required section(s): ${missingSections.join(', ')}.`);
  }
};

export const buildAssetPropertiesFromTemplate = (
  templatePayload: Record<string, unknown>,
): Record<string, unknown> | undefined => {
  if (!templatePayload || typeof templatePayload !== 'object') {
    return undefined;
  }

  const providerDataAddressJson = JSON.stringify(templatePayload);

  return {
    'rdf:type': {
      '@id': 'simpl:AssetProperties',
    },
    'simpl:providerDataAddress': providerDataAddressJson,
  };
};

export const formatSubmissionError = (error: unknown): string => {
  let message = 'Submission failed.';

  if (error instanceof Error && error.message) {
    message = error.message;
  }

  const maybeHttpError = error as { error?: unknown };
  const problemDetails = maybeHttpError?.error as { title?: string; detail?: string } | undefined;
  if (problemDetails && (problemDetails.title || problemDetails.detail)) {
    const title = problemDetails.title ?? '';
    const detail = problemDetails.detail ?? '';
    message = title && detail ? `${title}: ${detail}` : title || detail || message;
  }

  return message;
};
