import { parseTtlToSchema } from './ttlParser';
import { buildDynamicSectionsFromSchema, createDynamicFormGroup } from '../render/dynamic-schema-form.factory';

describe('ttlParser complex node arrays', () => {
  const ttl = `
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix gax-validation: <http://w3id.org/gaia-x/validation#> .
@prefix ms: <http://w3id.org/meta-share/meta-share/> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

gax-validation:DistributionShape a sh:NodeShape ;
  sh:targetClass dcat:Distribution ;
  sh:property [
    sh:path ms:size ;
    sh:minCount 1 ;
    sh:node gax-validation:SizeShape
  ] .

gax-validation:SizeShape a sh:NodeShape ;
  sh:targetClass ms:Size ;
  sh:property [
    sh:path ms:amount ;
    sh:datatype xsd:float ;
    sh:minCount 1 ;
    sh:maxCount 1
  ] ;
  sh:property [
    sh:path ms:sizeUnit ;
    sh:minCount 1 ;
    sh:maxCount 1
  ] .
`;

  it('defaults sh:node properties without maxCount to repeatable arrays in sdCreation', async () => {
    const parsed = await parseTtlToSchema(ttl, 'sdCreation');
    const shape = parsed.root['gax-validation:DistributionShape'];
    const sizeProperty = shape.properties?.['ms:size'] as Record<string, unknown>;

    expect(sizeProperty['type']).toBe('array');
    expect(sizeProperty['minItems']).toBe(1);
    expect(sizeProperty['items']).toBeDefined();

    const itemSchema = sizeProperty['items'] as Record<string, unknown>;
    expect(itemSchema['type']).toBe('object');
    expect(itemSchema['rdfType']).toBe('ms:Size');
    expect((itemSchema['properties'] as Record<string, unknown>)['ms:amount']).toBeDefined();
    expect((itemSchema['properties'] as Record<string, unknown>)['ms:sizeUnit']).toBeDefined();
  });

  it('keeps sh:node properties as single object in advancedSearch', async () => {
    const parsed = await parseTtlToSchema(ttl, 'advancedSearch');
    const shape = parsed.root['gax-validation:DistributionShape'];
    const sizeProperty = shape.properties?.['ms:size'] as Record<string, unknown>;

    expect(sizeProperty['type']).toBe('object');
    expect(sizeProperty['rdfType']).toBe('ms:Size');
    expect((sizeProperty['properties'] as Record<string, unknown>)['ms:amount']).toBeDefined();
  });

  it('sets default "default" for hiddenInFrontend fields in advancedSearch', async () => {
    const hiddenTtl = `
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
              ],
              [
                  simpl:configure ( "hiddenInFrontend" "useForAdvancedSearch" ) ;
                  sh:path simpl:hidden ;
                  sh:datatype xsd:string ;
              ] ;
          sh:targetClass simpl:General .
    `;

    const parsed = await parseTtlToSchema(hiddenTtl, 'advancedSearch');
    const rootShape = parsed.root['RootShape'] as Record<string, unknown>;
    const rootProperties = rootShape['properties'] as Record<string, unknown>;
    const general = rootProperties['simpl:general'] as Record<string, unknown>;
    const generalProperties = general['properties'] as Record<string, unknown>;
    const hidden = generalProperties['simpl:hidden'] as Record<string, unknown>;

    expect(hidden).toBeDefined();
    expect(hidden['default']).toBe('default');

    const sections = buildDynamicSectionsFromSchema({ root: parsed.root });
    const formGroup = createDynamicFormGroup(sections);
    const hiddenField = sections.flatMap(section => section.fields).find(field => field.key === 'simpl:hidden');
    expect(hiddenField).toBeDefined();
    expect(formGroup.get(hiddenField?.controlName ?? '')?.value).toBe('default');
  });
});

describe('ttlParser selector repeatability', () => {
  it('marks enum properties with minCount and no maxCount as repeatable arrays in sdCreation', async () => {
    const ttl = `
@prefix gax-validation: <http://w3id.org/gaia-x/validation#> .
@prefix ms: <http://w3id.org/meta-share/meta-share/> .
@prefix sh: <http://www.w3.org/ns/shacl#> .

gax-validation:CorpusShape a sh:NodeShape ;
  sh:targetClass ms:Corpus ;
  sh:property [
    sh:path ms:mediaType ;
    sh:in ( ms:audio ms:image ms:text ) ;
    sh:minCount 1
  ] .
`;

    const parsed = await parseTtlToSchema(ttl, 'sdCreation');
    const shape = parsed.root['gax-validation:CorpusShape'] as Record<string, unknown>;
    const shapeProperties = (shape['properties'] as Record<string, unknown> | undefined) ?? {};
    const mediaTypeProperty = shapeProperties['ms:mediaType'] as Record<string, unknown>;

    expect(mediaTypeProperty['type']).toBe('array');
    expect(mediaTypeProperty['minItems']).toBe(1);
    expect(mediaTypeProperty['items']).toEqual(jasmine.objectContaining({ enum: ['ms:audio', 'ms:image', 'ms:text'] }));
  });
});

