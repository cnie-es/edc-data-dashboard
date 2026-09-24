import { FormControl } from '@angular/forms';
import {
  ACCESS_POLICY_FIELD_KEY,
  createEmptyAccessPolicyCard,
  createEmptyUsagePolicyCard,
  hasPolicyCardFieldError,
  POLICY_CARD_ARRAY_CONTROL_TYPE,
  USAGE_POLICY_FIELD_KEY,
  USAGE_TYPE_RESTRICTED_DURATION,
  USAGE_TYPE_RESTRICTED_NUMBER,
  validatePolicyCardsValue,
} from './dynamic-schema-form.policy';
import { createFieldValidators } from './dynamic-schema-form.validators';
import type { DynamicField, PolicyCardValue } from './dynamic-schema-form.types';

const policyField = (key: string, required: boolean): DynamicField => ({
  key,
  controlName: `servicePolicy_${key}`,
  label: key,
  description: '',
  type: 'string',
  controlType: POLICY_CARD_ARRAY_CONTROL_TYPE,
  enumOptions: [],
  required,
  schema: {},
});

const controlFor = (field: DynamicField, value: PolicyCardValue[]): FormControl =>
  new FormControl(value, createFieldValidators(field));

describe('policy card validation', () => {
  describe('access policy', () => {
    it('marks a required field as invalid when the only card is empty', () => {
      const field = policyField(ACCESS_POLICY_FIELD_KEY, true);
      const control = controlFor(field, [createEmptyAccessPolicyCard()]);

      expect(control.invalid).toBe(true);
      expect(control.errors).toEqual({ required: true });
    });

    it('accepts an empty card when the field is optional', () => {
      const field = policyField(ACCESS_POLICY_FIELD_KEY, false);
      const control = controlFor(field, [createEmptyAccessPolicyCard()]);

      expect(control.valid).toBe(true);
    });

    it('reports the missing subfield of a partially filled card', () => {
      const field = policyField(ACCESS_POLICY_FIELD_KEY, true);
      const control = controlFor(field, [{ ...createEmptyAccessPolicyCard(), action: 'USE' }]);

      expect(control.invalid).toBe(true);
      expect(hasPolicyCardFieldError(control.errors, 0, 'attribute')).toBe(true);
      expect(hasPolicyCardFieldError(control.errors, 0, 'action')).toBe(false);
    });

    it('accepts a card with action and attribute', () => {
      const field = policyField(ACCESS_POLICY_FIELD_KEY, true);
      const control = controlFor(field, [
        { ...createEmptyAccessPolicyCard(), action: 'USE', attribute: 'simpl:country' },
      ]);

      expect(control.valid).toBe(true);
    });

    it('keeps the error index of each incomplete card', () => {
      const errors = validatePolicyCardsValue(ACCESS_POLICY_FIELD_KEY, true, [
        { ...createEmptyAccessPolicyCard(), action: 'USE', attribute: 'simpl:country' },
        { ...createEmptyAccessPolicyCard(), attribute: 'simpl:country' },
      ]);

      expect(errors).toEqual({ policyCardErrors: [{ index: 1, keys: ['action'] }] });
    });
  });

  describe('usage policy', () => {
    it('ignores the preset usageType when deciding whether a card is empty', () => {
      const field = policyField(USAGE_POLICY_FIELD_KEY, true);
      const control = controlFor(field, [createEmptyUsagePolicyCard()]);

      expect(control.invalid).toBe(true);
      expect(control.errors).toEqual({ required: true });
    });

    it('accepts a deletion-after-usage card with an assignee', () => {
      const field = policyField(USAGE_POLICY_FIELD_KEY, true);
      const control = controlFor(field, [{ ...createEmptyUsagePolicyCard(), usageAssignee: 'simpl:country' }]);

      expect(control.valid).toBe(true);
    });

    it('requires a positive number of usages for restricted-number cards', () => {
      const errors = validatePolicyCardsValue(USAGE_POLICY_FIELD_KEY, true, [
        {
          ...createEmptyUsagePolicyCard(),
          usageAssignee: 'simpl:country',
          usageType: USAGE_TYPE_RESTRICTED_NUMBER,
          numberOfUsages: '0',
        },
      ]);

      expect(errors).toEqual({ policyCardErrors: [{ index: 0, keys: ['numberOfUsages'] }] });
    });

    it('requires both dates for restricted-duration cards', () => {
      const errors = validatePolicyCardsValue(USAGE_POLICY_FIELD_KEY, true, [
        {
          ...createEmptyUsagePolicyCard(),
          usageAssignee: 'simpl:country',
          usageType: USAGE_TYPE_RESTRICTED_DURATION,
        },
      ]);

      expect(errors).toEqual({ policyCardErrors: [{ index: 0, keys: ['from', 'to'] }] });
    });

    it('flags an incomplete card even when the field is optional', () => {
      const field = policyField(USAGE_POLICY_FIELD_KEY, false);
      const control = controlFor(field, [
        { ...createEmptyUsagePolicyCard(), usageType: USAGE_TYPE_RESTRICTED_DURATION, from: '2026-01-01T00:00' },
      ]);

      expect(control.invalid).toBe(true);
      expect(hasPolicyCardFieldError(control.errors, 0, 'to')).toBe(true);
      expect(hasPolicyCardFieldError(control.errors, 0, 'usageAssignee')).toBe(true);
    });
  });
});
