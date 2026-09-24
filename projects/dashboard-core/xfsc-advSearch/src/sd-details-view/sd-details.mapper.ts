import type { SelfDescriptorModel } from '../models/self-descriptor.model';
export function stripCuriePrefix(value: string): string {
  return value.replace(/^[a-zA-Z0-9]+:/, '').trim();
}

// ── Tipos compartidos ──────────────────────────────────────────────────────────

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

export interface SdRelatedDocumentVm {
  citationText: string;
  referenceUrl: string;
  agency: string;
}

export type SdProvenanceBlockKind = 'originalSource' | 'ipRightsHolder';

export interface SdProvenanceBlockVm {
  kind: SdProvenanceBlockKind;
  icon: string;
  kindLabel: string;
  displayName: string;
  referenceUrl: string;
  agency: string;
}

export interface SdLanguageRow {
  regionCode: string;
  regionDisplay: string;
  varietyLine: string;
  hasDisplayContent: boolean;
  regionLabel: string; // @deprecated
}

// ── Tipos para los campos extendidos (alineados con corpus) ──────────────

export interface SelfDescriptionIdentifier {
  referenceUrl: string;
  agency: string;
}

export interface PublisherIdentifierVm {
  agency: string;
  notation: string;
}

export interface CorpusLicenseVm {
  url: string;
  title: string;
  description: string;
}

export interface ModelPropertiesVm {
  modelType: string;
  variantOf: string;
  detailsUrl: string;
}

// ── ViewModel principal ──────────────────────────────────────────────────────

export interface SdDetailsSections {
  offerPrice: string;
  offerPriceType: string;
  policySummary: string;
  hasUsagePolicy: boolean;
  dctDescription: string;
  dctHasVersion: string;
  dctTitle: string;
  contractTemplateDocument: string;
  contractTemplateHashAlg: string;
  contractTemplateHashValue: string;
  contractTemplateUrl: string;
  dataFormat: string;
  providerEndpointUrl: string;
  accessPolicyId: string;
  assetId: string;
  contractDefinitionId: string;
  servicePolicyId: string;
  generalDescription: string;
  generalInLanguage: string;
  generalKeywords: string;
  generalName: string;
  generalOfferingType: string;
  generalServiceAccessPoint: string;
  generalSharingMethodId: string;
  offeringCurrency: string;
  offeringLicense: string;
  offeringPrice: string;
  offeringPriceType: string;
  providerContact: string;
  providerProvidedBy: string;
  providerSignature: string;
  licenseUrl: string;
  accessPolicyRows: AccessPolicyRow[];
  usagePolicyRows: UsagePolicyRow[];
  // ── Campos extraídos del asset ──────────────────────────────────────────
  keywords: string[];
  mediaTypeLabels: string[];
  lingualityLabel: string;
  modelFunctionLabels: string[];
  personalDataLabel: string;
  sensitiveDataLabel: string;
  anonymizedLabel: string;
  citationText: string;
  relatedDocuments: SdRelatedDocumentVm[];
  provenanceBlocks: SdProvenanceBlockVm[];
  byteSize: string;
  packageFormat: string;
  fileFormatLabels: string[];
  sizeAmount: string;
  sizeUnit: string;
  documentId: string;
  languages: SdLanguageRow[];
  //---- nuevos campos esctaidos de corpus

  // ── Nuevos campos extraídos de corpus-offering ──────────────────────
  version: string;
  isPublicOffering: boolean;
  usagePolicyRaw: string; // JSON raw de usage-policy (coexistirá con usagePolicyRows)
  issuanceDateIso: string; // fecha de emisión del VC
  corpusPrimaryIdentifier?: SelfDescriptionIdentifier;
  modelProperties?: ModelPropertiesVm;
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
  annotationType: string;
  dataProtectionPrinciple: string;
  technicalMeasure: string;
  sourceLanguages: SdLanguageRow[];
  targetLanguages: SdLanguageRow[];
  pivotLanguages: SdLanguageRow[];
  dataQuality: string;
  encryption: string;
  contractTemplateDoc: string;
}

const NOT_AVAILABLE = 'N/A';
const NA = '';

