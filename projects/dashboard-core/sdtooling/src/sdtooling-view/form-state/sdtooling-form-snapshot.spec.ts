import { FormControl, FormGroup } from '@angular/forms';
import type { DynamicField, DynamicSection } from '@eclipse-edc/dashboard-core/shacl-schema';
import { restoreFormValues } from './sdtooling-form-snapshot';

const field = (controlName: string, overrides: Partial<DynamicField> = {}): DynamicField =>
  ({
    key: controlName,
    controlName,
    label: controlName,
    description: '',
    type: 'string',
    controlType: 'text',
    enumOptions: [],
    required: false,
    schema: {},
    ...overrides,
  }) as DynamicField;

describe('restoreFormValues', () => {
  const sections: DynamicSection[] = [
    {
      key: 'corpus',
      label: 'Corpus',
      fields: [
        field('title'),
        field('mediaType', { type: 'array', controlType: 'select-multiple', enumOptions: ['ms:text', 'ms:audio'] }),
        field('lingualityType', { controlType: 'select', enumOptions: ['ms:monolingual', 'ms:bilingual'] }),
        field('keywords', { type: 'array', controlType: 'array' }),
        field('readonlyField'),
      ],
    } as DynamicSection,
  ];

  const buildForm = (): FormGroup =>
    new FormGroup({
      title: new FormControl(''),
      mediaType: new FormControl<string[]>([]),
      lingualityType: new FormControl(''),
      keywords: new FormControl(''),
      readonlyField: new FormControl({ value: 'const', disabled: true }),
    });

  it('restores matching controls and marks them dirty', () => {
    const form = buildForm();

    restoreFormValues(form, sections, {
      title: 'Corpus jurídico',
      mediaType: ['ms:text'],
      lingualityType: 'ms:monolingual',
      keywords: 'derecho, legal',
    });

    expect(form.getRawValue()).toEqual(
      jasmine.objectContaining({
        title: 'Corpus jurídico',
        mediaType: ['ms:text'],
        lingualityType: 'ms:monolingual',
        keywords: 'derecho, legal',
      }),
    );
    expect(form.get('title')?.dirty).toBeTrue();
  });

  it('skips empty values, unknown fields, disabled controls and options missing from the new schema', () => {
    const form = buildForm();

    restoreFormValues(form, sections, {
      title: '   ',
      mediaType: ['ms:text', 'ms:hologram'],
      lingualityType: 'ms:unknown',
      readonlyField: 'changed',
      removedField: 'value',
    });

    expect(form.getRawValue()).toEqual({
      title: '',
      mediaType: [],
      lingualityType: '',
      keywords: '',
      readonlyField: 'const',
    });
    expect(form.get('title')?.dirty).toBeFalse();
  });
});
