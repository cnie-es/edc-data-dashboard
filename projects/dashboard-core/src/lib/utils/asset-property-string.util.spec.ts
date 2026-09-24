import type { Asset } from '@think-it-labs/edc-connector-client';
import { readAssetPropertyString } from './asset-property-string.util';

describe('readAssetPropertyString', () => {
  it('reads a plain string property key', () => {
    const asset = { properties: { assetType: 'ms:Corpus' } } as unknown as Asset;
    expect(readAssetPropertyString(asset, 'assetType')).toBe('ms:Corpus');
  });

  it('reads via optionalValue like edc-connector-client', () => {
    const asset = {
      properties: {
        optionalValue: (ns: string, prop: string) =>
          ns === 'edc' && prop === 'offer.offer_name' ? 'PruebaMario' : undefined,
      },
    } as unknown as Asset;
    expect(readAssetPropertyString(asset, 'offer.offer_name')).toBe('PruebaMario');
  });

  it('reads expanded edc IRI property keys', () => {
    const asset = {
      properties: {
        'https://w3id.org/edc/v0.0.1/ns/offer.offer_name': 'From expanded key',
      },
    } as unknown as Asset;
    expect(readAssetPropertyString(asset, 'offer.offer_name')).toBe('From expanded key');
  });

  it('reads JSON-LD @value objects', () => {
    const asset = {
      properties: {
        assetDescription: { '@value': 'Offer description text' },
      },
    } as unknown as Asset;
    expect(readAssetPropertyString(asset, 'assetDescription')).toBe('Offer description text');
  });

  it('reads offer.license from expanded root properties array with @value', () => {
    const edcNs = 'https://w3id.org/edc/v0.0.1/ns/';
    const asset = {
      '@id': 'asset-expanded',
      [`${edcNs}properties`]: [
        {
          [`${edcNs}offer.license`]: [{ '@value': 'https://www.apache.org/licenses/LICENSE-2.0.txt' }],
        },
      ],
    } as unknown as Asset;
    expect(readAssetPropertyString(asset, 'offer.license')).toBe('https://www.apache.org/licenses/LICENSE-2.0.txt');
  });
});
