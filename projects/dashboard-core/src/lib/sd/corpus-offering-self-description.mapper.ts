/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================================
 * MAPPER — CorpusOffering self-description (JSON-LD Verifiable Credential)
 * ============================================================================
 *
 * Este mapper traduce el `credentialSubject` de una Verifiable Credential
 * (conformante a `gax-validation:CorpusOfferingShape`, ver `corpus.ttl`) a un
 * ViewModel plano y estable que consume el componente de detalle.
 *
 * ORGANIZACIÓN — el TTL define dos niveles de anidamiento:
 *
 *  1) Secciones de primer nivel de `CorpusOfferingShape` (sh:order 1-11):
 *     corpusAsset · isPublicOffering · dataProperties · generalServiceProperties ·
 *     assetProperties · providerInformation · offeringPrice · servicePolicy ·
 *     contractTemplate · edcRegistration (oculta) · edcConnector (oculta)
 *
 *  2) Subsecciones dentro de `corpusAsset` (`ms:Corpus`, `CorpusShape`,
 *     agrupadas por `sh:PropertyGroup`, sh:order 1-13):
 *     Información básica · Identificación · Idioma · Protección de datos ·
 *     Distribución · Clasificación · Licencia · Editor · Titular de derechos ·
 *     Idioma de origen · Idioma de destino · Idioma pivote · Documentación
 *
 * Cada nivel tiene su propia función `mapXxxSection(...)` que construye un
 * objeto tipado documentado con el nombre exacto del grupo SHACL al que
 * corresponde. El resultado final (`OfferSelfDescriptionDetailViewModel`)
 * expone:
 *   - Campos planos (compatibilidad con bindings existentes del componente/HTML).
 *   - `sections`: el mismo dato organizado por sección, pensado para que al
 *     incorporar nuevos TTLs (Model/API/LCR offerings) baste con:
 *       a) añadir un `mapXxxAssetSection()` específico del nuevo tipo de activo, y
 *       b) reutilizar sin cambios las secciones comunes (generalService,
 *          providerInformation, offeringPrice, servicePolicy, contractTemplate,
 *          dataProperties, assetProperties), que son idénticas en todas las
 *          `*OfferingShape`.
 *
 * NOTA sobre `simpl:configure`: los campos marcados en el TTL con
 * `simpl:configure ("hiddenInFrontend")` se siguen mapeando (para no perder
 * datos ni romper otros consumidores) pero el HTML no los renderiza,
 * replicando el criterio del propio esquema SHACL.
 * ============================================================================
 */

import { mapLanguageNodeFields } from './language-bcp47.util';
import { stripCuriePrefix } from './sd-display.util';

const NA = '';

// ============================================================================
// 0. HELPERS GENÉRICOS (JSON-LD parsing)
// ============================================================================

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function iriLocalName(iri: string): string {
  const hash = iri.lastIndexOf('#');
  const slash = iri.lastIndexOf('/');
  const raw = hash >= 0 ? iri.slice(hash + 1) : slash >= 0 ? iri.slice(slash + 1) : iri;
  return stripCuriePrefix(raw);
}

function toDisplayString(value: unknown, fallback = NA): string {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'string') {
    return value.trim().length ? value : fallback;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
}

/** Extrae el literal de un nodo `rdf:langString` (`{ "@language": ..., "@value": ... }`) o string plano. */
function langStringValue(node: unknown): string {
  if (typeof node === 'string') {
    return node;
  }
  const r = asRecord(node);
  if (r && '@value' in r) {
    return toDisplayString(r['@value'], NA);
  }
  return NA;
}

/** Extrae el literal de un nodo tipado (`{ "@type": ..., "@value": ... }`). */
function typedValue(node: unknown): string {
  const r = asRecord(node);
  if (r && '@value' in r) {
    return toDisplayString(r['@value'], NA);
  }
  return NA;
}

/** Extrae el `@id` (IRI) de un nodo de referencia. */
function iriId(node: unknown): string {
  const r = asRecord(node);
  if (!r) {
    return NA;
  }
  const id = r['@id'];
  return typeof id === 'string' ? id : NA;
}

/** Etiqueta corta yes/no/unknown para los flags `ms:*Included`/`ms:anonymized` (p. ej. `ms:yesA` → `yes`). */
function msFlagLabel(iri: string): string {
  const tail = iriLocalName(iri).toLowerCase();
  if (tail.startsWith('yes')) {
    return 'yes';
  }
  if (tail.startsWith('no')) {
    return 'no';
  }
  if (tail.includes('unknown') || tail === 'unk') {
    return 'unknown';
  }
  return iriLocalName(iri);
}

/** Normaliza un valor JSON-LD que puede venir como nodo único o array (cardinalidad SHACL sin `maxCount`). */
function normalizeArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

/** Devuelve el string salvo que represente un cero (vacío o "0"), en cuyo caso NA. */
function nonZeroString(val: string): string {
  return val && val !== '0' ? val : NA;
}

/** `true` si el string parece una URL absoluta http(s). */
function looksLikeUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function resolveSubject(json: Record<string, unknown>): Record<string, unknown> {
  return asRecord(json['credentialSubject']) ?? json;
}

function formatAssetTypeLabel(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return NA;
  }
  return stripCuriePrefix(trimmed).toLowerCase();
}

// ============================================================================
// 1. TIPOS COMUNES REUTILIZABLES (usados por varias secciones/asset shapes)
// ============================================================================

/**
 * `gax-validation:IdentifierShape` (target `adms:Identifier`).
 * `notation` = `skos:notation` (el valor real: DOI, ISNI, ROR, código SPDX…).
 * `agency`   = `adms:schemaAgency` (agencia responsable del esquema, opcional).
 */
export interface IdentifierVm {
  notation: string;
  agency: string;
  /** `true` si `notation` es una URL absoluta y puede renderizarse como enlace. */
  isUrl: boolean;
}

/** `gax-validation:OrganizationShape` (target `foaf:Organization`). */
export interface OrganizationVm {
  name: string;
  identifiers: IdentifierVm[];
}

/** `gax-validation:LicenseDocumentShape` (target `dct:LicenseDocument`). */
export interface LicenseVm {
  title: string;
  description: string;
  legalCode: string;
  identifiers: IdentifierVm[];
}

/** `gax-validation:PeriodOfTimeShape` (target `dct:PeriodOfTime`). */
export interface PeriodVm {
  startDate: string;
  endDate: string;
}

