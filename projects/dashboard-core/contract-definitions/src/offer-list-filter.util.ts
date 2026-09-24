import {
  ASSET_TYPE_FILTER_LABELS,
  PRICE_FILTER_OPTIONS,
  VISIBILITY_FILTER_OPTIONS,
  type FilterOption,
  type PriceFilter,
  type VisibilityFilter,
} from './contract-definitions-ui.constants';
import type { OfferCardViewModel } from './offer-card-view-model';

export type OfferListSort = 'title' | 'newest' | 'type';

export interface OfferListFilterCriteria {
  searchText: string;
  assetTypes: ReadonlySet<string>;
  visibility: VisibilityFilter;
  price: PriceFilter;
}

export function assetTypeFilterLabel(key: string): string {
  return ASSET_TYPE_FILTER_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

export function buildAssetTypeOptionsFromCards(cards: readonly OfferCardViewModel[]): FilterOption[] {
  const counts = new Map<string, number>();
  for (const card of cards) {
    const key = card.assetTypeKey.trim();
    if (!key) {
      continue;
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([a], [b]) => assetTypeFilterLabel(a).localeCompare(assetTypeFilterLabel(b)))
    .map(([value, count]) => ({
      value,
      label: assetTypeFilterLabel(value),
      count,
    }));
}

export function applyOfferListFilters(
  cards: readonly OfferCardViewModel[],
  criteria: OfferListFilterCriteria,
): OfferCardViewModel[] {
  const q = criteria.searchText.trim().toLowerCase();

  return cards.filter(card => {
    if (q.length > 0 && !card.title.toLowerCase().includes(q)) {
      return false;
    }

    if (criteria.assetTypes.size > 0 && !criteria.assetTypes.has(card.assetTypeKey)) {
      return false;
    }

    if (criteria.visibility === 'public' && !card.isPublicOffering) {
      return false;
    }
    if (criteria.visibility === 'private' && card.isPublicOffering) {
      return false;
    }

    if (criteria.price === 'free' && !card.isFreeOffering) {
      return false;
    }
    if (criteria.price === 'paid' && card.isFreeOffering) {
      return false;
    }

    return true;
  });
}

export function sortOfferCards(cards: readonly OfferCardViewModel[], sort: OfferListSort): OfferCardViewModel[] {
  const copy = [...cards];

  if (sort === 'newest') {
    copy.sort((a, b) => toTimestamp(b.publishedAt) - toTimestamp(a.publishedAt));
    return copy;
  }

  if (sort === 'type') {
    copy.sort((a, b) => a.subtitle.localeCompare(b.subtitle));
    return copy;
  }

  copy.sort((a, b) => a.title.localeCompare(b.title));
  return copy;
}

export function visibilityFilterLabel(value: VisibilityFilter): string {
  return VISIBILITY_FILTER_OPTIONS.find(option => option.value === value)?.label ?? value;
}

export function priceFilterLabel(value: PriceFilter): string {
  return PRICE_FILTER_OPTIONS.find(option => option.value === value)?.label ?? value;
}

function toTimestamp(value: string): number {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}
