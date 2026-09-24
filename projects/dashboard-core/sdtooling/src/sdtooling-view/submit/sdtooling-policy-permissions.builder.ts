import {
  createEmptyPolicyCard,
  isAccessPolicyField,
  isUsagePolicyField,
  isValueEmpty,
} from '@eclipse-edc/dashboard-core/shacl-schema';
import type { DynamicField, PolicyCardValue } from '@eclipse-edc/dashboard-core/shacl-schema';
import { getPolicyCardsValue } from '../form-state/sdtooling-view.form-state';
import {
  USAGE_TYPE_DELETION_AFTER_USAGE,
  USAGE_TYPE_RESTRICTED_DURATION,
  USAGE_TYPE_RESTRICTED_NUMBER,
} from '../sdtooling-view.types';

export const buildAccessPolicyPermissionsJson = (cards: PolicyCardValue[]): string | undefined => {
  const permissions = cards
    .filter(card => Object.values(card).some(cardValue => !isValueEmpty(cardValue)))
    .map(card => ({
      assignee: card.attribute,
      action: card.action,
      fromDatetime: card.from || undefined,
      toDatetime: card.to || undefined,
    }))
    .filter(p => !isValueEmpty(p.assignee) && !isValueEmpty(p.action));

  return permissions.length > 0 ? JSON.stringify(permissions) : undefined;
};

export const buildUsagePolicyPermissionsJson = (cards: PolicyCardValue[]): string | undefined => {
  const permissions = cards
    .filter(card => Object.values(card).some(cardValue => !isValueEmpty(cardValue)))
    .map(card => {
      const constraints: Record<string, unknown>[] = [];
      if (card.usageType === USAGE_TYPE_DELETION_AFTER_USAGE) {
        constraints.push({ type: 'Deletion', assignee: card.usageAssignee, afterUse: true });
      } else if (card.usageType === USAGE_TYPE_RESTRICTED_NUMBER) {
        const maxCount = Number.parseInt(card.numberOfUsages, 10) || 1;
        constraints.push({ type: 'RestrictedNumber', assignee: card.usageAssignee, maxCount });
      } else if (card.usageType === USAGE_TYPE_RESTRICTED_DURATION) {
        constraints.push({
          type: 'RestrictedDuration',
          assignee: card.usageAssignee,
          fromDatetime: card.from || undefined,
          toDatetime: card.to || undefined,
        });
      }

      return {
        assignee: card.usageAssignee,
        action: 'USE',
        constraints,
      };
    })
    .filter(p => !isValueEmpty(p.assignee) && Array.isArray(p.constraints) && p.constraints.length > 0);

  return permissions.length > 0 ? JSON.stringify(permissions) : undefined;
};

export const buildPolicyFieldSubmissionValue = (field: DynamicField, rawValue: unknown): string | undefined => {
  const cards = getPolicyCardsValue(rawValue, createEmptyPolicyCard);
  if (isAccessPolicyField(field.key)) {
    return buildAccessPolicyPermissionsJson(cards);
  }
  if (isUsagePolicyField(field.key)) {
    return buildUsagePolicyPermissionsJson(cards);
  }
  return undefined;
};
