import type { ContractDefinition } from '@think-it-labs/edc-connector-client';
import type { TranslateService } from '@ngx-translate/core';
import { stripCuriePrefix } from '@eclipse-edc/dashboard-core';
import type { OfferSelfDescriptionDetailViewModel } from '@eclipse-edc/dashboard-core';
import { buildContractPolicyLabelsFromUsagePolicyJson, parsePolicyOdrl } from '@eclipse-edc/dashboard-core/policies';
import { OFFER_CARD_DEFAULTS } from './contract-definitions-ui.constants';
import {
  EMPTY_OFFER_CARD_LICENSE,
  normalizeContractDefinition,
  type OfferCardLicense,
  type OfferCardViewModel,
} from './offer-card-view-model';

const EDC_NS_ID = 'https://w3id.org/edc/v0.0.1/ns/id';

interface SelectorCriterion {
  operandLeft: string;
  operator: string;
  operandRight: string;
}

function formatOfferingTypeSubtitle(raw: string | undefined): string {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return OFFER_CARD_DEFAULTS.subtitle;
  }
  return stripCuriePrefix(trimmed).toLowerCase();
}

function buildPriceLabelFromDetail(vm: OfferSelfDescriptionDetailViewModel): string {
  const priceType = vm.priceType.trim().toLowerCase();
  if (priceType === 'free') {
    return 'Gratuito';
  }
  const amount = vm.priceAmount.trim();
  if (amount.length > 0 && (amount === '0' || amount === '0.0' || amount === '0.00')) {
    return 'Gratuito';
  }
  if (amount.length > 0) {
    return `${amount} € + IVA`;
  }
  return OFFER_CARD_DEFAULTS.priceLabel;
}

function statusBadgeFromDetail(vm: OfferSelfDescriptionDetailViewModel): string {
  return vm.isPublicOffering ? 'Cat. Público' : 'Cat. No público';
}

function isFreeOfferingFromDetail(vm: OfferSelfDescriptionDetailViewModel): boolean {
  const priceType = vm.priceType.trim().toLowerCase();
  if (priceType === 'free') {
    return true;
  }
  const amount = vm.priceAmount.trim();
  if (amount.length > 0) {
    const parsed = Number.parseFloat(amount);
    return !Number.isNaN(parsed) && parsed === 0;
  }
  return false;
}

function assetTypeKeyFromOfferingType(raw: string | undefined): string {
  return formatOfferingTypeSubtitle(raw);
}

/** Palabras clave del recurso: `dcat:keyword` del corpus y, si no hay, `simpl:keywords` del servicio. */
function keywordsFromDetail(vm: OfferSelfDescriptionDetailViewModel): string[] {
  const corpusKeywords = vm.keywords.filter(k => k.trim().length > 0);
  if (corpusKeywords.length > 0) {
    return corpusKeywords;
  }
  return vm.sections.generalService.keywords.filter(k => k.trim().length > 0);
}

/** Licencia del recurso: título (`dct:title`), código SPDX (`adms:identifier`) y URL legal (`cc:legalcode`). */
function licenseFromDetail(vm: OfferSelfDescriptionDetailViewModel): OfferCardLicense {
  return {
    title: vm.corpusLicense?.title?.trim() ?? '',
    spdx: vm.sections.corpus.license?.identifiers?.[0]?.notation?.trim() ?? '',
    url: vm.corpusLicense?.url?.trim() || vm.licenseUrl.trim(),
  };
}

function policySummaryFromDetail(vm: OfferSelfDescriptionDetailViewModel): string {
  if (vm.usagePolicyRaw.trim().length > 0) {
    return '';
  }
  const url = vm.contractTemplateUrl.trim();
  if (url.length > 0) {
    return url;
  }
  return OFFER_CARD_DEFAULTS.description;
}

/** Applies `simpl:usage-policy` labels using the same format as the policies list (Contratación). */
export function applyUsagePolicyLabelsToOfferCard(
  card: OfferCardViewModel,
  vm: OfferSelfDescriptionDetailViewModel,
  translate: TranslateService,
): OfferCardViewModel {
  const usagePolicyRaw = vm.usagePolicyRaw.trim();
  if (!usagePolicyRaw) {
    return card;
  }

  const labels = buildContractPolicyLabelsFromUsagePolicyJson(usagePolicyRaw, card.assetDisplayName, translate);
  if (!labels) {
    return card;
  }

  let providerLabel = card.providerLabel;
  try {
    const parsed = parsePolicyOdrl(JSON.parse(usagePolicyRaw) as Record<string, unknown>);
    const assigner = parsed.assigner?.trim();
    if (assigner) {
      providerLabel = assigner;
    }
  } catch {
    // keep existing provider label
  }

  return {
    ...card,
    policySummary: labels.name,
    providerLabel,
    policyEnrichmentStatus: 'ready',
  };
}

