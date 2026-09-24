export type FilterCategory = 'assetType' | 'visibility' | 'price';

export type VisibilityFilter = 'all' | 'public' | 'private';
export type PriceFilter = 'all' | 'free' | 'paid';

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

export interface RadioFilterOption<T extends string> {
  value: T;
  label: string;
}

export interface AppliedFilterChip {
  category: FilterCategory;
  categoryLabel: string;
  value: string;
  label: string;
}

export const OFFER_CARD_DEFAULTS = {
  providerLabel: 'Telefonica IoT Big Data Tech (temporary)',
  subtitle: 'Data product',
  description: 'No description available.',
  priceLabel: 'Gratuito (temporary)',
  statusBadge: 'Cat. publico (temporary)',
} as const;

export const ASSET_TYPE_FILTER_LABELS: Record<string, string> = {
  corpus: 'filters.assetType.corpus',
  mlmodel: 'filters.assetType.mlmodel',
  api: 'filters.assetType.api',
  lexicalconceptualresource: 'filters.assetType.lexicalconceptualresource',
};

export const VISIBILITY_FILTER_OPTIONS: RadioFilterOption<VisibilityFilter>[] = [
  { value: 'all', label: 'filters.visibility.all' },
  { value: 'public', label: 'filters.visibility.public' },
  { value: 'private', label: 'filters.visibility.private' },
];

export const PRICE_FILTER_OPTIONS: RadioFilterOption<PriceFilter>[] = [
  { value: 'all', label: 'filters.price.all' },
  { value: 'free', label: 'filters.price.free' },
  { value: 'paid', label: 'filters.price.paid' },
];

export const FILTER_CATEGORY_LABELS: Record<FilterCategory, string> = {
  assetType: 'filters.category.assetType',
  visibility: 'filters.category.visibility',
  price: 'filters.category.price',
};
