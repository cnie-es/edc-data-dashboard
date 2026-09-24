import type { Asset, ContractDefinition, PolicyDefinition } from '@think-it-labs/edc-connector-client';
import { OFFER_CARD_DEFAULTS } from './contract-definitions-ui.constants';

interface AssetSelectorCriterion {
  operandLeft: string;
  operator: string;
  operandRight: string;
}

export type OfferPolicyEnrichmentStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface OfferCardLicense {
  /** Título legible de la licencia (`dct:title`). */
  title: string;
  /** Código SPDX si existe (`adms:identifier` con agencia SPDX, p. ej. `CC-BY-NC-SA-4.0`). */
  spdx: string;
  /** URL del texto legal (`cc:legalcode` / `simpl:license`). */
  url: string;
}

export const EMPTY_OFFER_CARD_LICENSE: OfferCardLicense = { title: '', spdx: '', url: '' };

export interface OfferCardViewModel {
  contractDefinition: ContractDefinition;
  id: string;
  accessPolicyId: string;
  contractPolicyId: string;
  assetsSelector: AssetSelectorCriterion[];
  /** Self-description id for GET .../selfDescriptions/{id} (from asset `offer.offerID`). */
  offerSelfDescriptionId?: string;
  title: string;
  providerLabel: string;
  subtitle: string;
  description: string;
  publishedAt: string;
  assetDisplayName: string;
  policySummary: string;
  policyEnrichmentStatus?: OfferPolicyEnrichmentStatus;
  priceLabel: string;
  statusBadge: string;
  /** Palabras clave del recurso (`dcat:keyword` / `simpl:keywords`). */
  keywords: string[];
  /** Licencia del recurso (título + código SPDX + URL legal). */
  license: OfferCardLicense;
  /** Normalized `assetType` key for list filters (e.g. `corpus`, `mlmodel`). */
  assetTypeKey: string;
  isPublicOffering: boolean;
  isFreeOffering: boolean;
}

export function normalizeContractDefinition(contractDefinition: ContractDefinition): ContractDefinition {
  const rawAssetsSelector = (contractDefinition as { assetsSelector?: unknown }).assetsSelector;
  const normalizedAssetsSelector = Array.isArray(rawAssetsSelector)
    ? rawAssetsSelector
    : rawAssetsSelector
      ? [rawAssetsSelector]
      : [];
  return {
    ...(contractDefinition as Record<string, unknown>),
    assetsSelector: normalizedAssetsSelector,
  } as ContractDefinition;
}

export function toOfferCardViewModel(
  contractDefinition: ContractDefinition,
  assets: Asset[],
  policies: PolicyDefinition[],
): OfferCardViewModel {
  const normalizedContractDefinition = normalizeContractDefinition(contractDefinition);
  const contractDefinitionId = getEntityId(normalizedContractDefinition as unknown as Record<string, unknown>) ?? '';
  const selectedAssetId = getSelectedAssetId(normalizedContractDefinition.assetsSelector as AssetSelectorCriterion[]);
  const selectedAsset = selectedAssetId
    ? assets.find(asset => getEntityId(asset as Record<string, unknown>) === selectedAssetId)
    : undefined;
  const selectedPolicy = policies.find(
    policy => getEntityId(policy as Record<string, unknown>) === normalizedContractDefinition.contractPolicyId,
  );
  const hasMappingError = !selectedAsset || !selectedPolicy;

  const assetDisplayName = readAssetObjectName(selectedAsset) ?? selectedAssetId ?? contractDefinitionId;

  if (hasMappingError) {
    return {
      contractDefinition: normalizedContractDefinition,
      id: contractDefinitionId,
      accessPolicyId: normalizedContractDefinition.accessPolicyId,
      contractPolicyId: normalizedContractDefinition.contractPolicyId,
      assetsSelector: normalizedContractDefinition.assetsSelector as AssetSelectorCriterion[],
      offerSelfDescriptionId: readFlatOfferProperty(selectedAsset, 'offer.offerID'),
      title: `Error rendering the offer ${contractDefinitionId}`,
      providerLabel: OFFER_CARD_DEFAULTS.providerLabel,
      subtitle: OFFER_CARD_DEFAULTS.subtitle,
      description: OFFER_CARD_DEFAULTS.description,
      publishedAt: 'Unknown date',
      assetDisplayName,
      policySummary: `Policy action: odrl:use -> ${normalizedContractDefinition.contractPolicyId}`,
      policyEnrichmentStatus: 'error',
      priceLabel: OFFER_CARD_DEFAULTS.priceLabel,
      statusBadge: OFFER_CARD_DEFAULTS.statusBadge,
      keywords: [],
      license: { ...EMPTY_OFFER_CARD_LICENSE },
      assetTypeKey: OFFER_CARD_DEFAULTS.subtitle.toLowerCase(),
      isPublicOffering: false,
      isFreeOffering: false,
    };
  }

  return {
    contractDefinition: normalizedContractDefinition,
    id: contractDefinitionId,
    accessPolicyId: normalizedContractDefinition.accessPolicyId,
    contractPolicyId: normalizedContractDefinition.contractPolicyId,
    assetsSelector: normalizedContractDefinition.assetsSelector as AssetSelectorCriterion[],
    offerSelfDescriptionId: readFlatOfferProperty(selectedAsset, 'offer.offerID'),
    title: readAssetObjectName(selectedAsset) ?? selectedAssetId ?? contractDefinitionId,
    providerLabel: readPolicyAssigner(selectedPolicy) ?? OFFER_CARD_DEFAULTS.providerLabel,
    subtitle: readAssetType(selectedAsset) ?? OFFER_CARD_DEFAULTS.subtitle,
    description: OFFER_CARD_DEFAULTS.description,
    publishedAt: formatCreatedAt(selectedPolicy),
    assetDisplayName,
    policySummary: summarizePolicy(selectedPolicy, normalizedContractDefinition.contractPolicyId),
    policyEnrichmentStatus: 'ready',
    priceLabel: OFFER_CARD_DEFAULTS.priceLabel,
    statusBadge: OFFER_CARD_DEFAULTS.statusBadge,
    keywords: [],
    license: { ...EMPTY_OFFER_CARD_LICENSE },
    assetTypeKey: (readAssetType(selectedAsset) ?? OFFER_CARD_DEFAULTS.subtitle).toLowerCase(),
    isPublicOffering: false,
    isFreeOffering: false,
  };
}

