import { formatDataToJsonLd, type ExtendedJsonSchema4 } from './formatDataToJsonLd';

describe('formatDataToJsonLd', () => {
  it('includes simpl:dataProperties and simpl:assetProperties in the JSON-LD output', async () => {
    const schema: ExtendedJsonSchema4 = {
      rdfType: 'simpl:DataOffering',
      type: 'object',
      properties: {
        'simpl:dataProperties': {
          rdfType: 'simpl:DataProperties',
          type: 'object',
          properties: {
            'simpl:format': {
              rdfType: 'xsd:string',
              type: 'string',
            },
          },
        },
        'simpl:assetProperties': {
          rdfType: 'simpl:AssetProperties',
          type: 'object',
          properties: {
            'simpl:providerDataAddress': {
              rdfType: 'xsd:string',
              type: 'string',
            },
          },
        },
      },
    };

    const context = {
      simpl: 'http://w3id.org/gaia-x/simpl#',
      xsd: 'http://www.w3.org/2001/XMLSchema#',
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    };

    const data = {
      'simpl:dataProperties': {
        'simpl:format': 'csv',
      },
      'simpl:assetProperties': {
        'simpl:providerDataAddress': 'https://provider.example/data',
      },
    } as Record<string, unknown>;

    const result = await formatDataToJsonLd(data, schema, context);

    expect(result['simpl:dataProperties']).toBeDefined();
    expect((result['simpl:dataProperties'] as Record<string, unknown>)['simpl:format']).toBeDefined();

    expect(result['simpl:assetProperties']).toBeDefined();
    expect((result['simpl:assetProperties'] as Record<string, unknown>)['simpl:providerDataAddress']).toBeDefined();
  });

  it('serializes CURIE enum selections as @id values', async () => {
    const schema: ExtendedJsonSchema4 = {
      rdfType: 'simpl:DataOffering',
      type: 'object',
      properties: {
        'ms:lrType': {
          type: 'string',
          oneOf: [{ const: 'ms:corpus1', title: 'Corpus 1' }],
        },
      },
    };

    const context = {
      simpl: 'http://w3id.org/gaia-x/simpl#',
      ms: 'http://w3id.org/meta-share/meta-share/',
    };

    const data = {
      'ms:lrType': 'ms:corpus1',
    } as Record<string, unknown>;

    const result = await formatDataToJsonLd(data, schema, context);
    const lrType = result['ms:lrType'] as Record<string, unknown>;
    expect(lrType['@id']).toBe('ms:corpus1');
    expect(lrType['@value']).toBeUndefined();
  });

  it('serializes array of complex objects into JSON-LD arrays', async () => {
    const schema: ExtendedJsonSchema4 = {
      rdfType: 'dcat:Distribution',
      type: 'object',
      properties: {
        'ms:size': {
          type: 'array',
          items: {
            rdfType: 'ms:Size',
            type: 'object',
            properties: {
              'ms:amount': {
                rdfType: 'xsd:number',
                type: 'number',
              },
              'ms:sizeUnit': {
                type: 'string',
                oneOf: [{ const: 'ms:words', title: 'Words' }],
              },
            },
          },
        },
      },
    };

    const context = {
      dcat: 'http://www.w3.org/ns/dcat#',
      ms: 'http://w3id.org/meta-share/meta-share/',
      xsd: 'http://www.w3.org/2001/XMLSchema#',
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    };

    const data = {
      'ms:size': [
        {
          'ms:amount': 42,
          'ms:sizeUnit': 'ms:words',
        },
        {
          'ms:amount': 100,
          'ms:sizeUnit': 'ms:words',
        },
      ],
    } as Record<string, unknown>;

    const result = await formatDataToJsonLd(data, schema, context);
    const sizeValues = result['ms:size'] as Record<string, unknown>[];
    expect(Array.isArray(sizeValues)).toBeTrue();
    expect(sizeValues.length).toBe(2);
    expect((sizeValues[0]['rdf:type'] as Record<string, unknown>)['@id']).toBe('ms:Size');
    expect((sizeValues[0]['ms:amount'] as Record<string, unknown>)['@value']).toBe(42);
    expect((sizeValues[0]['ms:sizeUnit'] as Record<string, unknown>)['@id']).toBe('ms:words');
  });

  it('serializes distribution object with nested ms:size arrays', async () => {
    const schema: ExtendedJsonSchema4 = {
      rdfType: 'dcat:Distribution',
      type: 'object',
      properties: {
        'dct:format': {
          type: 'string',
          oneOf: [{ const: 'omtd:json', title: 'JSON' }],
        },
        'dcat:byteSize': {
          rdfType: 'xsd:integer',
          type: 'integer',
        },
        'ms:size': {
          type: 'array',
          items: {
            rdfType: 'ms:Size',
            type: 'object',
            properties: {
              'ms:amount': {
                rdfType: 'xsd:float',
                type: 'number',
              },
              'ms:sizeUnit': {
                type: 'string',
                oneOf: [{ const: 'ms:words', title: 'Words' }],
              },
            },
          },
        },
      },
    };

    const context = {
      dcat: 'http://www.w3.org/ns/dcat#',
      dct: 'http://purl.org/dc/terms/',
      ms: 'http://w3id.org/meta-share/meta-share/',
      omtd: 'http://www.opentag.com/omtd/',
      xsd: 'http://www.w3.org/2001/XMLSchema#',
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    };

    const data = {
      'dct:format': 'omtd:json',
      'dcat:byteSize': 1,
      'ms:size': [
        {
          'ms:amount': 1,
          'ms:sizeUnit': 'ms:words',
        },
      ],
    } as Record<string, unknown>;

    const result = await formatDataToJsonLd(data, schema, context);
    const sizeValues = result['ms:size'] as Record<string, unknown>[];
    expect(Array.isArray(sizeValues)).toBeTrue();
    expect((sizeValues[0]['ms:amount'] as Record<string, unknown>)['@value']).toBe(1);
    expect((sizeValues[0]['ms:sizeUnit'] as Record<string, unknown>)['@id']).toBe('ms:words');
    expect((result['dct:format'] as Record<string, unknown>)['@id']).toBe('omtd:json');
  });
});