export function createEmptySdDetailsSections(): SdDetailsSections {
  return {
    offerPrice: NOT_AVAILABLE,
    offerPriceType: NOT_AVAILABLE,
    policySummary: '',
    hasUsagePolicy: false,
    dctDescription: NOT_AVAILABLE,
    dctHasVersion: NOT_AVAILABLE,
    dctTitle: NOT_AVAILABLE,
    contractTemplateDocument: NOT_AVAILABLE,
    contractTemplateHashAlg: NOT_AVAILABLE,
    contractTemplateHashValue: NOT_AVAILABLE,
    contractTemplateUrl: NOT_AVAILABLE,
    dataFormat: NOT_AVAILABLE,
    providerEndpointUrl: NOT_AVAILABLE,
    accessPolicyId: NOT_AVAILABLE,
    assetId: NOT_AVAILABLE,
    contractDefinitionId: NOT_AVAILABLE,
    servicePolicyId: NOT_AVAILABLE,
    generalDescription: NOT_AVAILABLE,
    generalInLanguage: NOT_AVAILABLE,
    generalKeywords: NOT_AVAILABLE,
    generalName: NOT_AVAILABLE,
    generalOfferingType: NOT_AVAILABLE,
    generalServiceAccessPoint: NOT_AVAILABLE,
    generalSharingMethodId: NOT_AVAILABLE,
    offeringCurrency: NOT_AVAILABLE,
    offeringLicense: NOT_AVAILABLE,
    offeringPrice: NOT_AVAILABLE,
    offeringPriceType: NOT_AVAILABLE,
    providerContact: NOT_AVAILABLE,
    providerProvidedBy: NOT_AVAILABLE,
    providerSignature: NOT_AVAILABLE,
    licenseUrl: NOT_AVAILABLE,
    accessPolicyRows: [],
    usagePolicyRows: [],
    keywords: [],
    mediaTypeLabels: [],
    lingualityLabel: NA,
    modelFunctionLabels: [],
    personalDataLabel: NA,
    sensitiveDataLabel: NA,
    anonymizedLabel: NA,
    citationText: NA,
    relatedDocuments: [],
    provenanceBlocks: [],
    byteSize: NA,
    packageFormat: NA,
    fileFormatLabels: [],
    sizeAmount: NA,
    sizeUnit: NA,
    documentId: NA,
    languages: [],
    // ── Nuevos campos ──────────────────────────────────────────────────
    version: NA,
    isPublicOffering: false,
    usagePolicyRaw: '',
    issuanceDateIso: NA,
    corpusPrimaryIdentifier: undefined,
    modelProperties: undefined,
    alternativeTitle: NA,
    publisherName: NA,
    publisherIdentifier: undefined,
    corpusLicense: undefined,
    anonymizationDetails: NA,
    personalDataDetails: NA,
    sensitiveDataDetails: NA,
    originalSourceDescription: NA,
    domain: NA,
    corpusSubclass: NA,
    lrType: NA,
    annotationType: NA,
    dataProtectionPrinciple: NA,
    technicalMeasure: NA,
    sourceLanguages: [],
    targetLanguages: [],
    pivotLanguages: [],
    dataQuality: NA,
    encryption: NA,
    contractTemplateDoc: NA,
  };
}

// ── Funciones auxiliares (sin duplicar) ─────────────────────────────────────

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function normalizeArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function iriId(node: unknown): string {
  const r = asRecord(node);
  if (!r) return NA;
  const id = r['@id'];
  return typeof id === 'string' ? id : NA;
}

function iriLocalName(iri: string): string {
  if (!iri) return NA;
  const hash = iri.lastIndexOf('#');
  const slash = iri.lastIndexOf('/');
  const raw = hash >= 0 ? iri.slice(hash + 1) : slash >= 0 ? iri.slice(slash + 1) : iri;
  return stripCuriePrefix(raw);
}

function typedValue(node: unknown): string {
  const r = asRecord(node);
  if (r && '@value' in r) return toDisplayValue(r['@value'], NA);
  return NA;
}

function langStringValue(node: unknown): string {
  if (typeof node === 'string') return node;
  const r = asRecord(node);
  if (r && '@value' in r) return toDisplayValue(r['@value'], NA);
  return NA;
}

function toDisplayValue(value: unknown, fallback = NOT_AVAILABLE): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value.trim().length ? value : fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

function nonZeroString(val: string): string {
  return val && val !== '0' ? val : NA;
}

function msFlagLabel(iri: string): string {
  const tail = iriLocalName(iri).toLowerCase();
  if (tail.startsWith('yes')) return 'yes';
  if (tail.startsWith('no')) return 'no';
  if (tail.includes('unknown') || tail === 'unk') return 'unknown';
  return iriLocalName(iri);
}

// ── Extracción del asset ────────────────────────────────────────────────────

function resolveOfferingAsset(subject: Record<string, unknown>): Record<string, unknown> {
  for (const key of ['edval:corpusAsset', 'edval:modelAsset', 'edval:apiAsset', 'edval:lcrAsset'] as const) {
    const asset = asRecord(subject[key]);
    if (asset) {
      return asset;
    }
  }
  return {};
}

// ── Extracción de identificadores (reutilizable) ──────────────────────────

function extractIdentifierParts(node: unknown): { referenceUrl: string; agency: string } {
  if (typeof node === 'string' && node.trim().startsWith('http')) {
    return { referenceUrl: node.trim(), agency: NA };
  }
  const r = asRecord(node);
  if (!r) return { referenceUrl: NA, agency: NA };
  const directLiteral = typedValue(r);
  if (directLiteral && directLiteral !== NA && /^https?:\/\//i.test(directLiteral)) {
    return {
      referenceUrl: directLiteral,
      agency:
        toDisplayValue(r['simpl:registrationAgency'], NA) ||
        toDisplayValue(r['ms:registrationAgency'], NA) ||
        toDisplayValue(r['skos:notation'], NA) ||
        (asRecord(r['adms:scheme']) ? iriLocalName(iriId(asRecord(r['adms:scheme']))) : NA),
    };
  }
  const fromSchemaUrl = typedValue(asRecord(r['schema:url']));
  const fromDctId = typedValue(asRecord(r['dct:identifier']));
  const fromId =
    typeof r['@id'] === 'string' && (r['@id'] as string).startsWith('http') ? (r['@id'] as string).trim() : NA;
  const referenceUrl = fromSchemaUrl || fromDctId || fromId || NA;
  const agency =
    toDisplayValue(r['simpl:registrationAgency'], NA) ||
    toDisplayValue(r['ms:registrationAgency'], NA) ||
    toDisplayValue(r['skos:notation'], NA) ||
    (asRecord(r['adms:scheme']) ? iriLocalName(iriId(asRecord(r['adms:scheme']))) : NA);
  return { referenceUrl, agency };
}

