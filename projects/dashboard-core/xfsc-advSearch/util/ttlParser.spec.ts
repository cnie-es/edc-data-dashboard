import { parseTtlToSchema } from './ttlParser';

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

  it('maps minCount/maxCount and array item maxLength on repeated properties', async () => {
    const ttl = `
      @prefix gax-validation: <http://w3id.org/gaia-x/validation#> .
      @prefix sh: <http://www.w3.org/ns/shacl#> .
      @prefix simpl: <http://w3id.org/gaia-x/simpl#> .
      @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

      gax-validation:RootShape a sh:NodeShape ;
          sh:property [
              simpl:configure ( "useForAdvancedSearch" ) ;
              sh:path simpl:keywords ;
              sh:datatype xsd:string ;
              sh:minCount 2 ;
              sh:maxCount 4 ;
              sh:maxLength 50
          ] ;
          sh:targetClass simpl:Root .
    `;

    const parsed = await parseTtlToSchema(ttl, 'advancedSearch');
    const rootShape = parsed.root['RootShape'] as Record<string, unknown>;
    const rootProperties = rootShape['properties'] as Record<string, unknown>;
    const keywords = rootProperties['simpl:keywords'] as Record<string, unknown>;
    const keywordsItems = keywords['items'] as Record<string, unknown>;

    expect(keywords['type']).toBe('array');
    expect(keywords['minItems']).toBe(2);
    expect(keywords['maxItems']).toBe(4);
    expect(keywordsItems['maxLength']).toBe(50);
  });
});
