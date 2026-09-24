import { buildDynamicSectionsFromSchema, createDynamicFormGroup } from './dynamic-schema-form.factory';

describe('dynamic schema mapping', () => {
  it('maps boolean fields to checkbox controls', () => {
    const schemaContent = {
      root: {
        'simpl:OfferingShape': {
          type: 'object',
          properties: {
            'simpl:isActive': {
              type: 'boolean',
              description: 'Whether offering is active',
            },
          },
          required: ['simpl:isActive'],
        },
      },
    };

    const sections = buildDynamicSectionsFromSchema(schemaContent);
    expect(sections.length).toBe(1);
    expect(sections[0].fields.length).toBe(1);
    expect(sections[0].fields[0].type).toBe('boolean');
    expect(sections[0].fields[0].controlType).toBe('checkbox');

    const formGroup = createDynamicFormGroup(sections);
    const control = formGroup.get(sections[0].fields[0].controlName);
    expect(control?.value).toBeFalse();
    expect(control?.valid).toBeTrue();
  });

  it('uses the top-level primitive field label when there is only one such field', () => {
    const schemaContent = {
      root: {
        'gax-validation:CorpusOfferingShape': {
          type: 'object',
          name: 'Data offering',
          rdfType: 'edval:CorpusOffering',
          properties: {
            'edval:corpusAsset': {
              type: 'object',
              properties: {
                'dct:title': {
                  type: 'string',
                },
              },
            },
            'edval:isPublicOffering': {
              type: 'boolean',
              description: 'Whether this offering is public.',
            },
          },
          required: ['edval:isPublicOffering'],
        },
      },
    };

    const sections = buildDynamicSectionsFromSchema(schemaContent);
    expect(sections.length).toBe(2);

    const metadataSection = sections.find(section => section.key === '__top_level__');
    expect(metadataSection).toBeDefined();
    expect(metadataSection?.label).toBe('Is public offering');
    expect(metadataSection?.rdfType).toBe('edval:CorpusOffering');

    const publicOfferingField = metadataSection?.fields.find(field => field.key === 'edval:isPublicOffering');
    expect(publicOfferingField).toBeDefined();
    expect(publicOfferingField?.type).toBe('boolean');
    expect(publicOfferingField?.controlType).toBe('checkbox');
    expect(publicOfferingField?.required).toBeTrue();
  });

  it('prefers title/name labels over humanized keys', () => {
    const schemaContent = {
      root: {
        'simpl:OfferingShape': {
          type: 'object',
          title: 'Offering details',
          properties: {
            'simpl:displayName': {
              type: 'string',
              name: 'Display name',
            },
            'simpl:internalCode': {
              type: 'string',
            },
          },
        },
      },
    };

    const sections = buildDynamicSectionsFromSchema(schemaContent);
    expect(sections.length).toBe(1);
    expect(sections[0].label).toBe('Offering details');
    expect(sections[0].fields.find(field => field.key === 'simpl:displayName')?.label).toBe('Display name');
    expect(sections[0].fields.find(field => field.key === 'simpl:internalCode')?.label).toBe('Internal Code');
  });

  it('maps oneOf const values to select options', () => {
    const schemaContent = {
      root: {
        'simpl:OfferingShape': {
          type: 'object',
          properties: {
            'simpl:corpusType': {
              type: 'string',
              oneOf: [
                { const: 'ms:corpus1', title: 'Corpus 1' },
                { const: 'ms:corpus2', title: 'Corpus 2' },
              ],
            },
          },
        },
      },
    };

    const sections = buildDynamicSectionsFromSchema(schemaContent);
    expect(sections.length).toBe(1);
    expect(sections[0].fields.length).toBe(1);
    expect(sections[0].fields[0].controlType).toBe('select');
    expect(sections[0].fields[0].enumOptions).toEqual(['ms:corpus1', 'ms:corpus2']);
    expect(sections[0].fields[0].enumOptionLabels).toEqual({
      'ms:corpus1': 'Corpus 1',
      'ms:corpus2': 'Corpus 2',
    });
  });

  it('maps repeatable enum fields to multi-select controls', () => {
    const schemaContent = {
      root: {
        'ms:CorpusShape': {
          type: 'object',
          properties: {
            'ms:mediaType': {
              type: 'array',
              minItems: 1,
              items: {
                enum: ['ms:audio', 'ms:image', 'ms:text'],
              },
            },
          },
        },
      },
    };

    const sections = buildDynamicSectionsFromSchema(schemaContent);
    const mediaTypeField = sections[0].fields.find(field => field.key === 'ms:mediaType');

    expect(mediaTypeField?.controlType).toBe('select-multiple');
  });

  it('maps integer fields to number controls', () => {
    const schemaContent = {
      root: {
        'dcat:DistributionShape': {
          type: 'object',
          properties: {
            'dcat:distribution': {
              type: 'object',
              properties: {
                'dcat:byteSize': {
                  type: 'integer',
                  description: 'Size in bytes',
                },
              },
              required: ['dcat:byteSize'],
            },
          },
        },
      },
    };

    const sections = buildDynamicSectionsFromSchema(schemaContent);
    expect(sections.length).toBe(1);
    expect(sections[0].key).toBe('dcat:distribution');

    const byteSizeField = sections[0].fields.find(field => field.key === 'dcat:byteSize');
    expect(byteSizeField).toBeDefined();
    expect(byteSizeField?.type).toBe('integer');
    expect(byteSizeField?.controlType).toBe('number');
    expect(byteSizeField?.required).toBeTrue();

    const formGroup = createDynamicFormGroup(sections);
    const control = formGroup.get(byteSizeField?.controlName ?? '');
    expect(control).toBeTruthy();
    expect(control?.valid).toBeFalse();
  });

  it('flattens nested object properties into the same section', () => {
    const schemaContent = {
      root: {
        'ms:CorpusShape': {
          type: 'object',
          properties: {
            'simpl:corpusAsset': {
              type: 'object',
              properties: {
                'ms:lrType': {
                  type: 'string',
                  enum: ['ms:corpus1'],
                },
                'ms:language': {
                  type: 'object',
                  properties: {
                    'ms:languageCode': {
                      type: 'string',
                      enum: ['ms:spa', 'ms:eng'],
                    },
                    'ms:region': {
                      type: 'string',
                      enum: ['ms:ES', 'ms:MX'],
                    },
                  },
                  required: ['ms:languageCode'],
                  rdfType: 'ms:Language',
                },
              },
              required: ['ms:lrType'],
            },
          },
        },
      },
    };

    const sections = buildDynamicSectionsFromSchema(schemaContent);
    expect(sections.length).toBe(1);

    const section = sections[0];
    expect(section.key).toBe('simpl:corpusAsset');

    const fieldKeys = section.fields.map(field => field.key);
    expect(fieldKeys).toContain('ms:lrType');
    expect(fieldKeys).toContain('ms:languageCode');
    expect(fieldKeys).toContain('ms:region');

    const languageCodeField = section.fields.find(field => field.key === 'ms:languageCode');
    const regionField = section.fields.find(field => field.key === 'ms:region');

    expect(languageCodeField?.enumOptions).toEqual(['ms:spa', 'ms:eng']);
    expect(regionField?.enumOptions).toEqual(['ms:ES', 'ms:MX']);

    // Nested path metadata is attached for nested fields and not for flat ones.
    const lrTypeField = section.fields.find(field => field.key === 'ms:lrType');
    expect((lrTypeField?.schema as { nestedPath?: unknown } | undefined)?.nestedPath).toBeUndefined();
    expect((languageCodeField?.schema as { nestedPath?: unknown } | undefined)?.nestedPath).toEqual([
      'ms:language',
      'ms:languageCode',
    ]);
  });

  it('recursively flattens deeper nested object properties', () => {
    const schemaContent = {
      root: {
        'ms:CorpusShape': {
          type: 'object',
          properties: {
            'simpl:corpusAsset': {
              type: 'object',
              properties: {
                'ms:size': {
                  type: 'object',
                  properties: {
                    'ms:details': {
                      type: 'object',
                      properties: {
                        'ms:unitCode': {
                          type: 'string',
                          enum: ['ms:mb', 'ms:gb'],
                        },
                      },
                      required: ['ms:unitCode'],
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const sections = buildDynamicSectionsFromSchema(schemaContent);
    expect(sections.length).toBe(1);
    const unitCodeField = sections[0].fields.find(field => field.key === 'ms:unitCode');
    expect(unitCodeField).toBeDefined();
    expect(unitCodeField?.enumOptions).toEqual(['ms:mb', 'ms:gb']);
    expect((unitCodeField?.schema as { nestedPath?: unknown } | undefined)?.nestedPath).toEqual([
      'ms:size',
      'ms:details',
      'ms:unitCode',
    ]);
  });

  it('maps array of objects into object-array controls', () => {
    const schemaContent = {
      root: {
        'dcat:DistributionShape': {
          type: 'object',
          properties: {
            'dcat:distribution': {
              type: 'object',
              properties: {
                'ms:size': {
                  type: 'array',
                  minItems: 1,
                  items: {
                    type: 'object',
                    properties: {
                      'ms:amount': {
                        type: 'number',
                        description: 'Amount value',
                      },
                      'ms:sizeUnit': {
                        type: 'string',
                        enum: ['ms:words', 'ms:tokens'],
                      },
                    },
                    required: ['ms:amount', 'ms:sizeUnit'],
                  },
                },
              },
            },
          },
        },
      },
    };

    const sections = buildDynamicSectionsFromSchema(schemaContent);
    expect(sections.length).toBe(1);
    const sizeField = sections[0].fields.find(field => field.key === 'ms:size');
    expect(sizeField).toBeDefined();
    expect(sizeField?.controlType).toBe('object-array');
    expect(sizeField?.type).toBe('array');
    expect(sizeField?.objectArrayFields?.map(field => field.key)).toEqual(['ms:amount', 'ms:sizeUnit']);
    expect(sizeField?.objectArrayFields?.every(field => field.kind === 'scalar')).toBeTrue();
  });

  it('maps repeatable distribution array with nested ms:size object-array items', () => {
    const schemaContent = {
      root: {
        'edval:CorpusAssetShape': {
          type: 'object',
          properties: {
            'edval:corpusAsset': {
              type: 'object',
              properties: {
                'dcat:distribution': {
                  type: 'array',
                  minItems: 1,
                  items: {
                    type: 'object',
                    rdfType: 'dcat:Distribution',
                    properties: {
                      'dcat:byteSize': {
                        type: 'integer',
                        minimum: 1,
                      },
                      'ms:size': {
                        type: 'array',
                        minItems: 1,
                        items: {
                          type: 'object',
                          rdfType: 'ms:Size',
                          properties: {
                            'ms:amount': {
                              type: 'number',
                            },
                            'ms:sizeUnit': {
                              type: 'string',
                              enum: ['ms:words', 'ms:tokens'],
                            },
                          },
                          required: ['ms:amount', 'ms:sizeUnit'],
                        },
                      },
                    },
                    required: ['dcat:byteSize', 'ms:size'],
                  },
                },
              },
            },
          },
        },
      },
    };

    const sections = buildDynamicSectionsFromSchema(schemaContent);
    expect(sections.length).toBe(1);
    expect(sections[0].key).toBe('edval:corpusAsset');

    const distributionField = sections[0].fields.find(field => field.key === 'dcat:distribution');
    expect(distributionField?.controlType).toBe('object-array');
    expect(distributionField?.objectArrayFields?.map(field => field.key)).toEqual(['dcat:byteSize', 'ms:size']);

    const sizeField = distributionField?.objectArrayFields?.find(field => field.key === 'ms:size');
    expect(sizeField?.kind).toBe('object-array');
    if (sizeField?.kind !== 'object-array') {
      return;
    }
    expect(sizeField.itemFields.map(field => field.key)).toEqual(['ms:amount', 'ms:sizeUnit']);
    expect(sizeField.itemFields.every(field => field.kind === 'scalar')).toBeTrue();
  });

  it('initializes required object-array controls with one item', () => {
    const schemaContent = {
      root: {
        'dcat:DistributionShape': {
          type: 'object',
          properties: {
            'dcat:distribution': {
              type: 'object',
              properties: {
                'ms:size': {
                  type: 'array',
                  minItems: 1,
                  items: {
                    type: 'object',
                    properties: {
                      'ms:amount': {
                        type: 'number',
                      },
                      'ms:sizeUnit': {
                        type: 'string',
                      },
                    },
                    required: ['ms:amount', 'ms:sizeUnit'],
                  },
                },
              },
            },
          },
        },
      },
    };

    const sections = buildDynamicSectionsFromSchema(schemaContent);
    const formGroup = createDynamicFormGroup(sections);
    const sizeField = sections[0].fields.find(field => field.key === 'ms:size');
    const controlValue = formGroup.get(sizeField?.controlName ?? '')?.value as Array<Record<string, unknown>>;
    expect(Array.isArray(controlValue)).toBeTrue();
    expect(controlValue.length).toBe(1);
    expect(controlValue[0]['ms:amount']).toBe('');
    expect(controlValue[0]['ms:sizeUnit']).toBe('');
  });

  it('validates object-array minItems based on object entries (not token parsing)', () => {
    const schemaContent = {
      root: {
        'dcat:DistributionShape': {
          type: 'object',
          properties: {
            'dcat:distribution': {
              type: 'object',
              properties: {
                'ms:size': {
                  type: 'array',
                  minItems: 1,
                  items: {
                    type: 'object',
                    properties: {
                      'ms:amount': {
                        type: 'number',
                      },
                      'ms:sizeUnit': {
                        type: 'string',
                      },
                    },
                    required: ['ms:amount', 'ms:sizeUnit'],
                  },
                },
              },
            },
          },
        },
      },
    };

    const sections = buildDynamicSectionsFromSchema(schemaContent);
    const formGroup = createDynamicFormGroup(sections);
    const sizeField = sections[0].fields.find(field => field.key === 'ms:size');
    const control = formGroup.get(sizeField?.controlName ?? '');
    expect(control).toBeTruthy();

    control?.setValue([]);
    control?.markAsTouched();
    control?.updateValueAndValidity();
    expect(control?.errors?.['minItems']).toBeDefined();

    control?.setValue([{ 'ms:amount': 5, 'ms:sizeUnit': 'ms:words' }]);
    control?.updateValueAndValidity();
    expect(control?.errors?.['minItems']).toBeUndefined();
  });

  it('keeps primitive token-array minItems validation unchanged', () => {
    const schemaContent = {
      root: {
        'simpl:OfferingShape': {
          type: 'object',
          properties: {
            'simpl:metadata': {
              type: 'object',
              properties: {
                'dcat:keyword': {
                  type: 'array',
                  minItems: 2,
                  items: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
      },
    };

    const sections = buildDynamicSectionsFromSchema(schemaContent);
    const formGroup = createDynamicFormGroup(sections);
    const keywordField = sections[0].fields.find(field => field.key === 'dcat:keyword');
    const control = formGroup.get(keywordField?.controlName ?? '');
    expect(control).toBeTruthy();

    control?.setValue('one');
    control?.updateValueAndValidity();
    expect(control?.errors?.['minItems']).toBeDefined();

    control?.setValue('one, two');
    control?.updateValueAndValidity();
    expect(control?.errors?.['minItems']).toBeUndefined();
  });

  it('builds subsections from propertyGroups with ungrouped fields last', () => {
    const schemaContent = {
      root: {
        'gax-validation:CorpusOfferingShape': {
          type: 'object',
          properties: {
            'edval:corpusAsset': {
              type: 'object',
              propertyGroups: {
                'gax-validation:BasicGroup': { label: 'Información básica', order: 1 },
                'gax-validation:OtherGroup': { label: 'Identificación', order: 2 },
              },
              properties: {
                'dct:title': {
                  type: 'string',
                  group: 'gax-validation:BasicGroup',
                  order: 2,
                  name: 'título',
                },
                'dct:description': {
                  type: 'string',
                  order: 1,
                },
                'skos:notation': {
                  type: 'string',
                  group: 'gax-validation:OtherGroup',
                  order: 1,
                },
              },
            },
          },
        },
      },
    };

    const sections = buildDynamicSectionsFromSchema(schemaContent);
    const corpusSection = sections.find(section => section.key === 'edval:corpusAsset');
    expect(corpusSection?.subsections?.length).toBe(3);
    expect(corpusSection?.subsections?.[0].label).toBe('Información básica');
    expect(corpusSection?.subsections?.[1].label).toBe('Identificación');
    expect(corpusSection?.subsections?.[2].key).toBe('__ungrouped__');
    expect(corpusSection?.subsections?.[0].fields.map(field => field.key)).toEqual(['dct:title']);
    expect(corpusSection?.subsections?.[2].fields.map(field => field.key)).toEqual(['dct:description']);
    expect(corpusSection?.fields.map(field => field.key)).toEqual(['dct:title', 'skos:notation', 'dct:description']);
  });

  it('inherits sh:group from parent sh:node property to nested fields', () => {
    const schemaContent = {
      root: {
        'gax:TestShape': {
          type: 'object',
          properties: {
            'gax:asset': {
              type: 'object',
              propertyGroups: {
                'gax:OtherGroup': { label: 'Identificación', order: 1 },
              },
              properties: {
                'adms:identifier': {
                  type: 'object',
                  group: 'gax:OtherGroup',
                  properties: {
                    'skos:notation': { type: 'string', name: 'notación' },
                  },
                },
              },
            },
          },
        },
      },
    };

    const sections = buildDynamicSectionsFromSchema(schemaContent);
    const assetSection = sections.find(section => section.key === 'gax:asset');
    const notationField = assetSection?.fields.find(field => field.key === 'skos:notation');
    expect(notationField?.groupKey).toBe('gax:OtherGroup');
    expect(assetSection?.subsections?.[0].label).toBe('Identificación');
  });

  it('builds object-array item subsections from items.propertyGroups', () => {
    const schemaContent = {
      root: {
        'gax:Shape': {
          type: 'object',
          properties: {
            'ms:language': {
              type: 'array',
              items: {
                type: 'object',
                propertyGroups: {
                  'gax:LangGroup': { label: 'Idioma', order: 1 },
                },
                properties: {
                  'ms:languageCode': {
                    type: 'string',
                    group: 'gax:LangGroup',
                    order: 1,
                  },
                },
              },
            },
          },
        },
      },
    };

    const sections = buildDynamicSectionsFromSchema(schemaContent);
    const languageField = sections[0].fields.find(field => field.key === 'ms:language');
    expect(languageField?.objectArrayItemSubsections?.[0].label).toBe('Idioma');
    expect(languageField?.objectArrayItemSubsections?.[0].fields[0].key).toBe('ms:languageCode');
  });

  it('leaves subsections undefined when propertyGroups are absent', () => {
    const schemaContent = {
      root: {
        'simpl:OfferingShape': {
          type: 'object',
          properties: {
            'simpl:displayName': { type: 'string' },
          },
        },
      },
    };

    const sections = buildDynamicSectionsFromSchema(schemaContent);
    expect(sections[0].subsections).toBeUndefined();
  });
});

describe('dynamic schema SPARQL constraints', () => {
  const buildSchemaContent = () => ({
    root: {
      'gax:CorpusShape': {
        type: 'object',
        properties: {
          'ms:corpus': {
            type: 'object',
            properties: {
              'ms:lingualityType': {
                type: 'string',
                enum: ['ms:monolingual', 'ms:multilingual'],
              },
              'ms:language': {
                type: 'array',
              },
              'ms:personalDataIncluded': {
                type: 'string',
                enum: ['ms:yesP', 'ms:noP', 'ms:unknownP'],
              },
              'ms:sensitiveDataIncluded': {
                type: 'string',
                enum: ['ms:yesS', 'ms:noS'],
              },
              'dpv:hasTechnicalOrganisationalMeasure': {
                type: 'string',
              },
              'ms:dataProtectionPrincipleApplied': {
                type: 'array',
              },
            },
          },
        },
        sparqlConstraints: [
          {
            message: "Only one 'ms:language' is allowed when 'ms:lingualityType' is 'monolingual'.",
            select: 'SELECT',
          },
          {
            message: "'ms:sensitiveDataIncluded' is required because 'ms:personalDataIncluded' is 'yesP'.",
            select: 'SELECT',
          },
          {
            message: "'ms:sensitiveDataIncluded' cannot be 'yesS' because 'ms:personalDataIncluded' is 'noP'.",
            select: 'SELECT',
          },
          {
            message:
              "'dpv:hasTechnicalOrganisationalMeasure' is not applicable because 'ms:personalDataIncluded' is 'noP'.",
            select: 'SELECT',
          },
          {
            message: "'ms:dataProtectionPrincipleApplied' is required because 'ms:personalDataIncluded' is 'yesP'.",
            select: 'SELECT',
          },
          {
            message:
              "'ms:dataProtectionPrincipleApplied' is not applicable because 'ms:personalDataIncluded' is 'unknownP'.",
            select: 'SELECT',
          },
        ],
      },
    },
  });

  const controlName = (sections: ReturnType<typeof buildDynamicSectionsFromSchema>, fieldKey: string): string => {
    const field = sections.flatMap(section => section.fields).find(candidate => candidate.key === fieldKey);
    if (!field) {
      throw new Error(`Missing field ${fieldKey}`);
    }
    return field.controlName;
  };

  it('auto-corrects values that become not applicable or exceed known SPARQL limits', () => {
    const sections = buildDynamicSectionsFromSchema(buildSchemaContent());
    const formGroup = createDynamicFormGroup(sections);

    const lingualityType = controlName(sections, 'ms:lingualityType');
    const language = controlName(sections, 'ms:language');
    const personalData = controlName(sections, 'ms:personalDataIncluded');
    const sensitiveData = controlName(sections, 'ms:sensitiveDataIncluded');
    const technicalMeasure = controlName(sections, 'dpv:hasTechnicalOrganisationalMeasure');
    const dataProtection = controlName(sections, 'ms:dataProtectionPrincipleApplied');

    formGroup.get(language)?.setValue('es,en');
    formGroup.get(lingualityType)?.setValue('ms:monolingual');
    expect(formGroup.get(language)?.value).toBe('es');

    formGroup.get(sensitiveData)?.setValue('ms:yesS');
    formGroup.get(technicalMeasure)?.setValue('encryption');
    formGroup.get(dataProtection)?.setValue('ms:minimisation');
    formGroup.get(personalData)?.setValue('ms:noP');

    expect(formGroup.get(sensitiveData)?.value).toBe('');
    expect(formGroup.get(technicalMeasure)?.value).toBe('');

    formGroup.get(dataProtection)?.setValue('ms:minimisation');
    formGroup.get(personalData)?.setValue('ms:unknownP');
    expect(formGroup.get(dataProtection)?.value).toBe('');
  });

  it('keeps required conditional SPARQL constraints as field errors', () => {
    const sections = buildDynamicSectionsFromSchema(buildSchemaContent());
    const formGroup = createDynamicFormGroup(sections);

    const personalData = controlName(sections, 'ms:personalDataIncluded');
    const sensitiveData = controlName(sections, 'ms:sensitiveDataIncluded');
    const dataProtection = controlName(sections, 'ms:dataProtectionPrincipleApplied');

    formGroup.get(personalData)?.setValue('ms:yesP');

    expect(formGroup.get(sensitiveData)?.errors?.['sparqlConstraint']).toEqual({
      message: "'ms:sensitiveDataIncluded' is required because 'ms:personalDataIncluded' is 'yesP'.",
    });
    expect(formGroup.get(dataProtection)?.errors?.['sparqlConstraint']).toEqual({
      message: "'ms:dataProtectionPrincipleApplied' is required because 'ms:personalDataIncluded' is 'yesP'.",
    });
    expect(formGroup.valid).toBeFalse();
  });
});