// ── Mapeo de documentos relacionados ──────────────────────────────────────

function mapRelatedDocuments(asset: Record<string, unknown>): SdRelatedDocumentVm[] {
  const raw = asset['ms:isDocumentedBy'];
  const nodes = normalizeArray(raw);
  const out: SdRelatedDocumentVm[] = [];
  for (const node of nodes) {
    const d = asRecord(node) ?? {};
    const citation = langStringValue(d['ms:citationText']);
    if (!citation) continue;
    const idParts = extractIdentifierParts(d['ms:identifier'] ?? d['dct:identifier']);
    const agency = idParts.agency !== NA ? idParts.agency : toDisplayValue(d['simpl:registrationAgency'], NA);
    out.push({
      citationText: citation,
      referenceUrl: idParts.referenceUrl !== NA ? idParts.referenceUrl : NA,
      agency: agency !== NA ? agency : NA,
    });
  }
  return out;
}

// ── Mapeo de bloques de procedencia (desde subject, no asset) ────────────

const PROVENANCE_KIND_META: Record<SdProvenanceBlockKind, { icon: string; kindLabel: string }> = {
  originalSource: { icon: 'source', kindLabel: 'assets.detail.originalSource' },
  ipRightsHolder: { icon: 'gavel', kindLabel: 'assets.detail.ipRightsHolder' },
};

function displayNameFromProvenanceNode(r: Record<string, unknown>): string {
  return (
    toDisplayValue(r['simpl:displayName'], NA) ||
    toDisplayValue(r['simpl:name'], NA) ||
    toDisplayValue(r['simpl:providedBy'], NA) ||
    langStringValue(r['foaf:name']) ||
    langStringValue(r['schema:name']) ||
    (iriId(r) ? iriLocalName(iriId(r)) : NA)
  );
}

function mapProvenanceBlocks(subject: Record<string, unknown>): SdProvenanceBlockVm[] {
  const blocks: SdProvenanceBlockVm[] = [];

  const addBlock = (node: unknown, kind: SdProvenanceBlockKind): void => {
    const r = asRecord(node);
    if (!r) return;
    const name = displayNameFromProvenanceNode(r);
    if (!name || name === NA) return;
    const idParts = extractIdentifierParts(r['ms:identifier'] ?? r['dct:identifier']);
    const agency = idParts.agency !== NA ? idParts.agency : toDisplayValue(r['simpl:registrationAgency'], NA);
    const meta = PROVENANCE_KIND_META[kind];
    blocks.push({
      kind,
      icon: meta.icon,
      kindLabel: meta.kindLabel,
      displayName: name,
      referenceUrl: idParts.referenceUrl,
      agency,
    });
  };

  for (const node of normalizeArray(subject['ms:originalSource'])) {
    addBlock(node, 'originalSource');
  }
  const holders = subject['ms:ipRightsHolder'] ?? subject['ms:intellectualPropertyRightsHolder'];
  for (const node of normalizeArray(holders)) {
    addBlock(node, 'ipRightsHolder');
  }

  return blocks;
}

// ── Mapeo de etiquetas de función de modelo ──────────────────────────────

function mapModelFunctionLabels(subject: Record<string, unknown>): string[] {
  const raw = subject['ms:modelFunction'] ?? subject['simpl:modelFunction'];
  const nodes = normalizeArray(raw);
  const labels: string[] = [];
  for (const n of nodes) {
    const s = langStringValue(n) || (iriId(n) ? iriLocalName(iriId(n)) : toDisplayValue(n, NA));
    if (s && s !== NA) labels.push(s);
  }
  return labels;
}

// ── Mapeo de lenguajes (desde asset) ──────────────────────────────────────

function mapLanguages(asset: Record<string, unknown>): SdLanguageRow[] {
  const langNodes = normalizeArray(asset['ms:language']);
  return langNodes.map(mapLanguageNode);
}
// ── Mapeo de nodos de idioma (reutilizable) ──────────────────────────────

