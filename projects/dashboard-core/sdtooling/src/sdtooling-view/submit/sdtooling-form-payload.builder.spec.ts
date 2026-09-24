import { FormControl, FormGroup } from '@angular/forms';
import { buildSdToolingFormPayload } from './sdtooling-form-payload.builder';

describe('sdtooling-form-payload.builder', () => {
  it('builds recursive nested SD payload values from nestedPath metadata', () => {
    const sections = [
      {
        key: 'simpl:corpusAsset',
        label: 'Corpus asset',
        description: '',
        rdfType: 'ms:Corpus',
        fields: [
          {
            key: 'ms:unitCode',
            controlName: 'simpl_corpusAsset_ms_size_ms_details_ms_unitCode',
            label: 'Unit code',
            description: '',
            type: 'string',
            controlType: 'text',
            enumOptions: [],
            required: false,
            schema: {
              type: 'string',
              nestedPath: ['ms:size', 'ms:details', 'ms:unitCode'],
            },
          },
        ],
      },
    ] as Parameters<typeof buildSdToolingFormPayload>[0];
    const form = new FormGroup({
      simpl_corpusAsset_ms_size_ms_details_ms_unitCode: new FormControl('ms:mb'),
    });

    const payload = buildSdToolingFormPayload(sections, form);

    const sectionPayload = payload['simpl:corpusAsset'] as Record<string, unknown>;
    const size = sectionPayload['ms:size'] as Record<string, unknown>;
    const details = size['ms:details'] as Record<string, unknown>;
    expect(details['ms:unitCode']).toBe('ms:mb');
  });

  it('flattens top-level primitive section fields into root payload', () => {
    const sections = [
      {
        key: '__top_level__',
        label: 'Data offering',
        description: '',
        rdfType: 'edval:CorpusOffering',
        fields: [
          {
            key: 'edval:isPublicOffering',
            controlName: '__top_level___edval_isPublicOffering',
            label: 'Is public offering',
            description: '',
            type: 'boolean',
            controlType: 'checkbox',
            enumOptions: [],
            required: true,
            schema: {
              type: 'boolean',
              rdfType: 'xsd:boolean',
            },
          },
        ],
      },
    ] as Parameters<typeof buildSdToolingFormPayload>[0];
    const form = new FormGroup({
      __top_level___edval_isPublicOffering: new FormControl(true),
    });

    const payload = buildSdToolingFormPayload(sections, form);

    expect(payload['edval:isPublicOffering']).toBeTrue();
    expect(payload['__top_level__']).toBeUndefined();
  });

  it('builds nested object-array payload for distribution rows with ms:size entries', () => {
    const sections = [
      {
        key: 'edval:corpusAsset',
        label: 'Corpus asset',
        description: '',
        rdfType: 'edval:CorpusAsset',
        fields: [
          {
            key: 'dcat:distribution',
            controlName: 'edval_corpusAsset_dcat_distribution',
            label: 'Distribution',
            description: '',
            type: 'array',
            controlType: 'object-array',
            enumOptions: [],
            required: true,
            schema: { type: 'array', minItems: 1 },
            objectArrayFields: [
              {
                kind: 'scalar',
                key: 'dcat:byteSize',
                label: 'Byte size',
                description: '',
                type: 'integer',
                required: true,
                enumOptions: [],
                schema: { type: 'integer' },
              },
              {
                kind: 'object-array',
                key: 'ms:size',
                label: 'Size',
                description: '',
                required: true,
                schema: { type: 'array', minItems: 1 },
                itemFields: [
                  {
                    kind: 'scalar',
                    key: 'ms:amount',
                    label: 'Amount',
                    description: '',
                    type: 'number',
                    required: true,
                    enumOptions: [],
                    schema: { type: 'number' },
                  },
                  {
                    kind: 'scalar',
                    key: 'ms:sizeUnit',
                    label: 'Size unit',
                    description: '',
                    type: 'string',
                    required: true,
                    enumOptions: ['ms:words'],
                    schema: { type: 'string' },
                  },
                ],
              },
            ],
          },
        ],
      },
    ] as Parameters<typeof buildSdToolingFormPayload>[0];

    const form = new FormGroup({
      edval_corpusAsset_dcat_distribution: new FormControl([
        {
          'dcat:byteSize': 1,
          'ms:size': [{ 'ms:amount': 42, 'ms:sizeUnit': 'ms:words' }],
        },
      ]),
    });

    const payload = buildSdToolingFormPayload(sections, form);
    const corpusAsset = payload['edval:corpusAsset'] as Record<string, unknown>;
    const distributions = corpusAsset['dcat:distribution'] as Array<Record<string, unknown>>;
    expect(distributions.length).toBe(1);
    const sizes = distributions[0]['ms:size'] as Array<Record<string, unknown>>;
    expect(sizes.length).toBe(1);
    expect(sizes[0]['ms:amount']).toBe(42);
    expect(sizes[0]['ms:sizeUnit']).toBe('ms:words');
  });
});