/** `gax-validation:SizeShape` (target `ms:Size`). */
export interface SizeVm {
  amount: string;
  unit: string;
}

/** `gax-validation:DocumentShape` (target `foaf:Document`), enlazado vía `ms:isDocumentedBy`. */
export interface DocumentVm {
  citationText: string;
}

/** Fila de idioma/variedad lingüística — `gax-validation:LanguageShape` (target `ms:Language`). */
export interface CorpusOfferingLanguageRow {
  /** ISO 3166-1 alpha-2 region code for flags (e.g. ES). */
  regionCode: string;
  /** Human-readable region name (e.g. España). */
  regionDisplay: string;
  varietyLine: string;
  hasDisplayContent: boolean;
  /** @deprecated Use {@link regionCode}. */
  regionLabel: string;
}

/** @deprecated Usar {@link IdentifierVm}; se mantiene para compatibilidad de bindings existentes. */
export interface SelfDescriptionIdentifier {
  referenceUrl: string;
  agency: string;
}

/** @deprecated Usar {@link DocumentVm} + {@link IdentifierVm}; se mantiene por compatibilidad. */
export interface RelatedDocumentVm {
  citationText: string;
  referenceUrl: string;
  agency: string;
}

export type ProvenanceBlockKind = 'originalSource' | 'ipRightsHolder';

/** @deprecated Usar {@link OrganizationVm} (p. ej. `sections.corpus.iprHolders`). */
export interface ProvenanceBlockVm {
  kind: ProvenanceBlockKind;
  displayName: string;
  referenceUrl: string;
  agency: string;
}

export interface ModelPropertiesVm {
  modelType: string;
  variantOf: string;
  detailsUrl: string;
}

/** @deprecated Usar {@link IdentifierVm}. */
export interface PublisherIdentifierVm {
  agency: string;
  notation: string;
}

/** @deprecated Usar {@link LicenseVm}. */
export interface CorpusLicenseVm {
  url: string;
  title: string;
  description: string;
}

export interface AccessPolicyRow {
  user: string;
  actions: string;
  from: string;
  to: string;
}

export interface UsagePolicyRow {
  user: string;
  usageType: string;
  constraint: string;
}

// ============================================================================
// 2. SUBSECCIONES DE `corpusAsset` (ms:Corpus / CorpusShape)
//    Cada interfaz corresponde a un `sh:PropertyGroup` del TTL.
// ============================================================================

/** PropertyGroup "Información básica" (sh:order 1). */
export interface CorpusBasicInfoSection {
  lrType: string;
  title: string;
  description: string;
  version: string;
  keywords: string[];
  mediaTypes: string[];
  lingualityType: string;
}

/** PropertyGroup "Identificación" (sh:order 2). */
export interface CorpusIdentificationSection {
  alternativeTitle: string;
  identifiers: IdentifierVm[];
}

/** PropertyGroup "Protección de datos" (sh:order 4). */
export interface CorpusDataProtectionSection {
  anonymized: string;
  personalDataIncluded: string;
  sensitiveDataIncluded: string;
  technicalMeasures: string[];
  dataProtectionPrinciples: string[];
  anonymizationDetails: string;
  personalDataDetails: string;
  sensitiveDataDetails: string;
  originalSourceDescription: string;
}

/** PropertyGroup "Distribución" (sh:order 5). */
export interface CorpusDistributionSection {
  formats: string[];
  packageFormat: string;
  byteSize: string;
  /** `ms:size` no tiene `maxCount`, puede haber varias unidades (p. ej. horas y palabras). */
  sizes: SizeVm[];
}

/** PropertyGroup "Clasificación" (sh:order 6). */
export interface CorpusClassificationSection {
  corpusSubclass: string;
  spatialCoverage: string;
  temporalCoverage?: PeriodVm;
  multilingualityType: string;
  annotationTypes: string[];
  domain: string;
  /** `dct:conformsTo` a nivel de `ms:Corpus`: estándar/buena práctica (p. ej. TEI_P5). Distinto del `dct:conformsTo` de la oferta. */
  standardsConformance: string;
}

/** Agrupa las 13 subsecciones de `CorpusShape` (todo lo colgado de `edval:corpusAsset`). */
export interface CorpusSection {
  basicInfo: CorpusBasicInfoSection;
  identification: CorpusIdentificationSection;
  /** PropertyGroup "Idioma" (sh:order 3). */
  languages: CorpusOfferingLanguageRow[];
  dataProtection: CorpusDataProtectionSection;
  distribution: CorpusDistributionSection;
  classification: CorpusClassificationSection;
  /** PropertyGroup "Licencia" (sh:order 7). */
  license?: LicenseVm;
  /** PropertyGroup "Editor" (sh:order 8). */
  publisher?: OrganizationVm;
  /** PropertyGroup "Titular de derechos" (sh:order 9). */
  iprHolders: OrganizationVm[];
  /** PropertyGroup "Idioma de origen" (sh:order 10). */
  sourceLanguages: CorpusOfferingLanguageRow[];
  /** PropertyGroup "Idioma de destino" (sh:order 11). */
  targetLanguages: CorpusOfferingLanguageRow[];
  /** PropertyGroup "Idioma pivote" (sh:order 12). */
  pivotLanguages: CorpusOfferingLanguageRow[];
  /** PropertyGroup "Documentación" (sh:order 13). */
  documentation: DocumentVm[];
}

// ============================================================================
// 3. SECCIONES DE PRIMER NIVEL DE `CorpusOfferingShape`
//    Comunes a cualquier tipo de oferta (Corpus/Model/API/LCR): reutilizables
//    tal cual cuando se incorporen otros TTLs de asset.
// ============================================================================

/** `simpl:dataProperties` (sh:order 3). */
export interface DataPropertiesSection {
  producedBy: string;
  format: string;
  openApi: string;
  additionalInfo: string;
  relatedDatasets: string;
  targetUsers: string;
  dataQuality: string;
  encryption: string;
  anonymization: string;
}

/** `simpl:generalServiceProperties` (sh:order 4). */
export interface GeneralServicePropertiesSection {
  name: string;
  description: string;
  serviceAccessPoint: string;
  keywords: string[];
  inLanguage: string;
  offeringType: string;
  sharingMethodId: string;
}

/** `simpl:assetProperties` (sh:order 5). */
export interface AssetPropertiesSection {
  providerDataAddress: string;
}

