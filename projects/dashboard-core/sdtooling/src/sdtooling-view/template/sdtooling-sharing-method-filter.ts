import type { OfferCreateKind } from '@eclipse-edc/dashboard-core';
import type { SharingMethodSelectOption } from '../sdtooling-view.types';

const REST_API_SHARING_METHOD = 'REST_API';

const isRestApi = (option: SharingMethodSelectOption): boolean =>
  option.value.trim().toUpperCase() === REST_API_SHARING_METHOD;

/**
 * Sharing methods offered for each offer type: API offers are only shared through REST_API, while corpus,
 * lexical-conceptual resource and model offers can use every other method. Unknown offer types are not filtered.
 */
export const filterSharingMethodsForOfferKind = (
  options: SharingMethodSelectOption[],
  kind: OfferCreateKind | undefined,
): SharingMethodSelectOption[] => {
  if (!kind) {
    return options;
  }
  return kind === 'api' ? options.filter(isRestApi) : options.filter(option => !isRestApi(option));
};