function getSelectedAssetId(assetsSelector: AssetSelectorCriterion[]): string | undefined {
  const criterion = assetsSelector.find(
    selector => selector.operandLeft === 'id' || selector.operandLeft.endsWith('/id'),
  );

  return criterion?.operandRight;
}

function readFlatOfferProperty(asset: Asset | undefined, key: string): string | undefined {
  const rec = asset?.properties as Record<string, unknown> | undefined;
  const v = rec?.[key];
  if (typeof v === 'string' && v.trim().length > 0) {
    return v.trim();
  }
  return undefined;
}

function getEntityId(entity: Record<string, unknown>): string | undefined {
  const directId = entity['id'];
  if (typeof directId === 'string' && directId.length > 0) {
    return directId;
  }
  const jsonLdId = entity['@id'];
  if (typeof jsonLdId === 'string' && jsonLdId.length > 0) {
    return jsonLdId;
  }
  return undefined;
}

function readAssetObjectName(asset: Asset | undefined): string | undefined {
  const dataAddress = asset?.dataAddress as Record<string, unknown> | undefined;
  const objectName = dataAddress?.['objectName'];
  if (typeof objectName === 'string' && objectName.length > 0) {
    return objectName;
  }
  const namespacedObjectName = dataAddress?.['edc:objectName'];
  if (typeof namespacedObjectName === 'string' && namespacedObjectName.length > 0) {
    return namespacedObjectName;
  }
  return undefined;
}

function readAssetType(asset: Asset | undefined): string | undefined {
  const dataAddress = asset?.dataAddress as Record<string, unknown> | undefined;
  const type = dataAddress?.['type'];
  if (typeof type === 'string' && type.length > 0) {
    return type;
  }
  const namespacedType = dataAddress?.['edc:type'];
  if (typeof namespacedType === 'string' && namespacedType.length > 0) {
    return namespacedType;
  }
  return undefined;
}

function formatCreatedAt(policyDefinition: PolicyDefinition | undefined): string {
  if (!policyDefinition?.createdAt) {
    return 'Unknown date';
  }

  const parsedDate = new Date(policyDefinition.createdAt);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Unknown date';
  }
  return parsedDate.toISOString();
}

function readPolicyAssigner(policyDefinition: PolicyDefinition | undefined): string | undefined {
  if (!policyDefinition) {
    return undefined;
  }
  const policyRecord = policyDefinition.policy as Record<string, unknown>;
  const assignerValue = policyRecord['odrl:assigner'];
  if (typeof assignerValue === 'string' && assignerValue.length > 0) {
    return assignerValue;
  }
  if (typeof assignerValue === 'object' && assignerValue !== null) {
    const idValue = (assignerValue as Record<string, unknown>)['@id'];
    if (typeof idValue === 'string' && idValue.length > 0) {
      return idValue;
    }
  }
  return undefined;
}

function summarizePolicy(policyDefinition: PolicyDefinition | undefined, fallbackPolicyId: string): string {
  if (!policyDefinition) {
    return `Policy action: odrl:use -> ${fallbackPolicyId}`;
  }

  const policyId = getEntityId(policyDefinition as unknown as Record<string, unknown>) ?? fallbackPolicyId;

  const permissionRaw = (policyDefinition.policy as Record<string, unknown>)['odrl:permission'] as
    | Record<string, unknown>
    | Record<string, unknown>[]
    | undefined;
  const permission = Array.isArray(permissionRaw) ? permissionRaw[0] : permissionRaw;
  const action = permission?.['odrl:action'] as { '@id'?: string } | string | undefined;
  const actionId = typeof action === 'string' ? action : action?.['@id'];
  const actionLabel = actionId ? (actionId.split('/').pop() ?? actionId) : 'odrl:use';

  return `Policy action: ${actionLabel} -> ${policyId}`;
}