/** `simpl:providerInformation` (sh:order 6). */
export interface ProviderInformationSection {
  providedBy: string;
  contact: string;
  signature: string;
}

/** `simpl:offeringPrice` (sh:order 7). */
export interface OfferingPriceSection {
  license: string;
  currency: string;
  price: string;
  priceType: string;
}

/** `simpl:servicePolicy` (sh:order 8). */
export interface ServicePolicySection {
  accessPolicyRaw: string;
  usagePolicyRaw: string;
  dataProtectionRegime: string;
  accessPolicyRows: AccessPolicyRow[];
  usagePolicyRows: UsagePolicyRow[];
}

/** `simpl:contractTemplate` (sh:order 9). */
export interface ContractTemplateSection {
  document: string;
  hashAlg: string;
  hashValue: string;
  url: string;
}

/** `simpl:edcRegistration` (sh:order 10, `hiddenInFrontend`). No se renderiza en el HTML. */
export interface EdcRegistrationSection {
  assetId: string;
  contractDefinitionId: string;
  servicePolicyId: string;
  accessPolicyId: string;
}

/** `simpl:edcConnector` (sh:order 11, `hiddenInFrontend`). No se renderiza en el HTML. */
export interface EdcConnectorSection {
  providerEndpointURL: string;
}

/** Todas las secciones organizadas jerárquicamente, en el orden del TTL. */
export interface OfferSelfDescriptionSections {
  corpus: CorpusSection;
  dataProperties: DataPropertiesSection;
  generalService: GeneralServicePropertiesSection;
  assetProperties: AssetPropertiesSection;
  providerInformation: ProviderInformationSection;
  offeringPrice: OfferingPriceSection;
  servicePolicy: ServicePolicySection;
  contractTemplate: ContractTemplateSection;
  edcRegistration: EdcRegistrationSection;
  edcConnector: EdcConnectorSection;
}

// ============================================================================
// 4. VIEWMODEL FINAL
//    Campos planos = compatibilidad con el componente/HTML existentes.
//    `sections`     = acceso estructurado y escalable (nuevas subsecciones).
// ============================================================================

export interface OfferSelfDescriptionDetailViewModel {
  documentId: string;
  title: string;
  providerLabel: string;
  offeringTypeLabel: string;
  version: string;
  isPublicOffering: boolean;
  description: string;
  keywords: string[];
  mediaTypeLabels: string[];
  lingualityLabel: string;
  modelFunctionLabels: string[];
  personalDataLabel: string;
  sensitiveDataLabel: string;
  anonymizedLabel: string;
  licenseUrl: string;
  priceAmount: string;
  priceCurrency: string;
  priceType: string;
  contractTemplateUrl: string;
  /** Raw JSON string from `simpl:servicePolicy.simpl:usage-policy` when present. */
  usagePolicyRaw: string;

  /** ISO timestamp from the VC root `issuanceDate` (offer publication date on cards). */
  issuanceDateIso: string;
  byteSize: string;
  packageFormat: string;
  fileFormatLabels: string[];
  /** Primer tamaño legible (compatibilidad); ver {@link OfferSelfDescriptionSections.corpus corpus.distribution.sizes} para todos. */
  sizeAmount: string;
  sizeUnit: string;
  /** @deprecated Prefer {@link relatedDocuments}; kept for backwards compatibility (first doc citation). */
  citationText: string;
  languages: CorpusOfferingLanguageRow[];
  /** Optional corpus-level persistent identifier (e.g. DOI card) — primer identificador de `corpusIdentifiers`. */
  corpusPrimaryIdentifier?: SelfDescriptionIdentifier;
  /** Todos los `adms:identifier` de `CorpusIdentificationGroup`. */
  corpusIdentifiers: IdentifierVm[];
  relatedDocuments: RelatedDocumentVm[];
  provenanceBlocks: ProvenanceBlockVm[];
  modelProperties?: ModelPropertiesVm;

  conformsToTitle: string;
  alternativeTitle: string;
  publisherName: string;
  publisherIdentifier?: PublisherIdentifierVm;
  corpusLicense?: CorpusLicenseVm;
  anonymizationDetails: string;
  personalDataDetails: string;
  sensitiveDataDetails: string;
  originalSourceDescription: string;
  domain: string;
  corpusSubclass: string;
  lrType: string;
  /** Primer tipo de anotación (compatibilidad); ver `sections.corpus.classification.annotationTypes` para todos. */
  annotationType: string;
  /** Primer principio (compatibilidad); ver `sections.corpus.dataProtection.dataProtectionPrinciples` para todos. */
  dataProtectionPrinciple: string;
  /** Primera medida técnica (compatibilidad); ver `sections.corpus.dataProtection.technicalMeasures` para todas. */
  technicalMeasure: string;
  /** Estándar/buena práctica del corpus (`dct:conformsTo` a nivel `ms:Corpus`, p. ej. TEI_P5). */
  standardsConformance: string;
  sourceLanguages: CorpusOfferingLanguageRow[];
  targetLanguages: CorpusOfferingLanguageRow[];
  pivotLanguages: CorpusOfferingLanguageRow[];
  providerContact: string;
  sharingMethod: string;
  serviceAccessPoint: string;
  dataQuality: string;
  encryption: string;
  contractTemplateDoc: string;

  accessPolicyRows: AccessPolicyRow[];
  usagePolicyRows: UsagePolicyRow[];

  /** Acceso estructurado y escalable a todas las secciones/subsecciones (ver §3). */
  sections: OfferSelfDescriptionSections;
}

// ============================================================================
// 5. MAPEADORES DE TIPOS COMUNES
// ============================================================================

/** Mapea `gax-validation:IdentifierShape` → {@link IdentifierVm}. */
function mapIdentifier(node: unknown): IdentifierVm | undefined {
  const r = asRecord(node);
  if (!r) {
    return undefined;
  }
  const notation = toDisplayString(r['skos:notation'], NA);
  const agency = langStringValue(r['adms:schemaAgency']) || toDisplayString(r['adms:schemaAgency'], NA);
  if (!notation && !agency) {
    return undefined;
  }
  return { notation, agency, isUrl: looksLikeUrl(notation) };
}

function mapIdentifiers(raw: unknown): IdentifierVm[] {
  return normalizeArray(raw)
    .map(mapIdentifier)
    .filter((id): id is IdentifierVm => id !== undefined);
}

