import type { ValidationErrors } from '@angular/forms';
import type { DynamicField, PolicyCardValue } from './dynamic-schema-form.types';

export const POLICY_CARD_ARRAY_CONTROL_TYPE = 'policy-card-array';
export const ACCESS_POLICY_FIELD_KEY = 'simpl:access-policy';
export const USAGE_POLICY_FIELD_KEY = 'simpl:usage-policy';

export const USAGE_TYPE_DELETION_AFTER_USAGE = 'deletion-after-usage';
export const USAGE_TYPE_RESTRICTED_NUMBER = 'restricted-number-of-usages';
export const USAGE_TYPE_RESTRICTED_DURATION = 'restricted-duration-of-usage';

export const isAccessPolicyField = (fieldKey: string): boolean => {
  return fieldKey === ACCESS_POLICY_FIELD_KEY;
};

export const isUsagePolicyField = (fieldKey: string): boolean => {
  return fieldKey === USAGE_POLICY_FIELD_KEY;
};

export const isPolicyCardFieldKey = (fieldKey: string): boolean => {
  return isAccessPolicyField(fieldKey) || isUsagePolicyField(fieldKey);
};

export const isPolicyCardArrayField = (field: DynamicField): boolean => {
  return field.controlType === POLICY_CARD_ARRAY_CONTROL_TYPE;
};

export const createEmptyPolicyCard = (): PolicyCardValue => {
  return createEmptyAccessPolicyCard();
};

export const createEmptyAccessPolicyCard = (): PolicyCardValue => {
  return {
    action: '',
    attribute: '',
    usageAssignee: '',
    usageType: USAGE_TYPE_DELETION_AFTER_USAGE,
    numberOfUsages: '1',
    from: '',
    to: '',
  };
};

export const createEmptyUsagePolicyCard = (): PolicyCardValue => {
  return {
    action: '',
    attribute: '',
    usageAssignee: '',
    usageType: USAGE_TYPE_DELETION_AFTER_USAGE,
    numberOfUsages: '1',
    from: '',
    to: '',
  };
};

export const createEmptyPolicyCardForField = (fieldKey: string): PolicyCardValue => {
  if (isUsagePolicyField(fieldKey)) {
    return createEmptyUsagePolicyCard();
  }
  return {
    ...createEmptyAccessPolicyCard(),
  };
};

// ---------------------------------------------------------------------------
// Validación de tarjetas de política
//
// El control de un campo policy-card-array siempre arranca con una tarjeta
// vacía, así que Validators.required nunca falla (el array no está vacío).
// Sin estas comprobaciones el usuario podía avanzar de paso y enviar la
// SelfDescription sin ninguna política, pese al asterisco de obligatorio.
// ---------------------------------------------------------------------------

export type PolicyCardErrorKey = 'action' | 'attribute' | 'usageAssignee' | 'numberOfUsages' | 'from' | 'to';

export interface PolicyCardError {
  index: number;
  keys: PolicyCardErrorKey[];
}

const isBlankString = (value: unknown): boolean => {
  return typeof value !== 'string' || value.trim().length === 0;
};

/** Tarjetas del control, conservando su posición original (es la que se muestra al usuario). */
const asIndexedPolicyCards = (rawValue: unknown): { card: PolicyCardValue; index: number }[] => {
  if (!Array.isArray(rawValue)) {
    return [];
  }
  return rawValue
    .map((card, index) => ({ card: card as PolicyCardValue, index }))
    .filter(entry => !!entry.card && typeof entry.card === 'object' && !Array.isArray(entry.card));
};

/**
 * Una tarjeta está en blanco cuando el usuario no ha introducido nada en ella.
 * `usageType` y `numberOfUsages` se ignoran: vienen con valor por defecto.
 */
export const isPolicyCardBlank = (fieldKey: string, card: PolicyCardValue): boolean => {
  if (isUsagePolicyField(fieldKey)) {
    return isBlankString(card.usageAssignee) && isBlankString(card.from) && isBlankString(card.to);
  }
  return (
    isBlankString(card.action) && isBlankString(card.attribute) && isBlankString(card.from) && isBlankString(card.to)
  );
};

/** Campos que faltan por rellenar en una tarjeta (mismos requisitos que el builder del payload). */
export const getPolicyCardErrorKeys = (fieldKey: string, card: PolicyCardValue): PolicyCardErrorKey[] => {
  const keys: PolicyCardErrorKey[] = [];

  if (isUsagePolicyField(fieldKey)) {
    if (isBlankString(card.usageAssignee)) {
      keys.push('usageAssignee');
    }
    if (card.usageType === USAGE_TYPE_RESTRICTED_NUMBER) {
      const parsed = Number.parseInt(card.numberOfUsages, 10);
      if (!Number.isFinite(parsed) || parsed < 1) {
        keys.push('numberOfUsages');
      }
    }
    if (card.usageType === USAGE_TYPE_RESTRICTED_DURATION) {
      if (isBlankString(card.from)) {
        keys.push('from');
      }
      if (isBlankString(card.to)) {
        keys.push('to');
      }
    }
    return keys;
  }

  if (isBlankString(card.action)) {
    keys.push('action');
  }
  if (isBlankString(card.attribute)) {
    keys.push('attribute');
  }
  return keys;
};

/**
 * Valida el valor completo de un campo policy-card-array:
 * - si el campo es obligatorio, debe haber al menos una tarjeta rellenada;
 * - toda tarjeta empezada debe estar completa (si no, se descarta al enviar).
 */
export const validatePolicyCardsValue = (
  fieldKey: string,
  required: boolean,
  rawValue: unknown,
): ValidationErrors | null => {
  const filledCards = asIndexedPolicyCards(rawValue).filter(entry => !isPolicyCardBlank(fieldKey, entry.card));

  if (filledCards.length === 0) {
    return required ? { required: true } : null;
  }

  const policyCardErrors = filledCards
    .map(entry => ({ index: entry.index, keys: getPolicyCardErrorKeys(fieldKey, entry.card) }))
    .filter(entry => entry.keys.length > 0);

  return policyCardErrors.length > 0 ? { policyCardErrors } : null;
};

/** Indica si un subcampo concreto de una tarjeta está marcado como erróneo. */
export const hasPolicyCardFieldError = (
  controlErrors: Record<string, unknown> | null | undefined,
  index: number,
  key: PolicyCardErrorKey,
): boolean => {
  const policyCardErrors = controlErrors?.['policyCardErrors'];
  if (!Array.isArray(policyCardErrors)) {
    return false;
  }
  return (policyCardErrors as PolicyCardError[]).some(entry => entry.index === index && entry.keys.includes(key));
};
