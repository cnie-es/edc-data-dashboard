import type { Asset } from '@think-it-labs/edc-connector-client';
import { readAssetPropertyString } from '../utils/asset-property-string.util';
import type { OfferSelfDescriptionDetailViewModel } from './corpus-offering-self-description.mapper';

function isBlank(value: string | undefined): boolean {
  return !value?.trim();
}

function assetDisplayTitle(asset: Asset): string | undefined {
  return (
    readAssetPropertyString(asset, 'assetTitle') ??
    readAssetPropertyString(asset, 'simpl:name') ??
    readAssetPropertyString(asset, 'name') ??
    readAssetPropertyString(asset, 'offer.offer_name')
  );
}

function assetDisplayDescription(asset: Asset): string | undefined {
  return (
    readAssetPropertyString(asset, 'assetDescription') ??
    readAssetPropertyString(asset, 'simpl:description') ??
    readAssetPropertyString(asset, 'description')
  );
}

/** Fills sparse corpus VM fields from EDC asset properties (Mis activos list parity). */
export function mergeEdcAssetIntoCorpusDetailVm(
  vm: OfferSelfDescriptionDetailViewModel,
  asset: Asset | undefined,
): OfferSelfDescriptionDetailViewModel {
  if (!asset) {
    return vm;
  }

  const title = assetDisplayTitle(asset);
  const description = assetDisplayDescription(asset);
  const assetType = readAssetPropertyString(asset, 'assetType');

  return {
    ...vm,
    title: isBlank(vm.title) && title ? title : vm.title,
    description: isBlank(vm.description) && description ? description : vm.description,
    offeringTypeLabel: isBlank(vm.offeringTypeLabel) && assetType ? assetType : vm.offeringTypeLabel,
  };
}
