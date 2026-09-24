import type { ContractNegotiation } from '@think-it-labs/edc-connector-client';
import type { NegotiationRow } from './negotiation-row.model';

const EDC_TYPE_IRI = 'https://w3id.org/edc/v0.0.1/ns/type';

export function edcNegotiationType(negotiation: ContractNegotiation): string | undefined {
  if (negotiation.type) {
    return negotiation.type;
  }
  const raw = negotiation as Record<string, unknown>;
  const nodes = raw[EDC_TYPE_IRI];
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return undefined;
  }
  const first = nodes[0];
  if (first && typeof first === 'object' && '@value' in first) {
    const v = (first as { '@value': unknown })['@value'];
    return typeof v === 'string' ? v : String(v);
  }
  return undefined;
}

/** Negotiation id for `/contractnegotiations/{id}/agreement`. */
export function edcNegotiationRequestId(negotiation: ContractNegotiation): string | undefined {
  const raw = negotiation as ContractNegotiation & Record<string, unknown>;
  if (typeof raw.id === 'string' && raw.id.trim()) {
    return raw.id.trim();
  }
  const atId = raw['@id'];
  if (typeof atId !== 'string' || !atId.trim()) {
    return undefined;
  }
  const s = atId.trim();
  const slash = s.lastIndexOf('/');
  if (slash >= 0 && slash < s.length - 1) {
    return s.slice(slash + 1).trim();
  }
  return s;
}

export function negotiationToRow(
  negotiation: ContractNegotiation,
  displayNamePlaceholder: string,
): NegotiationRow | undefined {
  const negotiationId = edcNegotiationRequestId(negotiation);
  if (!negotiationId) {
    return undefined;
  }

  const counterPartyId =
    typeof negotiation['counterPartyId'] === 'string' && negotiation['counterPartyId'].trim()
      ? negotiation['counterPartyId'].trim()
      : '-';

  return {
    negotiationId,
    contractAgreementId:
      typeof negotiation.contractAgreementId === 'string' ? negotiation.contractAgreementId : undefined,
    counterPartyId,
    state: String(negotiation.state ?? ''),
    createdAt: negotiation.createdAt ?? 0,
    type: edcNegotiationType(negotiation),
    displayName: displayNamePlaceholder,
    enrichmentStatus: 'idle',
    negotiation,
  };
}