describe('ttlParser property groups', () => {
  const groupedTtl = `
@prefix gax: <http://w3id.org/gaia-x/validation#> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix adms: <http://www.w3.org/ns/adms#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .

gax:BasicGroup a sh:PropertyGroup ; rdfs:label "Información básica" ; sh:order 1 .
gax:OtherGroup a sh:PropertyGroup ; rdfs:label "Identificación" ; sh:order 2 .

gax:IdentifierShape a sh:NodeShape ;
  sh:targetClass adms:Identifier ;
  sh:property [
    sh:path skos:notation ;
    sh:datatype xsd:string ;
    sh:minCount 1 ;
    sh:name "notación" ;
    sh:order 1 ] .

gax:TestShape a sh:NodeShape ;
  sh:targetClass gax:Test ;
  sh:property [
    sh:path dct:title ;
    sh:datatype xsd:string ;
    sh:group gax:BasicGroup ;
    sh:order 2 ;
    sh:name "título" ] ;
  sh:property [
    sh:path dct:description ;
    sh:datatype xsd:string ;
    sh:order 1 ] ;
  sh:property [
    sh:path adms:identifier ;
    sh:group gax:OtherGroup ;
    sh:node gax:IdentifierShape ;
    sh:order 3 ] .
`;

  it('parses sh:PropertyGroup catalog and property group metadata', async () => {
    const parsed = await parseTtlToSchema(groupedTtl, 'sdCreation');
    const shape = parsed.root['gax:TestShape'] as Record<string, unknown>;
    const propertyGroups = shape['propertyGroups'] as Record<string, { label: string; order?: number }>;
    const properties = shape['properties'] as Record<string, Record<string, unknown>>;

    expect(propertyGroups['gax:BasicGroup']).toEqual({ label: 'Información básica', order: 1 });
    expect(propertyGroups['gax:OtherGroup']).toEqual({ label: 'Identificación', order: 2 });

    expect(properties['dct:title']['group']).toBe('gax:BasicGroup');
    expect(properties['dct:title']['order']).toBe(2);
    expect(properties['dct:title']['name']).toBe('título');
    expect(properties['dct:description']['group']).toBeUndefined();

    const identifier = properties['adms:identifier'];
    expect(identifier['group']).toBe('gax:OtherGroup');
    expect(identifier['order']).toBe(3);
    const identifierProps = identifier['properties'] as Record<string, Record<string, unknown>>;
    expect(identifierProps['skos:notation']['name']).toBe('notación');
  });
});

describe('ttlParser SPARQL constraints', () => {
  it('preserves sh:sparql messages and select queries on node shapes', async () => {
    const ttl = `
@prefix gax: <http://w3id.org/gaia-x/validation#> .
@prefix ms: <http://w3id.org/meta-share/meta-share/> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

gax:CorpusShape a sh:NodeShape ;
  sh:targetClass ms:Corpus ;
  sh:property [
    sh:path ms:language ;
    sh:datatype xsd:string
  ] ;
  sh:sparql [
    a sh:SPARQLConstraint ;
    sh:message "Only one 'ms:language' is allowed when 'ms:lingualityType' is 'monolingual'." ;
    sh:select "SELECT $this WHERE { $this ms:lingualityType ms:monolingual . }"
  ] .
`;

    const parsed = await parseTtlToSchema(ttl, 'sdCreation');
    const shape = parsed.root['gax:CorpusShape'] as Record<string, unknown>;
    const sparqlConstraints = shape['sparqlConstraints'] as Array<Record<string, string>>;

    expect(sparqlConstraints).toEqual([
      {
        message: "Only one 'ms:language' is allowed when 'ms:lingualityType' is 'monolingual'.",
        select: 'SELECT $this WHERE { $this ms:lingualityType ms:monolingual . }',
      },
    ]);
  });
});
