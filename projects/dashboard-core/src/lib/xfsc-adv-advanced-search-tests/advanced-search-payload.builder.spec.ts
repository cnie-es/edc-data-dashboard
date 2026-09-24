import { FormControl, FormGroup } from '@angular/forms';
import type { DynamicField, DynamicSection } from '@eclipse-edc/dashboard-core/shacl-schema';
import { buildAdvancedSearchPayload } from '@eclipse-edc/dashboard-core/xfsc-advSearch';

describe('buildAdvancedSearchPayload', () => {
  it('nests values for fields with nestedPath metadata', () => {
    const languageCodeField: DynamicField = {
      key: 'ms:languageCode',
      controlName: 'simpl:corpusAsset_ms:language_ms:languageCode',
      label: 'Language code',
      description: '',
      type: 'string',
      controlType: 'text',
      enumOptions: [],
      required: false,
      schema: {
        type: 'string',
        nestedPath: ['ms:language', 'ms:languageCode'],
      },
    };

    const lrTypeField: DynamicField = {
      key: 'ms:lrType',
      controlName: 'simpl:corpusAsset_ms:lrType',
      label: 'LR type',
      description: '',
      type: 'string',
      controlType: 'text',
      enumOptions: [],
      required: false,
      schema: {
        type: 'string',
      },
    };

    const section: DynamicSection = {
      key: 'simpl:corpusAsset',
      label: 'Corpus asset',
      description: '',
      rdfType: 'ms:Corpus',
      fields: [lrTypeField, languageCodeField],
    };

    const form = new FormGroup({
      [lrTypeField.controlName]: new FormControl('ms:corpus1'),
      [languageCodeField.controlName]: new FormControl('ms:spa'),
    });

    const { payload } = buildAdvancedSearchPayload([section], form);

    expect(Object.keys(payload)).toEqual(['ms:Corpus']);
    const corpusPayload = payload['ms:Corpus'] as Record<string, unknown>;
    expect(corpusPayload['@type']).toBe('ms:corpus');
    expect(corpusPayload['lrType']).toBe('ms:corpus1');

    const language = corpusPayload['language'] as Record<string, unknown>;
    expect(language).toBeDefined();
    expect(language['languageCode']).toBe('ms:spa');
  });

  it('writes values recursively for nestedPath with more than two segments', () => {
    const deepNestedField: DynamicField = {
      key: 'ms:unitCode',
      controlName: 'simpl:corpusAsset_ms:size_ms:details_ms:unitCode',
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
    };

    const section: DynamicSection = {
      key: 'simpl:corpusAsset',
      label: 'Corpus asset',
      description: '',
      rdfType: 'ms:Corpus',
      fields: [deepNestedField],
    };

    const form = new FormGroup({
      [deepNestedField.controlName]: new FormControl('ms:mb'),
    });

    const { payload } = buildAdvancedSearchPayload([section], form);
    const corpusPayload = payload['ms:Corpus'] as Record<string, unknown>;
    const size = corpusPayload['size'] as Record<string, unknown>;
    const details = size['details'] as Record<string, unknown>;
    expect(details['unitCode']).toBe('ms:mb');
  });

  it('normalizes integer fields as numbers in payload', () => {
    const byteSizeField: DynamicField = {
      key: 'dcat:byteSize',
      controlName: 'dcat:distribution_dcat:byteSize',
      label: 'Byte size',
      description: '',
      type: 'integer',
      controlType: 'number',
      enumOptions: [],
      required: false,
      schema: {
        type: 'integer',
      },
    };

    const section: DynamicSection = {
      key: 'dcat:distribution',
      label: 'Distribution',
      description: '',
      rdfType: 'dcat:Distribution',
      fields: [byteSizeField],
    };

    const form = new FormGroup({
      [byteSizeField.controlName]: new FormControl('1048576'),
    });

    const { payload } = buildAdvancedSearchPayload([section], form);
    const distributionPayload = payload['dcat:Distribution'] as Record<string, unknown>;
    expect(distributionPayload['byteSize']).toBe(1048576);
  });

  it('writes top-level boolean fields using root offering section identity', () => {
    const isPublicOfferingField: DynamicField = {
      key: 'edval:isPublicOffering',
      controlName: 'edval_CorpusOffering_edval_isPublicOffering',
      label: 'Is public offering',
      description: '',
      type: 'boolean',
      controlType: 'checkbox',
      enumOptions: [],
      required: true,
      schema: {
        type: 'boolean',
      },
    };

    const section: DynamicSection = {
      key: 'edval:CorpusOffering',
      label: 'Corpus Offering',
      description: '',
      rdfType: 'edval:CorpusOffering',
      fields: [isPublicOfferingField],
    };

    const form = new FormGroup({
      [isPublicOfferingField.controlName]: new FormControl(true),
    });

    const { payload } = buildAdvancedSearchPayload([section], form);
    const offeringPayload = payload['edval:CorpusOffering'] as Record<string, unknown>;
    expect(offeringPayload['@type']).toBe('edval:corpusOffering');
    expect(offeringPayload['isPublicOffering']).toBeTrue();
  });
});
