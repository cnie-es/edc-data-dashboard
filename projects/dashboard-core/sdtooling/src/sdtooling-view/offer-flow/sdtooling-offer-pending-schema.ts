import type { OfferCreationPendingSchemaPayload } from '@eclipse-edc/dashboard-core';
import type { ServiceSchemaOption } from '../sdtooling-view.types';

export interface ApplyPendingSchemaInput {
  schemaId: string;
  serviceOptions: ServiceSchemaOption[];
  storageRaw: string | null;
}

export interface ApplyPendingSchemaResult {
  serviceOptions: ServiceSchemaOption[];
  selectedSchema: string;
  shouldSelectSchema: boolean;
  errorKey?: 'sdtooling.errors.schemaNotListed';
}

const parsePendingPayload = (raw: string, schemaId: string): OfferCreationPendingSchemaPayload | undefined => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as OfferCreationPendingSchemaPayload).id === 'string' &&
      typeof (parsed as OfferCreationPendingSchemaPayload).resourceType === 'string' &&
      typeof (parsed as OfferCreationPendingSchemaPayload).label === 'string' &&
      (parsed as OfferCreationPendingSchemaPayload).id === schemaId
    ) {
      return parsed as OfferCreationPendingSchemaPayload;
    }
  } catch {
    /* ignore */
  }
  return undefined;
};

export const applyOfferPendingSchemaSelection = (input: ApplyPendingSchemaInput): ApplyPendingSchemaResult => {
  const { schemaId, serviceOptions, storageRaw } = input;
  const payload = storageRaw ? parsePendingPayload(storageRaw, schemaId) : undefined;

  const existing = serviceOptions.find(option => option.value === schemaId);
  if (!existing) {
    if (!payload?.resourceType?.trim()) {
      return {
        serviceOptions,
        selectedSchema: schemaId,
        shouldSelectSchema: false,
        errorKey: 'sdtooling.errors.schemaNotListed',
      };
    }
    return {
      serviceOptions: [
        ...serviceOptions,
        {
          value: schemaId,
          label: payload.label.trim() || schemaId,
          resourceType: payload.resourceType.trim(),
        },
      ],
      selectedSchema: schemaId,
      shouldSelectSchema: true,
    };
  }

  return {
    serviceOptions,
    selectedSchema: schemaId,
    shouldSelectSchema: true,
  };
};
