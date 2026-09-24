import { toArrayValues } from '@eclipse-edc/dashboard-core/shacl-schema';
import type { PolicyCardValue } from '@eclipse-edc/dashboard-core/shacl-schema';
import {
  USAGE_TYPE_DELETION_AFTER_USAGE,
  USAGE_TYPE_RESTRICTED_DURATION,
  USAGE_TYPE_RESTRICTED_NUMBER,
} from '../sdtooling-view.types';

export const getPolicyCardsValue = (rawValue: unknown, createCard: () => PolicyCardValue): PolicyCardValue[] => {
  if (!Array.isArray(rawValue)) {
    return [createCard()];
  }
  return rawValue as PolicyCardValue[];
};

export const addPolicyCardValue = (rawValue: unknown, createCard: () => PolicyCardValue): PolicyCardValue[] => {
  const cards = getPolicyCardsValue(rawValue, createCard);
  return [...cards, createCard()];
};

export const removePolicyCardValue = (
  rawValue: unknown,
  index: number,
  createCard: () => PolicyCardValue,
): PolicyCardValue[] => {
  const cards = getPolicyCardsValue(rawValue, createCard);
  if (cards.length <= 1) {
    return cards;
  }
  return cards.filter((_, cardIndex) => cardIndex !== index);
};

export const updatePolicyCardValue = (
  rawValue: unknown,
  index: number,
  key: keyof PolicyCardValue,
  value: string,
  createCard: () => PolicyCardValue,
  normalizeUsageCard = false,
): PolicyCardValue[] => {
  const cards = getPolicyCardsValue(rawValue, createCard);
  return cards.map((card, cardIndex) => {
    if (cardIndex !== index) {
      return card;
    }
    const updatedCard = { ...card, [key]: value } as PolicyCardValue;
    if (!normalizeUsageCard) {
      return updatedCard;
    }
    return normalizeUsagePolicyCard(updatedCard);
  });
};

export const getPolicyCardTitle = (index: number): string => {
  return `Policy ${index + 1}`;
};

export const parseArrayTokens = (rawValue: unknown): string[] => {
  return toArrayValues(rawValue);
};

export const addArrayTokenValue = (rawValue: unknown, draftValue: string): string[] => {
  const token = draftValue.trim();
  if (!token) {
    return parseArrayTokens(rawValue);
  }
  return [...parseArrayTokens(rawValue), token];
};

export const removeArrayTokenValue = (rawValue: unknown, index: number): string[] => {
  return parseArrayTokens(rawValue).filter((_, tokenIndex) => tokenIndex !== index);
};

const normalizeUsagePolicyCard = (card: PolicyCardValue): PolicyCardValue => {
  if (!card.usageType) {
    return card;
  }
  if (card.usageType === USAGE_TYPE_RESTRICTED_NUMBER) {
    return {
      ...card,
      numberOfUsages: toPositiveIntegerString(card.numberOfUsages),
      from: '',
      to: '',
    };
  }
  if (card.usageType === USAGE_TYPE_RESTRICTED_DURATION) {
    return {
      ...card,
      numberOfUsages: '1',
    };
  }
  if (card.usageType === USAGE_TYPE_DELETION_AFTER_USAGE) {
    return {
      ...card,
      numberOfUsages: '1',
      from: '',
      to: '',
    };
  }
  return card;
};

const toPositiveIntegerString = (value: string): string => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return '1';
  }
  return String(parsed);
};
