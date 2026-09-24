import type { TranslateService } from '@ngx-translate/core';
import type { DynamicField, DynamicObjectArrayItemScalarField } from './dynamic-schema-form.types';
import {
  findNestedFieldError,
  resolveDynamicFieldError,
  resolveObjectArrayItemFieldError,
} from './dynamic-field-errors.util';

describe('resolveDynamicFieldError', () => {
  const field = {
    key: 'dct_title',
    controlName: 'edval_corpusAsset_dct_title',
    label: 'titol',
    description: '',
    type: 'string',
    controlType: 'text',
    enumOptions: [],
    required: true,
    schema: {},
  } as DynamicField;

  const createTranslate = (templates: Record<string, string>): TranslateService =>
    ({
      instant: (key: string, params?: Record<string, unknown>) => {
        const template = templates[key] ?? key;
        return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(params?.[name] ?? ''));
      },
    }) as TranslateService;

  it('returns empty string when there are no errors', () => {
    const translate = createTranslate({});
    expect(resolveDynamicFieldError(field, null, translate)).toBe('');
    expect(resolveDynamicFieldError(field, undefined, translate)).toBe('');
  });

  it('keeps schema label and uses translated required template', () => {
    const translate = createTranslate({
      'dynamicForm.fieldRequired': '{{label}} és obligatori.',
    });
    const message = resolveDynamicFieldError(field, { required: true }, translate);
    expect(message).toBe('titol és obligatori.');
    expect(message).not.toContain('is required');
  });

  it('passes minlength parameter to the translation key', () => {
    const translate = createTranslate({
      'dynamicForm.fieldMinLength': '{{label}} ha de tenir almenys {{min}} caràcters.',
    });
    const message = resolveDynamicFieldError(field, { minlength: { requiredLength: 3 } }, translate);
    expect(message).toBe('titol ha de tenir almenys 3 caràcters.');
  });

  it('uses objectArrayRequired translation key', () => {
    const translate = createTranslate({
      'dynamicForm.fieldObjectArrayRequired': '{{label}} requereix camps obligatoris.',
    });
    const message = resolveDynamicFieldError(field, { objectArrayRequired: true }, translate);
    expect(message).toBe('titol requereix camps obligatoris.');
  });

  it('uses uri translation key', () => {
    const translate = createTranslate({
      'dynamicForm.fieldInvalidUri': '{{label}} ha de ser una URL vàlida.',
    });
    const message = resolveDynamicFieldError(field, { uri: true }, translate);
    expect(message).toBe('titol ha de ser una URL vàlida.');
  });

  it('uses objectArrayNestedErrors when nestedFieldErrors are present', () => {
    const translate = createTranslate({
      'dynamicForm.objectArrayNestedErrors': 'Corregiu els camps resaltats a {{label}}.',
    });
    const message = resolveDynamicFieldError(
      field,
      { nestedFieldErrors: [{ rowIndex: 0, path: ['ms:amount'], errors: { required: true } }] },
      translate,
    );
    expect(message).toBe('Corregiu els camps resaltats a titol.');
  });

  it('finds nested field errors by row index and path', () => {
    const controlErrors = {
      nestedFieldErrors: [
        { rowIndex: 0, path: ['ms:size', '0', 'ms:amount'], errors: { required: true } },
        { rowIndex: 1, path: ['ms:size', '0', 'ms:amount'], errors: { min: { min: 1 } } },
      ],
    };
    expect(findNestedFieldError(controlErrors, 0, ['ms:size', '0', 'ms:amount'])).toEqual({ required: true });
    expect(findNestedFieldError(controlErrors, 1, ['ms:size', '0', 'ms:amount'])).toEqual({ min: { min: 1 } });
    expect(findNestedFieldError(controlErrors, 0, ['ms:size', '0', 'ms:sizeUnit'])).toBeNull();
  });

  it('resolves object-array item scalar errors with the same templates', () => {
    const itemField = {
      kind: 'scalar',
      key: 'ms:amount',
      label: 'Amount',
      description: '',
      type: 'number',
      required: true,
      enumOptions: [],
      schema: {},
    } as DynamicObjectArrayItemScalarField;
    const translate = createTranslate({
      'dynamicForm.fieldRequired': '{{label}} és obligatori.',
    });
    expect(resolveObjectArrayItemFieldError(itemField, { required: true }, translate)).toBe('Amount és obligatori.');
  });
});
