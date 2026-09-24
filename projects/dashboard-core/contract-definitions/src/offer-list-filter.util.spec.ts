import type { OfferCardViewModel } from './offer-card-view-model';
import { applyOfferListFilters, buildAssetTypeOptionsFromCards, sortOfferCards } from './offer-list-filter.util';

function card(partial: Partial<OfferCardViewModel> & Pick<OfferCardViewModel, 'id'>): OfferCardViewModel {
  return {
    contractDefinition: {} as OfferCardViewModel['contractDefinition'],
    accessPolicyId: '',
    contractPolicyId: '',
    assetsSelector: [],
    title: partial.title ?? partial.id,
    providerLabel: partial.providerLabel ?? 'provider',
    subtitle: partial.subtitle ?? partial.assetTypeKey ?? 'corpus',
    description: '',
    publishedAt: partial.publishedAt ?? '2026-01-01T00:00:00.000Z',
    assetDisplayName: partial.assetDisplayName ?? partial.title ?? partial.id,
    policySummary: partial.policySummary ?? '',
    priceLabel: 'Gratuito',
    statusBadge: 'Cat. Público',
    keywords: [],
    license: { title: '', spdx: '', url: '' },
    assetTypeKey: partial.assetTypeKey ?? 'corpus',
    isPublicOffering: partial.isPublicOffering ?? true,
    isFreeOffering: partial.isFreeOffering ?? true,
    ...partial,
  };
}

describe('offer-list-filter.util', () => {
  const cards = [
    card({ id: '1', title: 'Alpha corpus', assetTypeKey: 'corpus', isPublicOffering: true, isFreeOffering: true }),
    card({
      id: '2',
      title: 'Beta model',
      assetTypeKey: 'mlmodel',
      isPublicOffering: false,
      isFreeOffering: false,
      subtitle: 'mlmodel',
    }),
    card({ id: '3', title: 'Gamma api', assetTypeKey: 'api', isPublicOffering: true, isFreeOffering: false }),
  ];

  it('buildAssetTypeOptionsFromCards returns sorted options with counts', () => {
    expect(buildAssetTypeOptionsFromCards(cards)).toEqual([
      { value: 'api', label: 'API', count: 1 },
      { value: 'corpus', label: 'Corpus', count: 1 },
      { value: 'mlmodel', label: 'Modelo', count: 1 },
    ]);
  });

  it('filters by asset type', () => {
    const filtered = applyOfferListFilters(cards, {
      searchText: '',
      assetTypes: new Set(['corpus']),
      visibility: 'all',
      price: 'all',
    });
    expect(filtered.map(c => c.id)).toEqual(['1']);
  });

  it('filters by visibility and price', () => {
    const filtered = applyOfferListFilters(cards, {
      searchText: '',
      assetTypes: new Set(),
      visibility: 'public',
      price: 'paid',
    });
    expect(filtered.map(c => c.id)).toEqual(['3']);
  });

  it('filters by offer name only', () => {
    const filtered = applyOfferListFilters(cards, {
      searchText: 'beta',
      assetTypes: new Set(),
      visibility: 'all',
      price: 'all',
    });
    expect(filtered.map(c => c.id)).toEqual(['2']);
  });

  it('does not match search text in subtitle or other fields', () => {
    const filtered = applyOfferListFilters(
      [card({ id: 'x', title: 'Unrelated', subtitle: 'beta-type', assetTypeKey: 'corpus' })],
      {
        searchText: 'beta',
        assetTypes: new Set(),
        visibility: 'all',
        price: 'all',
      },
    );
    expect(filtered).toEqual([]);
  });

  it('sorts by title, type, and newest', () => {
    const byTitle = sortOfferCards(cards, 'title').map(c => c.id);
    expect(byTitle).toEqual(['1', '2', '3']);

    const byType = sortOfferCards(cards, 'type').map(c => c.id);
    expect(byType).toEqual(['3', '1', '2']);

    const newest = sortOfferCards(
      [
        card({ id: 'old', publishedAt: '2020-01-01T00:00:00.000Z' }),
        card({ id: 'new', publishedAt: '2026-06-01T00:00:00.000Z' }),
      ],
      'newest',
    ).map(c => c.id);
    expect(newest).toEqual(['new', 'old']);
  });
});