function mapLanguageNode(node: unknown): SdLanguageRow {
  const lang = asRecord(node) ?? {};
  const languageCodeIri = iriId(lang['ms:languageCode']);
  const mapped = mapLanguageNodeFields({
    regionIri: iriId(lang['ms:region']),
    languageCodeIri,
    languageVarietyName: toDisplayValue(lang['ms:languageVarietyName'], NA) || undefined,
    languageTag: toDisplayValue(lang['ms:languageTag'], NA) || undefined,
    variantIri: iriId(lang['ms:variant']),
  });
  // Fallback a código si no hay contenido displayable
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
// ── Parseo de políticas de acceso/uso ─────────────────────────────────────

function parseAccessPolicyRows(accessPolicyRaw: string): AccessPolicyRow[] {
  if (!accessPolicyRaw) return [];

  try {
    const parsed = JSON.parse(accessPolicyRaw) as Record<string, unknown>;
    const permission = getFirstPermission(parsed);
    const assignee = asRecord(permission?.['assignee']);
    const constraints = Array.isArray(permission?.['constraint']) ? permission?.['constraint'] : [];
    const dateFrom = constraints.find(item => isDateConstraint(item, 'gteq'));
    const dateTo = constraints.find(item => isDateConstraint(item, 'lteq'));

    return [
      {
        user: toDisplayValue(assignee?.['uid']),
        actions: toArrayAsString(permission?.['action'], true),
        from: formatDateToSpanish(toDisplayValue(asRecord(dateFrom)?.['rightOperand'])),
        to: formatDateToSpanish(toDisplayValue(asRecord(dateTo)?.['rightOperand'])),
      },
    ];
  } catch {
    return [{ user: NOT_AVAILABLE, actions: NOT_AVAILABLE, from: NOT_AVAILABLE, to: NOT_AVAILABLE }];
  }
}

function parseUsagePolicyRows(usagePolicyRaw: string): {
  hasUsagePolicy: boolean;
  policySummary: string;
  rows: UsagePolicyRow[];
} {
  if (!usagePolicyRaw) {
    return { hasUsagePolicy: false, policySummary: '', rows: [] };
  }

  try {
    const parsed = JSON.parse(usagePolicyRaw) as Record<string, unknown>;
    const permission = getFirstPermission(parsed);
    const assignee = asRecord(permission?.['assignee']);
    const constraints = Array.isArray(permission?.['constraint']) ? permission?.['constraint'] : [];
    const countConstraint = constraints.find(item => {
      const record = asRecord(item);
      return toDisplayValue(record?.['leftOperand'], '').includes('/count');
    });
    const maxUseCount = toDisplayValue(asRecord(countConstraint)?.['rightOperand'], '');

    return {
      hasUsagePolicy: true,
      policySummary: maxUseCount,
      rows: [
        {
          user: toDisplayValue(assignee?.['uid']),
          usageType: toArrayAsString(permission?.['action'], true),
          constraint: maxUseCount || NOT_AVAILABLE,
        },
      ],
    };
  } catch {
    return {
      hasUsagePolicy: false,
      policySummary: '',
      rows: [{ user: NOT_AVAILABLE, usageType: NOT_AVAILABLE, constraint: NOT_AVAILABLE }],
    };
  }
}

function getFirstPermission(policy: Record<string, unknown>): Record<string, unknown> | undefined {
  const permissions = policy['permission'];
  if (!Array.isArray(permissions) || permissions.length === 0) return undefined;
  return asRecord(permissions[0]);
}

function isDateConstraint(value: unknown, operatorFragment: string): boolean {
  const record = asRecord(value);
  const leftOperand = toDisplayValue(record?.['leftOperand'], '');
  const operator = toDisplayValue(record?.['operator'], '');
  return leftOperand.includes('/dateTime') && operator.includes(operatorFragment);
}

function toArrayAsString(value: unknown, humanize = false): string {
  if (Array.isArray(value)) {
    const mapped = value.map(item => {
      const raw = toDisplayValue(item);
      return humanize ? humanizeAction(raw) : raw;
    });
    return mapped.join(', ') || NOT_AVAILABLE;
  }
  const raw = toDisplayValue(value);
  return humanize ? humanizeAction(raw) : raw;
}

function humanizeAction(action: string): string {
  if (action === 'http://simpl.eu/odrl/actions/consume') return 'Consume';
  if (action === 'http://www.w3.org/ns/odrl/2/use') return 'Restricted number of usages';
  return action;
}

function formatDateToSpanish(value: string): string {
  if (!value || value === NOT_AVAILABLE) return NOT_AVAILABLE;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

// ── Mapeo principal ─────────────────────────────────────────────────────────

export function mapSdDetailsSections(content: Record<string, unknown>): SdDetailsSections {
  const sections = createEmptySdDetailsSections();
  const credentialSubject = asRecord(content['credentialSubject']);
  if (!credentialSubject) {
    return sections;
  }

  const subject = credentialSubject;
  const asset = resolveOfferingAsset(subject);

  // ── Fecha de emisión (desde el root del VC) ──────────────────────────
  function normalizeIssuanceDateIso(raw: string): string {
    return raw.trim().replace(/(\.\d{3})\d+(?=[Zz]|$)/, '$1');
  }

  function readIssuanceDateIso(json: Record<string, unknown>): string {
    const raw = toDisplayValue(json['issuanceDate'], NA);
    if (!raw || raw === NA) return NA;
    const normalized = normalizeIssuanceDateIso(raw);
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? NA : parsed.toISOString();
  }
  // ── Campos del subject ──────────────────────────────────────────────────

  const dctConformsTo = asRecord(subject['dct:conformsTo']);
  const contractTemplate = asRecord(subject['simpl:contractTemplate']);
  const dataProperties = asRecord(subject['simpl:dataProperties']);
  const edcConnector = asRecord(subject['simpl:edcConnector']);
  const edcRegistration = asRecord(subject['simpl:edcRegistration']);
  const generalServiceProperties = asRecord(subject['simpl:generalServiceProperties']);
  const offeringPrice = asRecord(subject['simpl:offeringPrice']);
  const providerInformation = asRecord(subject['simpl:providerInformation']);
  const servicePolicy = asRecord(subject['simpl:servicePolicy']);

  const priceNode = asRecord(offeringPrice?.['simpl:price']);
  const licenseNode = asRecord(offeringPrice?.['simpl:license']);
  const serviceAccessPointNode = asRecord(generalServiceProperties?.['simpl:serviceAccessPoint']);

  sections.offerPrice =
    `${toDisplayValue(priceNode?.['@value'])} ${toDisplayValue(offeringPrice?.['simpl:currency'])}`.trim();
  sections.offerPriceType = toDisplayValue(offeringPrice?.['simpl:priceType']);

  sections.dctDescription = toDisplayValue(dctConformsTo?.['dct:description']);
  sections.dctHasVersion = toDisplayValue(dctConformsTo?.['dct:hasVersion']);
  sections.dctTitle = toDisplayValue(dctConformsTo?.['dct:title']);

  sections.contractTemplateDocument = toDisplayValue(contractTemplate?.['simpl:contractTemplateDocument']);
  sections.contractTemplateHashAlg = toDisplayValue(contractTemplate?.['simpl:contractTemplateHashAlg']);
  sections.contractTemplateHashValue = toDisplayValue(contractTemplate?.['simpl:contractTemplateHashValue']);
  sections.contractTemplateUrl = toDisplayValue(contractTemplate?.['simpl:contractTemplateURL']);

  sections.dataFormat = toDisplayValue(dataProperties?.['simpl:format']);
  sections.providerEndpointUrl = toDisplayValue(edcConnector?.['simpl:providerEndpointURL']);

  sections.accessPolicyId = toDisplayValue(edcRegistration?.['simpl:accessPolicyId']);
  sections.assetId = toDisplayValue(edcRegistration?.['simpl:assetId']);
  sections.contractDefinitionId = toDisplayValue(edcRegistration?.['simpl:contractDefinitionId']);
  sections.servicePolicyId = toDisplayValue(edcRegistration?.['simpl:servicePolicyId']);

  sections.generalDescription = toDisplayValue(generalServiceProperties?.['simpl:description']);
  sections.generalInLanguage = toDisplayValue(generalServiceProperties?.['simpl:inLanguage']);
  sections.generalKeywords = toDisplayValue(generalServiceProperties?.['simpl:keywords']);
  sections.generalName = toDisplayValue(generalServiceProperties?.['simpl:name']);
  sections.generalOfferingType = toDisplayValue(generalServiceProperties?.['simpl:offeringType']);
  sections.generalServiceAccessPoint = toDisplayValue(serviceAccessPointNode?.['@value']);
  sections.generalSharingMethodId = toDisplayValue(generalServiceProperties?.['simpl:sharingMethodId']);

  sections.offeringCurrency = toDisplayValue(offeringPrice?.['simpl:currency']);
  sections.offeringLicense = toDisplayValue(licenseNode?.['@value']);
  sections.offeringPrice = toDisplayValue(priceNode?.['@value']);
  sections.offeringPriceType = toDisplayValue(offeringPrice?.['simpl:priceType']);

  sections.providerContact = toDisplayValue(providerInformation?.['simpl:contact']);
  sections.providerProvidedBy = toDisplayValue(providerInformation?.['simpl:providedBy']);
  sections.providerSignature = toDisplayValue(providerInformation?.['simpl:signature']);
  sections.licenseUrl = toDisplayValue(licenseNode?.['@value']);

  const accessPolicyRaw = toDisplayValue(servicePolicy?.['simpl:access-policy'], '');
  const usagePolicyRaw = toDisplayValue(servicePolicy?.['simpl:usage-policy'], '');
  sections.accessPolicyRows = parseAccessPolicyRows(accessPolicyRaw);
  const usagePolicy = parseUsagePolicyRows(usagePolicyRaw);
  sections.usagePolicyRows = usagePolicy.rows;
  sections.hasUsagePolicy = usagePolicy.hasUsagePolicy;
  sections.policySummary = usagePolicy.policySummary;

  sections.documentId = typeof content['@id'] === 'string' ? (content['@id'] as string) : NA;
  sections.issuanceDateIso = readIssuanceDateIso(content);
  // ── Campos del asset ─────────────────────────────────────────────────────

  // Keywords (de asset)
  const keywordsRaw = asset['dcat:keyword'];
  if (Array.isArray(keywordsRaw)) {
    sections.keywords = keywordsRaw.map(k => langStringValue(k)).filter(Boolean);
  } else if (typeof keywordsRaw === 'string' && keywordsRaw.trim()) {
    sections.keywords = keywordsRaw
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);
  }

  // Media types
  const mediaNodes = normalizeArray(asset['ms:mediaType']);
  sections.mediaTypeLabels = mediaNodes.map(n => iriLocalName(iriId(n))).filter(s => s.length > 0);

  // Linguality
  const lingualityIri = iriId(asset['ms:lingualityType']);
  sections.lingualityLabel = lingualityIri ? iriLocalName(lingualityIri) : NA;

  // Model functions
  sections.modelFunctionLabels = mapModelFunctionLabels(asset);

  // Data protection flags
  const personalIri = iriId(asset['ms:personalDataIncluded']);
  const sensitiveIri = iriId(asset['ms:sensitiveDataIncluded']);
  const anonymIri = iriId(asset['ms:anonymized']);
  sections.personalDataLabel = personalIri ? msFlagLabel(personalIri) : NA;
  sections.sensitiveDataLabel = sensitiveIri ? msFlagLabel(sensitiveIri) : NA;
  sections.anonymizedLabel = anonymIri ? msFlagLabel(anonymIri) : NA;

  // Related documents
  sections.relatedDocuments = mapRelatedDocuments(asset);
  const legacyDoc = asRecord(asset['ms:isDocumentedBy']);
  const legacyCitation =
    legacyDoc && !Array.isArray(asset['ms:isDocumentedBy']) ? langStringValue(legacyDoc['ms:citationText']) : NA;
  sections.citationText =
    sections.relatedDocuments.length > 0 ? sections.relatedDocuments[0].citationText : legacyCitation || NA;

  // Languages (¡aquí es donde se poblaba el array!)
  sections.languages = mapLanguages(asset);
  // ── Campos extra del asset (alineados con corpus) ─────────────────────

  // version
  sections.version = sections.dctHasVersion !== NA ? sections.dctHasVersion : toDisplayValue(asset['dcat:version'], NA);

  // isPublicOffering
  const publicNode = asRecord(subject['edval:isPublicOffering']);
  const publicVal = publicNode?.['@value'];
  sections.isPublicOffering = publicVal === true || publicVal === 'true';

  // usagePolicyRaw (raw JSON de usage-policy)
  const servicePolicyRaw = asRecord(subject['simpl:servicePolicy']);
  if (servicePolicyRaw) {
    const raw = servicePolicyRaw['simpl:usage-policy'];
    if (typeof raw === 'string' && raw.trim().length > 0) {
      sections.usagePolicyRaw = raw.trim();
    } else if (raw && typeof raw === 'object') {
      try {
        sections.usagePolicyRaw = JSON.stringify(raw);
      } catch {
        sections.usagePolicyRaw = NA;
      }
    }
  }

  // corpusPrimaryIdentifier (dct:identifier / adms:identifier del asset)
  const idNode = asset['dct:identifier'] ?? asset['adms:identifier'];
  const primaryIdParts = extractIdentifierParts(idNode);
  if (primaryIdParts.referenceUrl && primaryIdParts.referenceUrl !== NA) {
    sections.corpusPrimaryIdentifier = {
      referenceUrl: primaryIdParts.referenceUrl,
      agency: primaryIdParts.agency !== NA ? primaryIdParts.agency : NA,
    };
  }

  // modelProperties
  const typeIri = iriId(asset['ms:modelType']);
  const modelType = typeIri ? iriLocalName(typeIri) : toDisplayValue(asset['ms:modelType'], NA);
  const variantOf =
    toDisplayValue(asset['simpl:variantOfModel'], NA) ||
    toDisplayValue(asset['ms:variantOf'], NA) ||
    langStringValue(asset['ms:variantOf']) ||
    (iriId(asset['ms:variantOf']) ? iriLocalName(iriId(asset['ms:variantOf'])) : NA);
  const detailsUrl =
    typedValue(asRecord(asset['ms:modelDetailsPage'])) ||
    toDisplayValue(asset['ms:modelDetailsPage'], NA) ||
    typedValue(asRecord(asset['schema:url']));
  if (modelType !== NA || variantOf !== NA || detailsUrl !== NA) {
    sections.modelProperties = {
      modelType: modelType !== NA ? modelType : NA,
      variantOf: variantOf !== NA ? variantOf : NA,
      detailsUrl: detailsUrl !== NA ? detailsUrl : NA,
    };
  }

  // alternativeTitle (dct:alternative)
  sections.alternativeTitle = langStringValue(asset['dct:alternative']) || NA;

  // publisher (dct:publisher)
  const publisher = asRecord(asset['dct:publisher']) ?? {};
  sections.publisherName = langStringValue(publisher['foaf:name']) || NA;
  const pubIdArray = normalizeArray(publisher['adms:identifier']);
  if (pubIdArray.length > 0) {
    const pubId = asRecord(pubIdArray[0]) ?? {};
    sections.publisherIdentifier = {
      agency: toDisplayValue(pubId['adms:schemaAgency'], NA) || NA,
      notation: toDisplayValue(pubId['skos:notation'], NA) || NA,
    };
  }

  // corpusLicense (dct:license)
  const licenseArray = normalizeArray(asset['dct:license']);
  if (licenseArray.length > 0) {
    const lic = asRecord(licenseArray[0]) ?? {};
    sections.corpusLicense = {
      url: typedValue(lic['cc:legalcode']) || NA,
      title: langStringValue(lic['dct:title']) || NA,
      description: langStringValue(lic['dct:description']) || NA,
    };
  }

  // Detalles de datos personales / anonimización
  sections.anonymizationDetails = langStringValue(asset['ms:anonymizationDetails']) || NA;
  sections.personalDataDetails = langStringValue(asset['ms:personalDataDetails']) || NA;
  sections.sensitiveDataDetails = langStringValue(asset['ms:sensitiveDataDetails']) || NA;
  sections.originalSourceDescription = langStringValue(asset['ms:originalSourceDescription']) || NA;

  // Campos de clasificación (domain, subclass, etc.)
  sections.domain = iriLocalName(iriId(asset['ms:domain'])) || NA;
  sections.corpusSubclass = iriLocalName(iriId(asset['ms:corpusSubclass'])) || NA;
  sections.lrType = iriLocalName(iriId(asset['ms:lrType'])) || NA;
  sections.annotationType = iriLocalName(iriId(asset['ms:annotationType'])) || NA;
  sections.dataProtectionPrinciple = iriLocalName(iriId(asset['ms:dataProtectionPrincipleApplied'])) || NA;
  sections.technicalMeasure = iriLocalName(iriId(asset['dpv:hasTechnicalOrganisationalMeasure'])) || NA;

  // Idiomas fuente, destino y pivote
  sections.sourceLanguages = normalizeArray(asset['ms:sourceLanguage']).map(mapLanguageNode);
  sections.targetLanguages = normalizeArray(asset['ms:targetLanguage']).map(mapLanguageNode);
  sections.pivotLanguages = normalizeArray(asset['ms:pivotLanguage']).map(mapLanguageNode);

  // dataQuality y encryption (desde simpl:dataProperties)
  const dataProps = asRecord(subject['simpl:dataProperties']) ?? {};
  sections.dataQuality = toDisplayValue(dataProps['simpl:dataQuality'], NA);
  sections.encryption = toDisplayValue(dataProps['simpl:encryption'], NA);

  // contractTemplateDoc (alias de contractTemplateDocument)
  sections.contractTemplateDoc = sections.contractTemplateDocument;
  // Distribution
  const distribution = asRecord(asset['dcat:distribution']) ?? {};
  const byteSizeNode = asRecord(distribution['dcat:byteSize']);
  const packageFmtNode = asRecord(distribution['dcat:packageFormat']);
  const formatNodes = normalizeArray(distribution['dct:format']);
  const msSize = asRecord(distribution['ms:size']);
  const amountNode = asRecord(msSize?.['ms:amount']);
  const unitNode = asRecord(msSize?.['ms:sizeUnit']);
  const simplFormat = toDisplayValue(dataProperties?.['simpl:format'], '');

  sections.byteSize = nonZeroString(typedValue(byteSizeNode));
  sections.packageFormat = iriLocalName(iriId(packageFmtNode));
  const fromDist = formatNodes.map(n => iriLocalName(iriId(n))).filter(Boolean);
  sections.fileFormatLabels = fromDist.length > 0 ? fromDist : simplFormat ? [simplFormat] : [];
  sections.sizeAmount = nonZeroString(typedValue(amountNode));
  sections.sizeUnit = iriLocalName(iriId(unitNode));

  // Provenance (se extrae del subject, no del asset)
  sections.provenanceBlocks = mapProvenanceBlocks(subject);

  return sections;
}

// ── ViewModel para la página ──────────────────────────────────────────────

export interface SdDetailViewModel extends SdDetailsSections {
  title: string;
  providerLabel: string;
  offeringTypeLabel: string;
}

export function mapSdDetailsToSdDetailViewModel(
  sd: SelfDescriptorModel,
  details: SdDetailsSections,
): SdDetailViewModel {
  return {
    ...details,
    title: sd.name?.trim() || sd.selfDescriptionId,
    providerLabel: 'sdDetails.detail.providerLabel',
    offeringTypeLabel: 'sdDetails.detail.selfDescription',
  };
}

//----------------- lo he copiado y pegado para arreglar una cosa hay que poner estas utilidades bien en su sitio pero no se srru

/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

/** ISO 3166-1 alpha-2 → display name (SHACL ms:region / bcp47:region_*). */
const REGION_NAMES: Record<string, string> = {
  AD: 'Andorra',
  AR: 'Argentina',
  BO: 'Bolivia',
  CL: 'Chile',
  CO: 'Colombia',
  CR: 'Costa Rica',
  CU: 'Cuba',
  DO: 'República Dominicana',
  EC: 'Ecuador',
  ES: 'España',
  FR: 'Francia',
  GQ: 'Guinea Ecuatorial',
  GT: 'Guatemala',
  HN: 'Honduras',
  IT: 'Italia',
  MX: 'México',
  NI: 'Nicaragua',
  PA: 'Panamá',
  PE: 'Perú',
  PY: 'Paraguay',
  SV: 'El Salvador',
  US: 'Estados Unidos',
  UY: 'Uruguay',
  VE: 'Venezuela',
};

/** ms:languageCode / bcp47:language_* → display name. */
const LANGUAGE_NAMES: Record<string, string> = {
  ca: 'Catalán',
  de: 'Alemán',
  en: 'Inglés',
  es: 'Español',
  eu: 'Euskera',
  fr: 'Francés',
  gl: 'Gallego',
  it: 'Italiano',
  oc: 'Occitano',
  cat: 'Catalán',
  deu: 'Alemán',
  eng: 'Inglés',
  eus: 'Euskera',
  fra: 'Francés',
  glg: 'Gallego',
  ita: 'Italiano',
  spa: 'Español',
};

export interface LanguageNodeFields {
  regionIri?: string;
  languageCodeIri?: string;
  languageVarietyName?: string;
  languageTag?: string;
  variantIri?: string;
}

export interface MappedLanguageRow {
  regionCode: string;
  regionDisplay: string;
  varietyLine: string;
  /** True when region and/or explicit variety metadata is present (not language code alone). */
  hasDisplayContent: boolean;
}

function localName(iri: string): string {
  const hash = iri.lastIndexOf('#');
  const slash = iri.lastIndexOf('/');
  const raw = hash >= 0 ? iri.slice(hash + 1) : slash >= 0 ? iri.slice(slash + 1) : iri;
  return stripCuriePrefix(raw);
}

/** Parses ms:ES, bcp47:region_ES, region_ES → ISO 3166-1 alpha-2 when possible. */
export function parseRegionCode(regionRaw?: string): string {
  if (!regionRaw?.trim()) {
    return '';
  }
  const local = localName(regionRaw);
  const regionPrefixed = local.match(/^region_([A-Za-z0-9]+)$/i);
  if (regionPrefixed) {
    const code = regionPrefixed[1].toUpperCase();
    return /^[A-Z]{2}$/.test(code) ? code : '';
  }
  if (/^[A-Z]{2}$/i.test(local)) {
    return local.toUpperCase();
  }
  return '';
}

/** Parses ms:spa, bcp47:language_es, language_es → short language code. */
export function parseLanguageCode(languageCodeRaw?: string): string {
  if (!languageCodeRaw?.trim()) {
    return '';
  }
  const local = localName(languageCodeRaw);
  const langPrefixed = local.match(/^language_([a-z]{2,3})$/i);
  if (langPrefixed) {
    return langPrefixed[1].toLowerCase();
  }
  return local.toLowerCase();
}

/** Extracts region subtag from a BCP47 tag (e.g. es-ES → ES). */
export function regionCodeFromLanguageTag(languageTag?: string): string {
  if (!languageTag?.trim()) {
    return '';
  }
  const parts = languageTag.trim().split('-');
  if (parts.length < 2) {
    return '';
  }
  const candidate = parts[1];
  return /^[A-Z]{2}$/i.test(candidate) ? candidate.toUpperCase() : '';
}

export function formatRegionDisplay(regionCode: string): string {
  if (!regionCode) {
    return '';
  }
  return REGION_NAMES[regionCode.toUpperCase()] ?? regionCode.toUpperCase();
}

export function formatLanguageDisplay(languageCode: string): string {
  if (!languageCode) {
    return '';
  }
  const key = languageCode.toLowerCase();
  return LANGUAGE_NAMES[key] ?? languageCode;
}

function formatVariantLabel(variantIri?: string): string {
  if (!variantIri?.trim()) {
    return '';
  }
  const local = localName(variantIri);
  const variantMatch = local.match(/^variant_(.+)$/i);
  return variantMatch ? variantMatch[1].replace(/_/g, ' ') : local;
}

/** Emoji flag from ISO 3166-1 alpha-2. */
export function regionFlagEmoji(regionCode?: string): string {
  const code = regionCode?.toUpperCase() ?? '';
  if (!/^[A-Z]{2}$/.test(code)) {
    return '';
  }
  return String.fromCodePoint(...code.split('').map(char => 0x1f1e6 + char.charCodeAt(0) - 65));
}

/**
 * Maps ms:Language node fields (SHACL LanguageShape) to UI row values.
 */
export function mapLanguageNodeFields(fields: LanguageNodeFields): MappedLanguageRow {
  const languageTag = fields.languageTag?.trim() ?? '';
  const varietyName = fields.languageVarietyName?.trim() ?? '';

  let regionCode = parseRegionCode(fields.regionIri ?? '');
  if (!regionCode && languageTag) {
    regionCode = regionCodeFromLanguageTag(languageTag);
  }

  const regionDisplay = formatRegionDisplay(regionCode);
  const variantLabel = formatVariantLabel(fields.variantIri);

  let varietyLine = '';
  if (varietyName) {
    varietyLine = languageTag ? `${varietyName} (${languageTag})` : varietyName;
  } else if (languageTag) {
    varietyLine = languageTag;
  } else if (variantLabel) {
    varietyLine = variantLabel;
  }

  const hasDisplayContent = !!(regionCode || varietyLine);

  return { regionCode, regionDisplay, varietyLine, hasDisplayContent };
}