/** Mapea `gax-validation:OrganizationShape` → {@link OrganizationVm}. */
function mapOrganization(node: unknown): OrganizationVm | undefined {
  const r = asRecord(node);
  if (!r) {
    return undefined;
  }
  const name = langStringValue(r['foaf:name']);
  if (!name) {
    return undefined;
  }
  return { name, identifiers: mapIdentifiers(r['adms:identifier']) };
}

function mapOrganizations(raw: unknown): OrganizationVm[] {
  return normalizeArray(raw)
    .map(mapOrganization)
    .filter((org): org is OrganizationVm => org !== undefined);
}

/** Mapea `gax-validation:LicenseDocumentShape` → {@link LicenseVm}. */
function mapLicense(node: unknown): LicenseVm | undefined {
  const r = asRecord(node);
  if (!r) {
    return undefined;
  }
  return {
    title: langStringValue(r['dct:title']),
    description: langStringValue(r['dct:description']),
    legalCode: typedValue(r['cc:legalcode']),
    identifiers: mapIdentifiers(r['adms:identifier']),
  };
}

/** Mapea `gax-validation:PeriodOfTimeShape` → {@link PeriodVm}. */
function mapPeriod(node: unknown): PeriodVm | undefined {
  const r = asRecord(node);
  if (!r) {
    return undefined;
  }
  const startDate = typedValue(r['dcat:startDate']);
  const endDate = typedValue(r['dcat:endDate']);
  if (!startDate && !endDate) {
    return undefined;
  }
  return { startDate, endDate };
}

/** Mapea `gax-validation:SizeShape` → {@link SizeVm}. */
function mapSize(node: unknown): SizeVm | undefined {
  const r = asRecord(node);
  if (!r) {
    return undefined;
  }
  const amount = nonZeroString(typedValue(r['ms:amount']));
  const unit = iriLocalName(iriId(r['ms:sizeUnit']));
  if (!amount && !unit) {
    return undefined;
  }
  return { amount, unit };
}

/** Mapea `gax-validation:DocumentShape` (target `foaf:Document`) → {@link DocumentVm}. */
function mapDocument(node: unknown): DocumentVm | undefined {
  const r = asRecord(node);
  if (!r) {
    return undefined;
  }
  const citationText = langStringValue(r['ms:citationText']);
  return citationText ? { citationText } : undefined;
}

function mapDocuments(raw: unknown): DocumentVm[] {
  return normalizeArray(raw)
    .map(mapDocument)
    .filter((doc): doc is DocumentVm => doc !== undefined);
}

/** Mapea `gax-validation:LanguageShape` (target `ms:Language`) → {@link CorpusOfferingLanguageRow}. */
function mapLanguageNode(node: unknown): CorpusOfferingLanguageRow {
  const lang = asRecord(node) ?? {};
  const languageCodeIri = iriId(lang['ms:languageCode']);
  const mapped = mapLanguageNodeFields({
    regionIri: iriId(lang['ms:region']),
    languageCodeIri,
    languageVarietyName: toDisplayString(lang['ms:languageVarietyName'], NA) || undefined,
    languageTag: toDisplayString(lang['ms:languageTag'], NA) || undefined,
    variantIri: iriId(lang['ms:variant']),
  });
  // Fallback al código de idioma si no hay contenido mostrable (p. ej. sin variedad/región).
  const codeOnly =
    !mapped.hasDisplayContent && languageCodeIri ? stripCuriePrefix(languageCodeIri).replace(/^language_/, '') : '';
  return {
    regionCode: mapped.regionCode,
    regionDisplay: mapped.regionDisplay,
    varietyLine: mapped.varietyLine || codeOnly,
    hasDisplayContent: mapped.hasDisplayContent || codeOnly.length > 0,
    regionLabel: mapped.regionCode,
  };
}

function mapLanguages(raw: unknown): CorpusOfferingLanguageRow[] {
  return normalizeArray(raw).map(mapLanguageNode);
}

/** IRIs → etiquetas legibles, filtrando vacíos. Para propiedades sin `maxCount` (una o varias). */
function mapIriLabels(raw: unknown): string[] {
  return normalizeArray(raw)
    .map(n => iriLocalName(iriId(n)))
    .filter(s => s.length > 0);
}

// ============================================================================
// 6. SECCIÓN "corpusAsset" (ms:Corpus / CorpusShape) — por subsección
// ============================================================================

/** PropertyGroup "Información básica" (sh:order 1). */
function mapCorpusBasicInfo(corpus: Record<string, unknown>): CorpusBasicInfoSection {
  const keywordsRaw = normalizeArray(corpus['dcat:keyword']);
  return {
    lrType: iriLocalName(iriId(corpus['ms:lrType'])),
    title: langStringValue(corpus['dct:title']),
    description: langStringValue(corpus['dct:description']),
    version: toDisplayString(corpus['dcat:version'], NA),
    keywords: keywordsRaw.map(k => langStringValue(k)).filter(k => k.length > 0),
    mediaTypes: mapIriLabels(corpus['ms:mediaType']),
    lingualityType: iriLocalName(iriId(corpus['ms:lingualityType'])),
  };
}

/** PropertyGroup "Identificación" (sh:order 2). */
function mapCorpusIdentification(corpus: Record<string, unknown>): CorpusIdentificationSection {
  return {
    alternativeTitle: langStringValue(corpus['dct:alternative']),
    identifiers: mapIdentifiers(corpus['adms:identifier']),
  };
}

/** PropertyGroup "Protección de datos" (sh:order 4). */
function mapCorpusDataProtection(corpus: Record<string, unknown>): CorpusDataProtectionSection {
  const anonymIri = iriId(corpus['ms:anonymized']);
  const personalIri = iriId(corpus['ms:personalDataIncluded']);
  const sensitiveIri = iriId(corpus['ms:sensitiveDataIncluded']);
  return {
    anonymized: anonymIri ? msFlagLabel(anonymIri) : NA,
    personalDataIncluded: personalIri ? msFlagLabel(personalIri) : NA,
    sensitiveDataIncluded: sensitiveIri ? msFlagLabel(sensitiveIri) : NA,
    technicalMeasures: mapIriLabels(corpus['dpv:hasTechnicalOrganisationalMeasure']),
    dataProtectionPrinciples: mapIriLabels(corpus['ms:dataProtectionPrincipleApplied']),
    anonymizationDetails: langStringValue(corpus['ms:anonymizationDetails']),
    personalDataDetails: langStringValue(corpus['ms:personalDataDetails']),
    sensitiveDataDetails: langStringValue(corpus['ms:sensitiveDataDetails']),
    originalSourceDescription: langStringValue(corpus['ms:originalSourceDescription']),
  };
}

