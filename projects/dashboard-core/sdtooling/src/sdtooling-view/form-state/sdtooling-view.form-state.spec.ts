import type { PolicyCardValue } from '@eclipse-edc/dashboard-core/shacl-schema';
import {
  addArrayTokenValue,
  addPolicyCardValue,
  getPolicyCardTitle,
  getPolicyCardsValue,
  parseArrayTokens,
  removeArrayTokenValue,
  removePolicyCardValue,
  updatePolicyCardValue,
} from './sdtooling-view.form-state';

const createCard = (): PolicyCardValue => ({
  action: '',
  attribute: '',
  usageAssignee: '',
  usageType: 'deletion-after-usage',
  numberOfUsages: '1',
  from: '',
  to: '',
});

describe('sdtooling-view.form-state', () => {
  it('should parse comma-separated tokens', () => {
    expect(parseArrayTokens('one, two, three')).toEqual(['one', 'two', 'three']);
  });

  it('should add and remove array tokens', () => {
    const added = addArrayTokenValue('one, two', 'three');
    expect(added).toEqual(['one', 'two', 'three']);
    expect(removeArrayTokenValue(added.join(', '), 1)).toEqual(['one', 'three']);
  });

  it('should keep at least one policy card when removing', () => {
    const cards = getPolicyCardsValue(undefined, createCard);
    expect(cards.length).toBe(1);
    expect(removePolicyCardValue(cards, 0, createCard).length).toBe(1);
  });

  it('should add and update policy cards', () => {
    const cards = addPolicyCardValue(undefined, createCard);
    expect(cards.length).toBe(2);
    const updated = updatePolicyCardValue(cards, 1, 'action', 'fetch', createCard);
    expect(updated[1].action).toBe('fetch');
    expect(getPolicyCardTitle(1)).toBe('Policy 2');
  });

  it('should normalize restricted-number usage cards', () => {
    const cards = [createCard()];
    const withType = updatePolicyCardValue(cards, 0, 'usageType', 'restricted-number-of-usages', createCard, true);
    const normalized = updatePolicyCardValue(withType, 0, 'numberOfUsages', '0', createCard, true);
    expect(normalized[0].numberOfUsages).toBe('1');
    expect(normalized[0].from).toBe('');
    expect(normalized[0].to).toBe('');
  });

  it('should clear number on restricted-duration usage cards', () => {
    const cards = [
      {
        ...createCard(),
        usageType: 'restricted-number-of-usages',
        numberOfUsages: '3',
      },
    ];
    const updated = updatePolicyCardValue(cards, 0, 'usageType', 'restricted-duration-of-usage', createCard, true);
    expect(updated[0].numberOfUsages).toBe('1');
  });

  it('should preserve access-policy date values', () => {
    const cards = [createCard()];
    const withFrom = updatePolicyCardValue(cards, 0, 'from', '2026-04-15T10:00', createCard);
    const withTo = updatePolicyCardValue(withFrom, 0, 'to', '2026-04-30T10:00', createCard);
    expect(withTo[0].from).toBe('2026-04-15T10:00');
    expect(withTo[0].to).toBe('2026-04-30T10:00');
  });
});
