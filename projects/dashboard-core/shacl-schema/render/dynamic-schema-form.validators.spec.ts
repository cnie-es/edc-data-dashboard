import { FormControl } from '@angular/forms';
import type { DynamicField, DynamicObjectArrayItemField } from './dynamic-schema-form.types';
import { createFieldValidators, validateObjectArrayRow } from './dynamic-schema-form.validators';

describe('dynamic-schema-form.validators nested object-array', () => {
  const amountField: DynamicObjectArrayItemField = {
    kind: 'scalar',
    key: 'ms:amount',
    label: 'Amount',
    description: '',
    type: 'number',
    required: true,
    enumOptions: [],
    schema: { minimum: 1 },
  };

  const sizeUnitField: DynamicObjectArrayItemField = {
    kind: 'scalar',
    key: 'ms:sizeUnit',
    label: 'Size unit',
    description: '',
    type: 'string',
    required: true,
    enumOptions: ['ms:token'],
    schema: {},
  };

  const sizeArrayField: DynamicObjectArrayItemField = {
    kind: 'object-array',
    key: 'ms:size',
    label: 'Size',
    description: '',
    required: true,
    schema: { minItems: 1 },
    itemFields: [amountField, sizeUnitField],
  };

  const distributionFields: DynamicObjectArrayItemField[] = [
    {
      kind: 'scalar',
      key: 'dcat:byteSize',
      label: 'Byte size',
      description: '',
      type: 'integer',
      required: true,
      enumOptions: [],
      schema: { minimum: 1 },
    },
    sizeArrayField,
  ];

  it('reports required scalar errors with row index and path', () => {
    const errors = validateObjectArrayRow(distributionFields, { 'dcat:byteSize': 10, 'ms:size': [] }, 0);
    expect(errors).toEqual(
      jasmine.arrayContaining([
        jasmine.objectContaining({
          rowIndex: 0,
          path: ['ms:size'],
          errors: jasmine.objectContaining({ minItems: jasmine.objectContaining({ min: 1 }) }),
        }),
      ]),
    );
  });

  it('reports nested ms:size scalar errors with full path', () => {
    const errors = validateObjectArrayRow(
      distributionFields,
      {
        'dcat:byteSize': 10,
        'ms:size': [{ 'ms:amount': 0, 'ms:sizeUnit': 'ms:token' }],
      },
      0,
    );
    expect(errors).toEqual(
      jasmine.arrayContaining([
        jasmine.objectContaining({
          rowIndex: 0,
          path: ['ms:size', '0', 'ms:amount'],
          errors: jasmine.objectContaining({ min: jasmine.objectContaining({ min: 1 }) }),
        }),
      ]),
    );
  });

  it('reports uri validation errors for nested scalar fields', () => {
    const uriField: DynamicObjectArrayItemField = {
      kind: 'scalar',
      key: 'cc:legalcode',
      label: 'Legal code',
      description: '',
      type: 'string',
      required: false,
      enumOptions: [],
      schema: { format: 'uri' },
    };
    const errors = validateObjectArrayRow([uriField], { 'cc:legalcode': 'not-a-uri' }, 0);
    expect(errors).toEqual([
      jasmine.objectContaining({
        rowIndex: 0,
        path: ['cc:legalcode'],
        errors: { uri: true },
      }),
    ]);
  });

  it('stores nestedFieldErrors on the parent object-array control', () => {
    const field: DynamicField = {
      key: 'dcat:distribution',
      controlName: 'edval_corpusAsset_dcat_distribution',
      label: 'Distribution',
      description: '',
      type: 'array',
      controlType: 'object-array',
      enumOptions: [],
      required: true,
      schema: { type: 'array', minItems: 1 },
      objectArrayFields: distributionFields,
    };

    const control = new FormControl([{ 'dcat:byteSize': 10, 'ms:size': [{ 'ms:amount': '', 'ms:sizeUnit': '' }] }]);
    control.setValidators(createFieldValidators(field));
    control.updateValueAndValidity();

    expect(control.errors?.['nestedFieldErrors']).toEqual(
      jasmine.arrayContaining([
        jasmine.objectContaining({
          rowIndex: 0,
          path: ['ms:size', '0', 'ms:amount'],
          errors: { required: true },
        }),
        jasmine.objectContaining({
          rowIndex: 0,
          path: ['ms:size', '0', 'ms:sizeUnit'],
          errors: { required: true },
        }),
      ]),
    );
  });

  it('accepts non-empty arrays for required select-multiple controls', () => {
    const field: DynamicField = {
      key: 'ms:keywords',
      controlName: 'simpl_generalServiceProperties_ms_keywords',
      label: 'Keywords',
      description: '',
      type: 'array',
      controlType: 'select-multiple',
      enumOptions: ['one', 'two'],
      required: true,
      schema: { type: 'array', minItems: 1 },
    };

    const control = new FormControl<string[]>([]);
    control.setValidators(createFieldValidators(field));
    control.setValue(['one']);
    control.updateValueAndValidity();

    expect(control.valid).toBeTrue();
    expect(control.errors).toBeNull();
  });
});
