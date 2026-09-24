import { parseTtlToSchema } from '@eclipse-edc/dashboard-core/shacl-schema';

describe('ttlParser', () => {
  it('parses SHACL TTL and keeps only advanced-search fields', async () => {
    const ttl = `
      @prefix gax-validation: <http://w3id.org/gaia-x/validation#> .
      @prefix sh: <http://www.w3.org/ns/shacl#> .
      @prefix simpl: <http://w3id.org/gaia-x/simpl#> .
      @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

      gax-validation:RootShape a sh:NodeShape ;
          sh:property [
              sh:path simpl:general ;
              sh:node gax-validation:GeneralShape ;
              sh:minCount 1 ;
              sh:maxCount 1
          ] ;
          sh:targetClass simpl:Root .

      gax-validation:GeneralShape a sh:NodeShape ;
          sh:property
              [
                  simpl:configure ( "useForAdvancedSearch" ) ;
                  sh:path simpl:name ;
                  sh:datatype xsd:string ;
                  sh:minCount 1 ;
                  sh:description "Name"
              ],
              [
                  simpl:configure ( "hiddenInFrontend" ) ;
                  sh:path simpl:hidden ;
                  sh:datatype xsd:string ;
                  sh:minCount 1
              ],
              [
                  simpl:configure ( "useForAdvancedSearch" ) ;
                  sh:path simpl:kind ;
                  sh:datatype xsd:string ;
                  sh:in ( "free" "commercial" )
              ] ;
          sh:targetClass simpl:General .
    `;

    const parsed = await parseTtlToSchema(ttl, 'advancedSearch');

    expect(parsed.prefixes['simpl']).toBe('http://w3id.org/gaia-x/simpl#');
    const rootShape = parsed.root['RootShape'] as Record<string, unknown>;
    expect(rootShape).toBeDefined();
    expect(rootShape['rdfType']).toBe('simpl:Root');

    const rootProperties = rootShape['properties'] as Record<string, unknown>;
    const general = rootProperties['simpl:general'] as Record<string, unknown>;
    expect(general).toBeDefined();
    expect(general['rdfType']).toBe('simpl:General');
    expect(general['required']).toBeUndefined();
    const generalProperties = general['properties'] as Record<string, unknown>;
    expect(generalProperties['simpl:name']).toBeDefined();
    expect(generalProperties['simpl:hidden']).toBeUndefined();
    const kind = generalProperties['simpl:kind'] as Record<string, unknown>;
    expect(kind['enum']).toEqual(['free', 'commercial']);
  });

  it('applies sdCreation rules for hidden and frontend-only fields', async () => {
    const ttl = `
      @prefix gax-validation: <http://w3id.org/gaia-x/validation#> .
      @prefix ms: <http://w3id.org/meta-share/meta-share/> .
      @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
      @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
      @prefix sh: <http://www.w3.org/ns/shacl#> .
      @prefix simpl: <http://w3id.org/gaia-x/simpl#> .
      @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

      gax-validation:DataCorpusShape a sh:NodeShape ;
          sh:targetClass simpl:DataOffering ;
          sh:property [
              sh:path simpl:generalServiceProperties ;
              sh:node gax-validation:CorpusGeneralServicePropertiesShape ;
              sh:minCount 1 ;
              sh:maxCount 1
          ] ;
          sh:property [
              sh:path simpl:corpusBasicInfo ;
              sh:node gax-validation:CorpusBasicInfoShape ;
              sh:minCount 1 ;
              sh:maxCount 1
          ] .

      gax-validation:CorpusGeneralServicePropertiesShape a sh:NodeShape ;
          sh:property
              [
                  simpl:configure ( "useForAdvancedSearch" ) ;
                  sh:path simpl:name ;
                  sh:datatype xsd:string ;
                  sh:minCount 1 ;
                  sh:maxLength 255
              ],
              [
                  simpl:configure ( "hiddenInFrontend" "useForAdvancedSearch" ) ;
                  sh:path simpl:offeringType ;
                  sh:datatype xsd:string ;
                  sh:minCount 1
              ],
              [
                  simpl:configure ( "requiredOnFrontendOnly" ) ;
                  sh:path simpl:providerDataAddress ;
                  sh:datatype xsd:string
              ] ;
          sh:targetClass simpl:GeneralServiceProperties .

      gax-validation:CorpusBasicInfoShape a sh:NodeShape ;
          sh:property
              [
                  sh:path rdfs:label ;
                  sh:datatype xsd:string ;
                  sh:minCount 1
              ],
              [
                  sh:path ms:corpusSubclass ;
                  sh:datatype xsd:string ;
                  sh:in ( "annotatedCorpus" "rawCorpus" ) ;
                  sh:minCount 1
              ],
              [
                  simpl:configure ( "hiddenInFrontend" ) ;
                  sh:path ms:lrType ;
                  sh:datatype xsd:string ;
                  sh:minCount 1
              ] ;
          sh:targetClass simpl:CorpusBasicInfo .
    `;

    const parsed = await parseTtlToSchema(ttl, 'sdCreation');

    const rootShape = parsed.root['DataCorpusShape'] as Record<string, unknown>;
    const rootRequired = rootShape['required'] as string[];
    expect(rootRequired).toContain('simpl:generalServiceProperties');
    expect(rootRequired).toContain('simpl:corpusBasicInfo');

    const rootProperties = rootShape['properties'] as Record<string, unknown>;
    const generalSection = rootProperties['simpl:generalServiceProperties'] as Record<string, unknown>;
    const generalProperties = generalSection['properties'] as Record<string, unknown>;
    const generalRequired = generalSection['required'] as string[];

    expect(generalProperties['simpl:name']).toBeDefined();
    expect(generalProperties['simpl:offeringType']).toBeUndefined();
    expect(generalProperties['simpl:providerDataAddress']).toBeDefined();
    expect(generalRequired).toContain('simpl:name');
    expect(generalRequired).toContain('simpl:providerDataAddress');
    expect(generalRequired).not.toContain('simpl:offeringType');

    const basicInfoSection = rootProperties['simpl:corpusBasicInfo'] as Record<string, unknown>;
    const basicInfoProperties = basicInfoSection['properties'] as Record<string, unknown>;
    const basicInfoRequired = basicInfoSection['required'] as string[];

    const corpusSubclass = basicInfoProperties['ms:corpusSubclass'] as Record<string, unknown>;
    expect(basicInfoProperties['rdfs:label']).toBeDefined();
    expect(corpusSubclass).toBeDefined();
    expect(corpusSubclass['enum']).toEqual(['annotatedCorpus', 'rawCorpus']);
    expect(basicInfoProperties['ms:lrType']).toBeUndefined();
    expect(basicInfoRequired).toContain('rdfs:label');
    expect(basicInfoRequired).toContain('ms:corpusSubclass');
    expect(basicInfoRequired).not.toContain('ms:lrType');
  });

  it('parses nested LanguageShape for advanced search without altering flat fields', async () => {
    const ttl = `
      @prefix gax-validation: <http://w3id.org/gaia-x/validation#> .
      @prefix ms: <http://w3id.org/meta-share/meta-share/> .
      @prefix sh: <http://www.w3.org/ns/shacl#> .
      @prefix simpl: <http://w3id.org/gaia-x/simpl#> .
      @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

      gax-validation:CorpusShape a sh:NodeShape ;
          sh:property
              [
                  simpl:configure ( "useForAdvancedSearch" ) ;
                  sh:path ms:lrType ;
                  sh:datatype xsd:string ;
                  sh:in ( "ms:corpus1" ) ;
                  sh:minCount 1 ;
                  sh:maxCount 1
              ],
              [
                  simpl:configure ( "useForAdvancedSearch" ) ;
                  sh:path ms:language ;
                  sh:node gax-validation:LanguageShape ;
                  sh:minCount 1 ;
                  sh:maxCount 1
              ] ;
          sh:targetClass ms:Corpus .

      gax-validation:LanguageShape a sh:NodeShape ;
          sh:property
              [
                  sh:path ms:languageCode ;
                  sh:datatype xsd:string ;
                  sh:in ( "ms:spa" "ms:eng" ) ;
                  sh:minCount 1 ;
                  sh:maxCount 1
              ],
              [
                  sh:path ms:region ;
                  sh:datatype xsd:string ;
                  sh:in ( "ms:ES" "ms:MX" ) ;
                  sh:maxCount 1
              ] ;
          sh:targetClass ms:Language .
    `;

    const parsed = await parseTtlToSchema(ttl, 'advancedSearch');

    const corpusShape = parsed.root['CorpusShape'] as Record<string, unknown>;
    expect(corpusShape).toBeDefined();
    expect(corpusShape['rdfType']).toBe('ms:Corpus');

    const corpusProperties = corpusShape['properties'] as Record<string, unknown>;
    const lrType = corpusProperties['ms:lrType'] as Record<string, unknown>;
    const language = corpusProperties['ms:language'] as Record<string, unknown>;

    expect(lrType).toBeDefined();
    expect(language).toBeDefined();

    // Flat field is still a simple enum/string.
    expect(lrType['type']).toBe('string');
    expect(lrType['enum']).toEqual(['ms:corpus1']);

    // Nested LanguageShape is preserved as an object with its own rdfType and properties.
    expect(language['type']).toBe('object');
    expect(language['rdfType']).toBe('ms:Language');

    const languageProperties = language['properties'] as Record<string, unknown>;
    const languageCode = languageProperties['ms:languageCode'] as Record<string, unknown>;
    const region = languageProperties['ms:region'] as Record<string, unknown>;

    expect(languageCode).toBeDefined();
    expect(region).toBeDefined();
    expect(languageCode['enum']).toEqual(['ms:spa', 'ms:eng']);
    expect(region['enum']).toEqual(['ms:ES', 'ms:MX']);
  });

  it('compacts URI enum values from sh:in to prefixed values', async () => {
    const ttl = `
      @prefix gax-validation: <http://w3id.org/gaia-x/validation#> .
      @prefix ms: <http://w3id.org/meta-share/meta-share/> .
      @prefix sh: <http://www.w3.org/ns/shacl#> .

      gax-validation:CorpusShape a sh:NodeShape ;
          sh:property [
              sh:path ms:lrType ;
              sh:in ( ms:corpus1 ) ;
              sh:minCount 1 ;
              sh:maxCount 1
          ] ;
          sh:targetClass ms:Corpus .
    `;

    const parsed = await parseTtlToSchema(ttl, 'advancedSearch');
    const corpusShape = parsed.root['CorpusShape'] as Record<string, unknown>;
    const corpusProperties = corpusShape['properties'] as Record<string, unknown>;
    const lrType = corpusProperties['ms:lrType'] as Record<string, unknown>;

    const oneOf = lrType['oneOf'] as Array<{ const?: string }>;
    expect(oneOf).toBeDefined();
    expect(oneOf[0]['const']).toBe('ms:corpus1');
  });
});