/** PropertyGroup "Distribución" (sh:order 5). */
function mapCorpusDistribution(corpus: Record<string, unknown>): CorpusDistributionSection {
  const distribution = asRecord(corpus['dcat:distribution']) ?? {};
  const byteSizeNode = distribution['dcat:byteSize'];
  const packageFmtNode = distribution['dcat:packageFormat'];
  const formatNodes = normalizeArray(distribution['dct:format']);
  const simplDataProps = asRecord((corpus['__simplDataProperties'] as Record<string, unknown>) ?? {}) ?? {};

  const formats = formatNodes.map(n => iriLocalName(iriId(n))).filter(Boolean);
  const simplFormat = toDisplayString(simplDataProps['simpl:format'], NA);

  return {
    formats: formats.length > 0 ? formats : simplFormat ? [simplFormat] : [],
    packageFormat: iriLocalName(iriId(packageFmtNode)),
    byteSize: nonZeroString(typedValue(byteSizeNode)),
    sizes: normalizeArray(distribution['ms:size'])
      .map(mapSize)
      .filter((s): s is SizeVm => s !== undefined),
  };
}

/** PropertyGroup "Clasificación" (sh:order 6). */
function mapCorpusClassification(corpus: Record<string, unknown>): CorpusClassificationSection {
  return {
    corpusSubclass: iriLocalName(iriId(corpus['ms:corpusSubclass'])),
    spatialCoverage: iriLocalName(iriId(corpus['dct:spatial'])),
    temporalCoverage: mapPeriod(normalizeArray(corpus['dct:temporal'])[0]),
    multilingualityType: iriLocalName(iriId(corpus['ms:multilingualityType'])),
    annotationTypes: mapIriLabels(corpus['ms:annotationType']),
    domain: iriLocalName(iriId(corpus['ms:domain'])),
    // `dct:conformsTo` AQUÍ es el estándar del corpus (p. ej. TEI_P5), no el de la oferta.
    standardsConformance: iriLocalName(iriId(corpus['dct:conformsTo'])),
  };
}

/** Construye la subsección completa de `corpusAsset` (todas las 13 subsecciones de `CorpusShape`). */
function mapCorpusSection(corpus: Record<string, unknown>): CorpusSection {
  return {
    basicInfo: mapCorpusBasicInfo(corpus),
    identification: mapCorpusIdentification(corpus),
    languages: mapLanguages(corpus['ms:language']),
    dataProtection: mapCorpusDataProtection(corpus),
    distribution: mapCorpusDistribution(corpus),
    classification: mapCorpusClassification(corpus),
    license: mapLicense(corpus['dct:license']),
    publisher: mapOrganization(corpus['dct:publisher']),
    iprHolders: mapOrganizations(corpus['ms:iprHolder']),
    sourceLanguages: mapLanguages(corpus['ms:sourceLanguage']),
    targetLanguages: mapLanguages(corpus['ms:targetLanguage']),
    pivotLanguages: mapLanguages(corpus['ms:pivotLanguage']),
    documentation: mapDocuments(corpus['ms:isDocumentedBy']),
  };
}

// ============================================================================
// 7. SECCIONES DE PRIMER NIVEL COMUNES (CorpusOfferingShape)
// ============================================================================

/** `simpl:dataProperties` (sh:order 3). */
function mapDataPropertiesSection(subject: Record<string, unknown>): DataPropertiesSection {
  const dp = asRecord(subject['simpl:dataProperties']) ?? {};
  return {
    producedBy: toDisplayString(dp['simpl:producedBy'], NA),
    format: toDisplayString(dp['simpl:format'], NA),
    openApi: toDisplayString(dp['simpl:openApi'], NA),
    additionalInfo: toDisplayString(dp['simpl:additionalInfo'], NA),
    relatedDatasets: toDisplayString(dp['simpl:relatedDatasets'], NA),
    targetUsers: toDisplayString(dp['simpl:targetUsers'], NA),
    dataQuality: toDisplayString(dp['simpl:dataQuality'], NA),
    encryption: toDisplayString(dp['simpl:encryption'], NA),
    anonymization: toDisplayString(dp['simpl:anonymization'], NA),
  };
}

/** `simpl:generalServiceProperties` (sh:order 4). */
function mapGeneralServiceSection(subject: Record<string, unknown>): GeneralServicePropertiesSection {
  const general = asRecord(subject['simpl:generalServiceProperties']) ?? {};
  return {
    name: toDisplayString(general['simpl:name'], NA),
    description: toDisplayString(general['simpl:description'], NA),
    serviceAccessPoint: typedValue(general['simpl:serviceAccessPoint']) || NA,
    keywords: normalizeArray(general['simpl:keywords'] as string | string[] | undefined).filter(k => !!k),
    inLanguage: toDisplayString(general['simpl:inLanguage'], NA),
    offeringType: toDisplayString(general['simpl:offeringType'], NA),
    sharingMethodId: toDisplayString(general['simpl:sharingMethodId'], NA),
  };
}

/** `simpl:assetProperties` (sh:order 5). */
function mapAssetPropertiesSection(subject: Record<string, unknown>): AssetPropertiesSection {
  const assetProps = asRecord(subject['simpl:assetProperties']) ?? {};
  return {
    providerDataAddress: toDisplayString(assetProps['simpl:providerDataAddress'], NA),
  };
}

/** `simpl:providerInformation` (sh:order 6). */
function mapProviderInformationSection(subject: Record<string, unknown>): ProviderInformationSection {
  const provider = asRecord(subject['simpl:providerInformation']) ?? {};
  return {
    providedBy: toDisplayString(provider['simpl:providedBy'], NA),
    contact: toDisplayString(provider['simpl:contact'], NA),
    signature: toDisplayString(provider['simpl:signature'], NA),
  };
}

/** `simpl:offeringPrice` (sh:order 7). */
function mapOfferingPriceSection(subject: Record<string, unknown>): OfferingPriceSection {
  const offeringPrice = asRecord(subject['simpl:offeringPrice']) ?? {};
  return {
    license: typedValue(asRecord(offeringPrice['simpl:license'])),
    currency: toDisplayString(offeringPrice['simpl:currency'], NA),
    price: typedValue(asRecord(offeringPrice['simpl:price'])),
    priceType: toDisplayString(offeringPrice['simpl:priceType'], NA),
  };
}