function stubContractDefinitionFromSelfDescriptionId(selfDescriptionId: string): ContractDefinition {
  const id = selfDescriptionId.trim() || 'unknown-sd';
  const raw = {
    id,
    accessPolicyId: '',
    contractPolicyId: '',
    assetsSelector: {
      operandLeft: EDC_NS_ID,
      operator: '=',
      operandRight: id,
    },
  };
  return normalizeContractDefinition(raw as unknown as ContractDefinition);
}

/**
 * Builds Mis ofertas-style cards from a corpus self-description detail VM (catalog search enrichment).
 */
export function buildOfferCardViewModelFromSelfDescriptionDetail(
  vm: OfferSelfDescriptionDetailViewModel,
  selfDescriptionId: string,
): OfferCardViewModel {
  const sdId = selfDescriptionId.trim() || vm.documentId.trim() || 'unknown-sd';
  const contractDefinition = stubContractDefinitionFromSelfDescriptionId(sdId);
  const title = vm.title.trim() || sdId;
  const description = vm.description.trim() || OFFER_CARD_DEFAULTS.description;
  const providerLabel = vm.providerLabel.trim() || OFFER_CARD_DEFAULTS.providerLabel;

  return {
    contractDefinition,
    id: sdId,
    accessPolicyId: '',
    contractPolicyId: '',
    assetsSelector: contractDefinition.assetsSelector as SelectorCriterion[],
    offerSelfDescriptionId: sdId,
    title,
    providerLabel,
    subtitle: formatOfferingTypeSubtitle(vm.offeringTypeLabel),
    description,
    publishedAt: vm.issuanceDateIso.trim(),
    assetDisplayName: title,
    policySummary: policySummaryFromDetail(vm),
    policyEnrichmentStatus: 'ready',
    priceLabel: buildPriceLabelFromDetail(vm),
    statusBadge: statusBadgeFromDetail(vm),
    keywords: keywordsFromDetail(vm),
    license: licenseFromDetail(vm),
    assetTypeKey: assetTypeKeyFromOfferingType(vm.offeringTypeLabel),
    isPublicOffering: vm.isPublicOffering,
    isFreeOffering: isFreeOfferingFromDetail(vm),
  };
}

/**
 * Placeholder card from search summary while detailedSearchSD is in flight.
 */
export function buildPlaceholderOfferCardFromSearchSummary(input: {
  selfDescriptionId: string;
  name: string;
  description: string;
  offeringType?: string;
  policyEnrichmentStatus: OfferCardViewModel['policyEnrichmentStatus'];
}): OfferCardViewModel {
  const sdId = input.selfDescriptionId.trim() || 'unknown-sd';
  const contractDefinition = stubContractDefinitionFromSelfDescriptionId(sdId);
  const title = input.name.trim() || sdId;
  const description = input.description.trim() || OFFER_CARD_DEFAULTS.description;

  return {
    contractDefinition,
    id: sdId,
    accessPolicyId: '',
    contractPolicyId: '',
    assetsSelector: contractDefinition.assetsSelector as SelectorCriterion[],
    offerSelfDescriptionId: sdId,
    title,
    providerLabel: OFFER_CARD_DEFAULTS.providerLabel,
    subtitle: formatOfferingTypeSubtitle(input.offeringType),
    description,
    publishedAt: '',
    assetDisplayName: title,
    policySummary: '',
    policyEnrichmentStatus: input.policyEnrichmentStatus,
    priceLabel: OFFER_CARD_DEFAULTS.priceLabel,
    statusBadge: OFFER_CARD_DEFAULTS.statusBadge,
    keywords: [],
    license: { ...EMPTY_OFFER_CARD_LICENSE },
    assetTypeKey: assetTypeKeyFromOfferingType(input.offeringType),
    isPublicOffering: false,
    isFreeOffering: false,
  };
}
