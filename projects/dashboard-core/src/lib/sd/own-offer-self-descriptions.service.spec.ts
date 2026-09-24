import type { Asset } from '@think-it-labs/edc-connector-client';
import { collectOwnSelfDescriptionIds, isOwnSelfDescription } from './own-offer-self-descriptions.service';

const assetWith = (properties: Record<string, unknown>): Asset =>
  ({ '@id': 'asset-1', properties }) as unknown as Asset;

describe('own offer self-descriptions', () => {
  describe('collectOwnSelfDescriptionIds', () => {
    it('reads the sd id from `sdId`', () => {
      const ids = collectOwnSelfDescriptionIds([assetWith({ sdId: 'did:web:registry.gaia-x.eu:DataOffering:abc' })]);

      expect(ids.size).toBe(1);
      expect(ids.has('did:web:registry.gaia-x.eu:dataoffering:abc')).toBe(true);
    });

    it('falls back to `offer.offerID`', () => {
      const ids = collectOwnSelfDescriptionIds([assetWith({ 'offer.offerID': 'did:web:offer-2' })]);

      expect(ids.has('did:web:offer-2')).toBe(true);
    });

    it('skips assets that publish no offer', () => {
      const ids = collectOwnSelfDescriptionIds([assetWith({ name: 'plain asset' })]);

      expect(ids.size).toBe(0);
    });
  });

  describe('isOwnSelfDescription', () => {
    const ownIds = new Set(['did:web:registry.gaia-x.eu:dataoffering:abc']);

    it('matches regardless of case and surrounding spaces', () => {
      expect(isOwnSelfDescription(ownIds, '  DID:WEB:registry.gaia-x.eu:DataOffering:ABC ')).toBe(true);
    });

    it('does not match another participant offer', () => {
      expect(isOwnSelfDescription(ownIds, 'did:web:registry.gaia-x.eu:DataOffering:other')).toBe(false);
    });

    it('treats a missing or blank id as not own', () => {
      expect(isOwnSelfDescription(ownIds, undefined)).toBe(false);
      expect(isOwnSelfDescription(ownIds, '   ')).toBe(false);
    });

    it('matches nothing when the own set could not be resolved', () => {
      expect(isOwnSelfDescription(new Set<string>(), 'did:web:registry.gaia-x.eu:DataOffering:abc')).toBe(false);
    });
  });
});
