export interface ResourceSharingParams {
  sharingMethodId: string;
  offeringType: string;
}

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;

const toScalarString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  const record = asRecord(value);
  if (record && '@value' in record) {
    return toScalarString(record['@value']);
  }
  return undefined;
};

const getCredentialSubject = (resourceDescriptionDocument: unknown): Record<string, unknown> | null => {
  const documentRecord = asRecord(resourceDescriptionDocument);
  if (!documentRecord) {
    return null;
  }
  return asRecord(documentRecord['credentialSubject']) ?? null;
};

export const getResourceSharingParams = (resourceDescriptionDocument: unknown): ResourceSharingParams | null => {
  const credentialSubject = getCredentialSubject(resourceDescriptionDocument);
  if (!credentialSubject) {
    return null;
  }

  const generalServiceProperties = asRecord(credentialSubject['simpl:generalServiceProperties']);
  if (!generalServiceProperties) {
    return null;
  }

  const sharingMethodId = toScalarString(generalServiceProperties['simpl:sharingMethodId']);
  const offeringType = toScalarString(generalServiceProperties['simpl:offeringType']);
  if (!sharingMethodId || !offeringType) {
    return null;
  }

  return {
    sharingMethodId,
    offeringType: offeringType.trim().toUpperCase(),
  };
};