/** `simpl:servicePolicy` (sh:order 8), incluyendo el parseo de las políticas ODRL embebidas como JSON string. */
function mapServicePolicySection(subject: Record<string, unknown>): ServicePolicySection {
  const servicePolicy = asRecord(subject['simpl:servicePolicy']) ?? {};
  const accessPolicyRaw = toDisplayString(servicePolicy['simpl:access-policy'], '');
  const usagePolicyRaw = toDisplayString(servicePolicy['simpl:usage-policy'], '');
  return {
    accessPolicyRaw,
    usagePolicyRaw,
    dataProtectionRegime: toDisplayString(servicePolicy['simpl:dataProtectionRegime'], NA),
    accessPolicyRows: parseAccessPolicyRows(accessPolicyRaw),
    usagePolicyRows: parseUsagePolicyRows(usagePolicyRaw),
  };
}

/** `simpl:contractTemplate` (sh:order 9). */
function mapContractTemplateSection(subject: Record<string, unknown>): ContractTemplateSection {
  const contractTemplate = asRecord(subject['simpl:contractTemplate']) ?? {};
  return {
    document: toDisplayString(contractTemplate['simpl:contractTemplateDocument'], NA),
    hashAlg: toDisplayString(contractTemplate['simpl:contractTemplateHashAlg'], NA),
    hashValue: toDisplayString(contractTemplate['simpl:contractTemplateHashValue'], NA),
    url: toDisplayString(contractTemplate['simpl:contractTemplateURL'], NA),
  };
}

/** `simpl:edcRegistration` (sh:order 10, `hiddenInFrontend`). */
function mapEdcRegistrationSection(subject: Record<string, unknown>): EdcRegistrationSection {
  const edc = asRecord(subject['simpl:edcRegistration']) ?? {};
  return {
    assetId: toDisplayString(edc['simpl:assetId'], NA),
    contractDefinitionId: toDisplayString(edc['simpl:contractDefinitionId'], NA),
    servicePolicyId: toDisplayString(edc['simpl:servicePolicyId'], NA),
    accessPolicyId: toDisplayString(edc['simpl:accessPolicyId'], NA),
  };
}

/** `simpl:edcConnector` (sh:order 11, `hiddenInFrontend`). */
function mapEdcConnectorSection(subject: Record<string, unknown>): EdcConnectorSection {
  const edc = asRecord(subject['simpl:edcConnector']) ?? {};
  return {
    providerEndpointURL: toDisplayString(edc['simpl:providerEndpointURL'], NA),
  };
}

// ============================================================================
// 8. AUXILIARES ESPECÍFICOS DE OFERTA (asset type, versión de esquema…)
// ============================================================================

const SCHEMA_NAME_TO_ASSET_TYPE: Record<string, string> = {
  Model: 'mlmodel',
  'API REST': 'api',
  LCRSchema: 'lexicalconceptualresource',
};

/** Versión del esquema de la oferta desde `dct:conformsTo.dct:hasVersion` (nivel oferta, no `ms:Corpus`). */
function readConformsToVersion(subject: Record<string, unknown>): string {
  const conformsTo = asRecord(subject['dct:conformsTo']);
  return toDisplayString(conformsTo?.['dct:hasVersion'], NA);
}

/**
 * Asset type label aligned with Mis ofertas cards (`assetType` → e.g. `corpus`).
 * Derivado de `dct:conformsTo` (nivel oferta) o del `@id` cuando esté presente.
 */
function readAssetTypeLabelFromConformsTo(subject: Record<string, unknown>): string {
  const conformsTo = asRecord(subject['dct:conformsTo']);
  if (!conformsTo) {
    return NA;
  }

  const schemaName = toDisplayString(conformsTo['dct:schemaName'], NA);
  if (schemaName) {
    const mapped = SCHEMA_NAME_TO_ASSET_TYPE[schemaName];
    if (mapped) {
      return mapped;
    }
    const match = schemaName.match(/^(.+?)OfferingShape$/i);
    if (match?.[1]) {
      return formatAssetTypeLabel(match[1]);
    }
  }

  const conformsToId = toDisplayString(conformsTo['@id'], NA);
  if (conformsToId) {
    const segment = conformsToId.split('/').pop() ?? '';
    const prefix = segment.split('-')[0]?.trim();
    if (prefix) {
      return formatAssetTypeLabel(prefix);
    }
    if (segment.toLowerCase().includes('api')) {
      return 'api';
    }
    if (segment.toLowerCase().includes('lcr')) {
      return 'lexicalconceptualresource';
    }
    if (segment.toLowerCase().includes('model')) {
      return 'mlmodel';
    }
  }

  return NA;
}

/** Localiza el asset del activo (`edval:corpusAsset` / `modelAsset` / `apiAsset` / `lcrAsset`), según el tipo de oferta. */
function resolveOfferingAsset(subject: Record<string, unknown>): Record<string, unknown> {
  for (const key of ['edval:corpusAsset', 'edval:modelAsset', 'edval:apiAsset', 'edval:lcrAsset'] as const) {
    const asset = asRecord(subject[key]);
    if (asset) {
      return asset;
    }
  }
  return {};
}

function mapModelFunctionLabels(corpus: Record<string, unknown>): string[] {
  return mapIriLabels(corpus['ms:modelFunction'] ?? corpus['simpl:modelFunction']);
}

function mapModelProperties(corpus: Record<string, unknown>): ModelPropertiesVm | undefined {
  const typeIri = iriId(corpus['ms:modelType']);
  const modelType = typeIri ? iriLocalName(typeIri) : toDisplayString(corpus['ms:modelType'], NA);
  const variantOf =
    toDisplayString(corpus['simpl:variantOfModel'], NA) ||
    toDisplayString(corpus['ms:variantOf'], NA) ||
    langStringValue(corpus['ms:variantOf']) ||
    (iriId(corpus['ms:variantOf']) ? iriLocalName(iriId(corpus['ms:variantOf'])) : NA);
  const detailsUrl =
    typedValue(asRecord(corpus['ms:modelDetailsPage'])) ||
    toDisplayString(corpus['ms:modelDetailsPage'], NA) ||
    typedValue(asRecord(corpus['schema:url']));
  if ((!modelType || modelType === NA) && (!variantOf || variantOf === NA) && (!detailsUrl || detailsUrl === NA)) {
    return undefined;
  }
  return {
    modelType: modelType || NA,
    variantOf: variantOf || NA,
    detailsUrl: detailsUrl || NA,
  };
}

