import { applyOfferPendingSchemaSelection } from './sdtooling-offer-pending-schema';

describe('sdtooling-offer-pending-schema', () => {
  it('merges synthetic schema option when not in catalog list', () => {
    const result = applyOfferPendingSchemaSelection({
      schemaId: 'CorpusSchema_ES',
      serviceOptions: [],
      storageRaw: JSON.stringify({ id: 'CorpusSchema_ES', resourceType: 'data', label: 'Corpus' }),
    });

    expect(result.shouldSelectSchema).toBeTrue();
    expect(result.serviceOptions.length).toBe(1);
    expect(result.serviceOptions[0].value).toBe('CorpusSchema_ES');
    expect(result.selectedSchema).toBe('CorpusSchema_ES');
  });

  it('returns error when schema not listed and no pending payload', () => {
    const result = applyOfferPendingSchemaSelection({
      schemaId: 'UnknownSchema',
      serviceOptions: [],
      storageRaw: null,
    });

    expect(result.shouldSelectSchema).toBeFalse();
    expect(result.errorKey).toBe('sdtooling.errors.schemaNotListed');
  });
});
