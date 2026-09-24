import {
  normalizeSelfDescriptionSearchItem,
  selfDescriptionIdFromNormalized,
} from './normalize-self-description-search-item.util';

describe('normalizeSelfDescriptionSearchItem', () => {
  it('reads n wrapper', () => {
    const result = normalizeSelfDescriptionSearchItem({
      n: {
        name: 'wrapped',
        claimsGraphUri: ['did:wrapped'],
      },
    });
    expect(result.name).toBe('wrapped');
    expect(selfDescriptionIdFromNormalized(result)).toBe('did:wrapped');
  });

  it('reads i wrapper', () => {
    const result = normalizeSelfDescriptionSearchItem({
      i: {
        name: 'i-shape',
        claimsGraphUri: ['did:i'],
      },
    });
    expect(result.name).toBe('i-shape');
    expect(selfDescriptionIdFromNormalized(result)).toBe('did:i');
  });
});
