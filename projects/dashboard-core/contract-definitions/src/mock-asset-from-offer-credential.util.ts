/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

import type { Asset } from '@think-it-labs/edc-connector-client';

const OFFERING_TYPE_TO_ASSET_TYPE: Record<string, string> = {
  'edval:CorpusOffering': 'ms:Corpus',
  'edval:ModelOffering': 'ms:MLModel',
  'edval:ApiOffering': 'ms:Api',
  'edval:LCROffering': 'ms:LexicalConceptualResource',
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function readString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
}

function readTypedBoolean(node: unknown): boolean {
  const record = asRecord(node);
  const raw = record?.['@value'];
  return raw === true || raw === 'true';
}

/** Builds a connector {@link Asset} stub from a corpus/model/api/lcr VerifiableCredential fixture. */
export function buildMockAssetFromVerifiableCredential(vc: Record<string, unknown>): Asset {
  const subject = asRecord(vc['credentialSubject']) ?? {};
  const general = asRecord(subject['simpl:generalServiceProperties']) ?? {};
  const registration = asRecord(subject['simpl:edcRegistration']) ?? {};
  const offeringPrice = asRecord(subject['simpl:offeringPrice']) ?? {};

  const offerId = readString(subject['@id']) ?? 'unknown-offer-id';
  const assetId = readString(registration['simpl:assetId']) ?? offerId;
  const title = readString(general['simpl:name']) ?? offerId;
  const description = readString(general['simpl:description']) ?? '';
  const accessPolicyId = readString(registration['simpl:accessPolicyId']) ?? '';
  const contractPolicyId = readString(registration['simpl:servicePolicyId']) ?? '';
  const createdAt = readString(vc['issuanceDate']) ?? new Date().toISOString();
  const isPublic = readTypedBoolean(subject['edval:isPublicOffering']);
  const priceType = readString(offeringPrice['simpl:priceType']) ?? '';
  const isFree = priceType.toLowerCase() === 'free';

  const offeringType = readString(subject['@type']) ?? '';
  const assetType = OFFERING_TYPE_TO_ASSET_TYPE[offeringType] ?? 'ms:Corpus';

  return {
    '@id': assetId,
    id: assetId,
    '@type': 'Asset',
    accessPolicyId,
    contractPolicyId,
    properties: {
      id: assetId,
      'offer.offerID': offerId,
      'offer.offer_name': title,
      assetDescription: description,
      assetType,
      createdAt,
      'offer.isPublic': isPublic ? 'true' : 'false',
      'offer.isFree': isFree ? 'true' : 'false',
      'simpl:price': readString(asRecord(offeringPrice['simpl:price'])?.['@value']) ?? '0',
    },
    dataAddress: {
      '@type': 'DataAddress',
      type: 'HttpData',
    },
  } as unknown as Asset;
}
