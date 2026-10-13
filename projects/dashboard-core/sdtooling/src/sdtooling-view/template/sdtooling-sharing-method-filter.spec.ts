import { filterSharingMethodsForOfferKind } from './sdtooling-sharing-method-filter';

describe('filterSharingMethodsForOfferKind', () => {
  const options = [
    { value: 'HTTPDATA_PUSH', label: 'HTTPDATA_PUSH' },
    { value: 'IONOS_S3', label: 'IONOS_S3' },
    { value: 'REST_API', label: 'REST_API' },
  ];

  it('offers every method except REST_API to corpus, LCR and model offers', () => {
    for (const kind of ['corpus', 'lcr', 'model'] as const) {
      expect(filterSharingMethodsForOfferKind(options, kind).map(option => option.value)).toEqual([
        'HTTPDATA_PUSH',
        'IONOS_S3',
      ]);
    }
  });

  it('offers only REST_API to API offers', () => {
    expect(filterSharingMethodsForOfferKind(options, 'api')).toEqual([{ value: 'REST_API', label: 'REST_API' }]);
  });

  it('does not filter when the offer type is unknown', () => {
    expect(filterSharingMethodsForOfferKind(options, undefined)).toBe(options);
  });
});