/** Trims sub-millisecond precision so `Date` parses reliably (e.g. `.009023252Z`). */
function normalizeIssuanceDateIso(raw: string): string {
  return raw.trim().replace(/(\.\d{3})\d+(?=[Zz]|$)/, '$1');
}

function readIssuanceDateIso(json: Record<string, unknown>): string {
  const raw = toDisplayString(json['issuanceDate'], NA);
  if (!raw) {
    return NA;
  }
  const parsed = new Date(normalizeIssuanceDateIso(raw));
  return Number.isNaN(parsed.getTime()) ? NA : parsed.toISOString();
}

// ============================================================================
// 9. PARSEO DE POLÍTICAS ODRL (simpl:access-policy / simpl:usage-policy)
// ============================================================================

function getFirstPermission(policy: Record<string, unknown>): Record<string, unknown> | undefined {
  const permissions = policy['permission'];
  if (!Array.isArray(permissions) || permissions.length === 0) {
    return undefined;
  }
  return asRecord(permissions[0]);
}

function isDateConstraint(value: unknown, operatorFragment: string): boolean {
  const record = asRecord(value);
  const leftOperand = toDisplayString(record?.['leftOperand'], '');
  const operator = toDisplayString(record?.['operator'], '');
  return leftOperand.includes('/dateTime') && operator.includes(operatorFragment);
}

function humanizeAction(action: string): string {
  if (action === 'http://simpl.eu/odrl/actions/consume') return 'Consume';
  if (action === 'http://www.w3.org/ns/odrl/2/use') return 'Restricted number of usages';
  return action;
}

function toArrayAsString(value: unknown, humanize = false): string {
  if (Array.isArray(value)) {
    const mapped = value.map(item => {
      const raw = toDisplayString(item);
      return humanize ? humanizeAction(raw) : raw;
    });
    return mapped.join(', ') || 'N/A';
  }
  const raw = toDisplayString(value);
  return humanize ? humanizeAction(raw) : raw;
}

