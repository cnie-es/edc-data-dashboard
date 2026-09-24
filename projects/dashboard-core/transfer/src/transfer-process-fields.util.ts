/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

import type { ContractAgreement, ContractNegotiation, TransferProcess } from '@think-it-labs/edc-connector-client';

const EDC_NS = 'https://w3id.org/edc/v0.0.1/ns/';

function asScalar(v: unknown): string | undefined {
  if (typeof v === 'string') {
    const t = v.trim();
    return t.length ? t : undefined;
  }
  if (v && typeof v === 'object' && '@value' in (v as Record<string, unknown>)) {
    const inner = (v as Record<string, unknown>)['@value'];
    return typeof inner === 'string' ? asScalar(inner) : undefined;
  }
  return undefined;
}

function readJsonLdProperty(obj: Record<string, unknown>, localName: string): string | undefined {
  const direct = asScalar(obj[localName]);
  if (direct) {
    return direct;
  }
  return asScalar(obj[`${EDC_NS}${localName}`]);
}

/**
 * Asset id from a transfer row (plain mock shape, JSON-LD expanded keys, or connector client helpers).
 */
export function readTransferAssetId(process: TransferProcess): string {
  const p = process as unknown as Record<string, unknown> & {
    assetId?: string;
    optionalValue?: <T>(ns: string, prop: string) => T | undefined;
  };
  if (typeof p.assetId === 'string' && p.assetId.trim()) {
    return p.assetId.trim();
  }
  const fromLd = readJsonLdProperty(p, 'assetId');
  if (fromLd) {
    return fromLd;
  }
  if (typeof p.optionalValue === 'function') {
    try {
      const v = p.optionalValue<string>('edc', 'assetId');
      if (typeof v === 'string' && v.trim()) {
        return v.trim();
      }
    } catch {
      /* optionalValue may throw if context is incomplete */
    }
  }
  return '';
}

/**
 * Contract agreement id from a transfer row (UI historically used `contractId`).
 */
export function readTransferContractId(process: TransferProcess): string {
  const p = process as unknown as Record<string, unknown> & {
    contractId?: string;
    optionalValue?: <T>(ns: string, prop: string) => T | undefined;
  };
  if (typeof p.contractId === 'string' && p.contractId.trim()) {
    return p.contractId.trim();
  }
  const agreement = readJsonLdProperty(p, 'contractAgreementId') ?? readJsonLdProperty(p, 'contractId');
  if (agreement) {
    return agreement;
  }
  if (typeof p.optionalValue === 'function') {
    for (const prop of ['contractAgreementId', 'contractId'] as const) {
      try {
        const v = p.optionalValue<string>('edc', prop);
        if (typeof v === 'string' && v.trim()) {
          return v.trim();
        }
      } catch {
        /* continue */
      }
    }
  }
  return '';
}

/**
 * Provider participant id from a contract agreement: the ODRL policy `assigner` (the offer
 * provider), falling back to the agreement `providerId`. Unlike the negotiation `counterPartyId`,
 * this is the provider regardless of whether we are the consumer or the provider.
 */
export function readAgreementProviderId(agreement: ContractAgreement | undefined): string | undefined {
  if (!agreement) {
    return undefined;
  }
  const rec = agreement as unknown as Record<string, unknown>;
  const policy = rec['policy'] as Record<string, unknown> | undefined;
  const assigner = policy?.['odrl:assigner'] ?? policy?.['assigner'];
  if (typeof assigner === 'string' && assigner.trim()) {
    return assigner.trim();
  }
  if (assigner && typeof assigner === 'object') {
    const id = (assigner as Record<string, unknown>)['@id'];
    if (typeof id === 'string' && id.trim()) {
      return id.trim();
    }
  }
  const providerId = rec['providerId'];
  if (typeof providerId === 'string' && providerId.trim()) {
    return providerId.trim();
  }
  return undefined;
}

/**
 * Counter-party id from a contract negotiation (compact, expanded JSON-LD, or connector client helpers).
 */
export function readNegotiationCounterPartyId(negotiation: ContractNegotiation): string {
  const n = negotiation as unknown as Record<string, unknown> & {
    counterPartyId?: string;
    optionalValue?: <T>(ns: string, prop: string) => T | undefined;
  };
  if (typeof n.counterPartyId === 'string' && n.counterPartyId.trim()) {
    return n.counterPartyId.trim();
  }
  const fromLd = readJsonLdProperty(n, 'counterPartyId');
  if (fromLd) {
    return fromLd;
  }
  if (typeof n.optionalValue === 'function') {
    try {
      const v = n.optionalValue<string>('edc', 'counterPartyId');
      if (typeof v === 'string' && v.trim()) {
        return v.trim();
      }
    } catch {
      /* optionalValue may throw if context is incomplete */
    }
  }
  const bracket = n['counterPartyId'];
  if (typeof bracket === 'string' && bracket.trim()) {
    return bracket.trim();
  }
  return '';
}
