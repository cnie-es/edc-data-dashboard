import type { OfferSelfDescriptionDetailViewModel } from './corpus-offering-self-description.mapper';

function isBlank(value: string | undefined): boolean {
  return !value?.trim();
}

/** Applies negotiation/list display metadata when SD-mapped fields are empty. */
export function applyCorpusDetailDisplayOverrides(
  vm: OfferSelfDescriptionDetailViewModel,
  overrides: { title?: string; providerLabel?: string; offeringTypeLabel?: string },
): OfferSelfDescriptionDetailViewModel {
  const title = overrides.title?.trim();
  const provider = overrides.providerLabel?.trim();
  const assetTypeLabel = overrides.offeringTypeLabel?.trim();
  return {
    ...vm,
    title: isBlank(vm.title) && title ? title : vm.title,
    providerLabel:
      isBlank(vm.providerLabel) || looksLikeUuid(vm.providerLabel) ? provider || vm.providerLabel : vm.providerLabel,
    offeringTypeLabel: assetTypeLabel || vm.offeringTypeLabel,
  };
}

function looksLikeUuid(value: string): boolean {
  const t = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t);
}