function formatDateToSpanish(value: string): string {
  if (!value || value === 'N/A') return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

/** Extrae `assigner.uid` (participante que publica la política ODRL) de un `simpl:access-policy`/`simpl:usage-policy` JSON string. */
function parseAssignerUid(policyRaw: string): string {
  if (!policyRaw) return '';
  try {
    const parsed = JSON.parse(policyRaw) as Record<string, unknown>;
    const assigner = asRecord(parsed['assigner']);
    return toDisplayString(assigner?.['uid'], '');
  } catch {
    return '';
  }
}

function parseAccessPolicyRows(accessPolicyRaw: string): AccessPolicyRow[] {
  if (!accessPolicyRaw) return [];
  try {
    const parsed = JSON.parse(accessPolicyRaw) as Record<string, unknown>;
    const permission = getFirstPermission(parsed);
    const assignee = asRecord(permission?.['assignee']);
    const constraints = Array.isArray(permission?.['constraint']) ? (permission?.['constraint'] as unknown[]) : [];
    const dateFrom = constraints.find(item => isDateConstraint(item, 'gteq'));
    const dateTo = constraints.find(item => isDateConstraint(item, 'lteq'));

    return [
      {
        user: toDisplayString(assignee?.['uid']),
        actions: toArrayAsString(permission?.['action'], true),
        from: formatDateToSpanish(toDisplayString(asRecord(dateFrom)?.['rightOperand'])),
        to: formatDateToSpanish(toDisplayString(asRecord(dateTo)?.['rightOperand'])),
      },
    ];
  } catch {
    return [{ user: 'N/A', actions: 'N/A', from: 'N/A', to: 'N/A' }];
  }
}

function parseUsagePolicyRows(usagePolicyRaw: string): UsagePolicyRow[] {
  if (!usagePolicyRaw) return [];
  try {
    const parsed = JSON.parse(usagePolicyRaw) as Record<string, unknown>;
    const permission = getFirstPermission(parsed);
    const assignee = asRecord(permission?.['assignee']);
    const constraints = Array.isArray(permission?.['constraint']) ? (permission?.['constraint'] as unknown[]) : [];
    const countConstraint = constraints.find(item => {
      const record = asRecord(item);
      return toDisplayString(record?.['leftOperand'], '').includes('/count');
    });
    const maxUseCount = toDisplayString(asRecord(countConstraint)?.['rightOperand'], '');

    return [
      {
        user: toDisplayString(assignee?.['uid']),
        usageType: toArrayAsString(permission?.['action'], true),
        constraint: maxUseCount || 'N/A',
      },
    ];
  } catch {
    return [{ user: 'N/A', usageType: 'N/A', constraint: 'N/A' }];
  }
}

// ============================================================================
// 10. IDENTIFICADORES / DOCUMENTOS / TITULARES A NIVEL DE OFERTA
//     (compatibilidad con bindings existentes `relatedDocuments`/`provenanceBlocks`)
// ============================================================================

function toRelatedDocumentVm(doc: DocumentVm, identifier?: IdentifierVm): RelatedDocumentVm {
  return {
    citationText: doc.citationText,
    referenceUrl: identifier?.isUrl ? identifier.notation : NA,
    agency: identifier?.agency || NA,
  };
}

function toProvenanceBlockVm(org: OrganizationVm, kind: ProvenanceBlockKind): ProvenanceBlockVm {
  const identifier = org.identifiers[0];
  return {
    kind,
    displayName: org.name,
    referenceUrl: identifier?.isUrl ? identifier.notation : NA,
    agency: identifier?.agency || NA,
  };
}

// ============================================================================
// 11. FUNCIÓN PRINCIPAL
// ============================================================================

export function mapCorpusOfferingSelfDescription(json: Record<string, unknown>): OfferSelfDescriptionDetailViewModel {
  const subject = resolveSubject(json);
  const corpus = resolveOfferingAsset(subject);

  const publicNode = asRecord(subject['edval:isPublicOffering']);
  const isPublicOffering = publicNode?.['@value'] === true || publicNode?.['@value'] === 'true';

  const conformsTo = asRecord(subject['dct:conformsTo']);
  const conformsToTitle = toDisplayString(conformsTo?.['dct:title'], NA);

  // ── Secciones ────────────────────────────────────────────────────────────
  const dataProperties = mapDataPropertiesSection(subject);
  const generalService = mapGeneralServiceSection(subject);
  const assetProperties = mapAssetPropertiesSection(subject);
  const providerInformation = mapProviderInformationSection(subject);
  const offeringPrice = mapOfferingPriceSection(subject);
  const servicePolicy = mapServicePolicySection(subject);
  const contractTemplate = mapContractTemplateSection(subject);
  const edcRegistration = mapEdcRegistrationSection(subject);
  const edcConnector = mapEdcConnectorSection(subject);
  const corpusSection = mapCorpusSection({ ...corpus, __simplDataProperties: dataProperties });

  const sections: OfferSelfDescriptionSections = {
    corpus: corpusSection,
    dataProperties,
    generalService,
    assetProperties,
    providerInformation,
    offeringPrice,
    servicePolicy,
    contractTemplate,
    edcRegistration,
    edcConnector,
  };

  // ── Título / descripción con fallback general → corpus ──────────────────
  const title = generalService.name || corpusSection.basicInfo.title || toDisplayString(json['@id'], NA);
  const description = generalService.description || corpusSection.basicInfo.description || NA;

  // ── Documentos / titulares (compatibilidad con bindings planos) ─────────
  const identifiersForDocs = mapIdentifiers(corpus['ms:isDocumentedBy']); // normalmente ausente; sólo por robustez
  const relatedDocuments = corpusSection.documentation.map((doc, i) => toRelatedDocumentVm(doc, identifiersForDocs[i]));
  const legacyCitation = relatedDocuments.length > 0 ? relatedDocuments[0].citationText : NA;

  const provenanceBlocks = corpusSection.iprHolders.map(org => toProvenanceBlockVm(org, 'ipRightsHolder'));

  const publisherIdentifier: PublisherIdentifierVm | undefined = corpusSection.publisher?.identifiers[0]
    ? {
        agency: corpusSection.publisher.identifiers[0].agency,
        notation: corpusSection.publisher.identifiers[0].notation,
      }
    : undefined;

  const corpusLicense: CorpusLicenseVm | undefined = corpusSection.license
    ? {
        url: corpusSection.license.legalCode,
        title: corpusSection.license.title,
        description: corpusSection.license.description,
      }
    : undefined;

  const corpusPrimaryIdentifier: SelfDescriptionIdentifier | undefined = corpusSection.identification.identifiers[0]
    ? {
        referenceUrl: corpusSection.identification.identifiers[0].isUrl
          ? corpusSection.identification.identifiers[0].notation
          : NA,
        agency: corpusSection.identification.identifiers[0].agency || NA,
      }
    : undefined;

  const firstSize = corpusSection.distribution.sizes[0];

  const assignerLabel =
    parseAssignerUid(servicePolicy.accessPolicyRaw) || parseAssignerUid(servicePolicy.usagePolicyRaw);

  return {
    documentId: typeof json['@id'] === 'string' ? (json['@id'] as string) : NA,
    title,
    providerLabel: assignerLabel || providerInformation.providedBy,
    offeringTypeLabel: readAssetTypeLabelFromConformsTo(subject) || formatAssetTypeLabel(generalService.offeringType),
    version: readConformsToVersion(subject) || corpusSection.basicInfo.version,
    isPublicOffering,
    description,
    keywords: corpusSection.basicInfo.keywords,
    mediaTypeLabels: corpusSection.basicInfo.mediaTypes,
    lingualityLabel: corpusSection.basicInfo.lingualityType,
    modelFunctionLabels: mapModelFunctionLabels(corpus),
    personalDataLabel: corpusSection.dataProtection.personalDataIncluded,
    sensitiveDataLabel: corpusSection.dataProtection.sensitiveDataIncluded,
    anonymizedLabel: corpusSection.dataProtection.anonymized,
    licenseUrl: offeringPrice.license,
    priceAmount: offeringPrice.price,
    priceCurrency: offeringPrice.currency,
    priceType: offeringPrice.priceType,
    contractTemplateUrl: contractTemplate.url,
    usagePolicyRaw: servicePolicy.usagePolicyRaw,
    issuanceDateIso: readIssuanceDateIso(json),
    byteSize: corpusSection.distribution.byteSize,
    packageFormat: corpusSection.distribution.packageFormat,
    fileFormatLabels: corpusSection.distribution.formats,
    sizeAmount: firstSize?.amount ?? NA,
    sizeUnit: firstSize?.unit ?? NA,
    citationText: legacyCitation,
    languages: corpusSection.languages,
    corpusPrimaryIdentifier,
    corpusIdentifiers: corpusSection.identification.identifiers,
    relatedDocuments,
    provenanceBlocks,
    modelProperties: mapModelProperties(corpus),

    conformsToTitle,
    alternativeTitle: corpusSection.identification.alternativeTitle,
    publisherName: corpusSection.publisher?.name ?? NA,
    publisherIdentifier,
    corpusLicense,
    anonymizationDetails: corpusSection.dataProtection.anonymizationDetails,
    personalDataDetails: corpusSection.dataProtection.personalDataDetails,
    sensitiveDataDetails: corpusSection.dataProtection.sensitiveDataDetails,
    originalSourceDescription: corpusSection.dataProtection.originalSourceDescription,
    domain: corpusSection.classification.domain,
    corpusSubclass: corpusSection.classification.corpusSubclass,
    lrType: corpusSection.basicInfo.lrType,
    annotationType: corpusSection.classification.annotationTypes[0] ?? NA,
    dataProtectionPrinciple: corpusSection.dataProtection.dataProtectionPrinciples[0] ?? NA,
    technicalMeasure: corpusSection.dataProtection.technicalMeasures[0] ?? NA,
    standardsConformance: corpusSection.classification.standardsConformance,
    sourceLanguages: corpusSection.sourceLanguages,
    targetLanguages: corpusSection.targetLanguages,
    pivotLanguages: corpusSection.pivotLanguages,
    providerContact: providerInformation.contact,
    sharingMethod: generalService.sharingMethodId,
    serviceAccessPoint: generalService.serviceAccessPoint,
    dataQuality: dataProperties.dataQuality,
    encryption: dataProperties.encryption,
    contractTemplateDoc: contractTemplate.document,

    accessPolicyRows: servicePolicy.accessPolicyRows,
    usagePolicyRows: servicePolicy.usagePolicyRows,

    sections,
  };
}
