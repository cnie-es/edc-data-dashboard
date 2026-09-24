import type { Asset } from '@think-it-labs/edc-connector-client';
import { buildOfferCardViewModelsFromAssets } from './offer-card-from-asset.mapper';

describe('buildOfferCardViewModelsFromAssets', () => {
  const baseAsset = {
    id: 'asset-offer-1',
    '@id': 'asset-offer-1',
    accessPolicyId: 'acc-pol-1',
    contractPolicyId: 'con-pol-1',
    properties: {
      'offer.offer_name': 'Offer display name',
      assetType: 'ms:Corpus',
      createdAt: '2026-05-10T12:00:00.000Z',
      'offer.isPublic': 'true',
      'offer.isFree': 'false',
      'simpl:price': '12',
      assetDescription: 'Desc',
      'offer.offerID': 'did:web:registry.example:offer-1',
    },
  } as unknown as Asset;

  it('maps offer fields, assetType, contract policy id, public badge, and paid price', () => {
    const [card] = buildOfferCardViewModelsFromAssets([baseAsset], 'consumer');
    expect(card.providerLabel).toBe('consumer');
    expect(card.title).toBe('Offer display name');
    expect(card.subtitle).toBe('corpus');
    expect(card.assetDisplayName).toBe('Offer display name');
    expect(card.policySummary).toBe('');
    expect(card.policyEnrichmentStatus).toBe('idle');
    expect(card.statusBadge).toBe('Cat. Público');
    expect(card.priceLabel).toBe('12 € + IVA');
    expect(card.contractPolicyId).toBe('con-pol-1');
    expect(card.accessPolicyId).toBe('acc-pol-1');
    expect(card.offerSelfDescriptionId).toBe('did:web:registry.example:offer-1');
    expect(card.assetTypeKey).toBe('corpus');
    expect(card.isPublicOffering).toBeTrue();
    expect(card.isFreeOffering).toBeFalse();
  });

  it('uses Gratuito and Cat. No público when flags say so', () => {
    const asset = {
      ...baseAsset,
      properties: {
        ...(baseAsset as unknown as { properties: Record<string, string> }).properties,
        'offer.isPublic': 'false',
        'offer.isFree': 'true',
      },
    } as unknown as Asset;
    const [card] = buildOfferCardViewModelsFromAssets([asset], undefined);
    expect(card.statusBadge).toBe('Cat. No público');
    expect(card.priceLabel).toBe('Gratuito');
    expect(card.providerLabel).toContain('temporary');
    expect(card.isPublicOffering).toBeFalse();
    expect(card.isFreeOffering).toBeTrue();
  });

  it('maps title and subtitle from expanded IRI properties like IndexedDB payloads', () => {
    const asset = {
      id: '0868093e-0c4f-44e7-9a50-4ce1aa76f9d6',
      properties: {
        'https://w3id.org/edc/v0.0.1/ns/offer.offer_name': 'PruebaMario',
        'https://w3id.org/edc/v0.0.1/ns/assetType': 'ms:Corpus',
        'https://w3id.org/edc/v0.0.1/ns/offer.isPublic': 'true',
        'https://w3id.org/edc/v0.0.1/ns/offer.isFree': 'true',
      },
    } as unknown as Asset;
    const [card] = buildOfferCardViewModelsFromAssets([asset], 'provider');
    expect(card.title).toBe('PruebaMario');
    expect(card.subtitle).toBe('corpus');
    expect(card.statusBadge).toBe('Cat. Público');
    expect(card.priceLabel).toBe('Gratuito');
    expect(card.providerLabel).toBe('provider');
  });

  it('uses sdId for offerSelfDescriptionId when offer.offerID is absent', () => {
    const asset = {
      id: 'asset-sd-only',
      properties: {
        sdId: 'did:web:registry.gaia-x.eu:CorpusOffering:sd-only',
        'offer.offer_name': 'SD only offer',
      },
    } as unknown as Asset;
    const [card] = buildOfferCardViewModelsFromAssets([asset], undefined);
    expect(card.offerSelfDescriptionId).toBe('did:web:registry.gaia-x.eu:CorpusOffering:sd-only');
  });

  it('uses connectorName from EDC config for providerLabel on all cards', () => {
    const [card] = buildOfferCardViewModelsFromAssets([baseAsset], 'consumer');
    expect(card.providerLabel).toBe('consumer');
  });

  it('strips vocabulary prefix from assetType subtitle', () => {
    const asset = {
      ...baseAsset,
      properties: {
        ...(baseAsset as unknown as { properties: Record<string, string> }).properties,
        assetType: 'omtd:Something',
      },
    } as unknown as Asset;
    const [card] = buildOfferCardViewModelsFromAssets([asset], 'consumer');
    expect(card.subtitle).toBe('something');
  });

  it('uses default subtitle when assetType is missing', () => {
    const asset = {
      id: 'no-type',
      properties: { 'offer.offer_name': 'No type' },
    } as unknown as Asset;
    const [card] = buildOfferCardViewModelsFromAssets([asset], 'consumer');
    expect(card.subtitle).toBe('Data product');
    expect(card.assetTypeKey).toBe('data product');
  });
});
