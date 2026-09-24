import { SUPPORTED_DASHBOARD_LANGS, type DashboardLang } from '../i18n/resolve-dashboard-lang';

export type OfferCreateKind = 'corpus' | 'lcr' | 'model' | 'api';

const OFFER_CREATE_KINDS: OfferCreateKind[] = ['corpus', 'lcr', 'model', 'api'];

const KIND_PREFIX: Record<OfferCreateKind, string> = {
  corpus: 'CorpusSchema',
  lcr: 'LCRSchema',
  model: 'ModelSchema',
  api: 'ApiSchema',
};

const LANG_SUFFIX: Record<DashboardLang, string> = {
  es: 'ES',
  en: 'EN',
  ca: 'CA',
  va: 'VA',
  gl: 'GL',
  eu: 'EU',
};

const LANG_SUFFIX_TO_LANG: Record<string, DashboardLang> = Object.fromEntries(
  SUPPORTED_DASHBOARD_LANGS.map(lang => [LANG_SUFFIX[lang], lang]),
) as Record<string, DashboardLang>;

export interface ParsedOfferCreateSchemaId {
  kind: OfferCreateKind;
  lang: DashboardLang;
}

/** Resolves locale-specific SD schema id for offer creation; must match `id` from GET .../schemas. */
export function resolveOfferCreateSchemaId(kind: OfferCreateKind, lang: DashboardLang): string {
  return `${KIND_PREFIX[kind]}_${LANG_SUFFIX[lang]}`;
}

/** Parses offer-creation schema ids produced by {@link resolveOfferCreateSchemaId}. */
export function parseOfferCreateSchemaId(schemaId: string): ParsedOfferCreateSchemaId | undefined {
  const trimmed = schemaId.trim();
  if (!trimmed) {
    return undefined;
  }

  const separator = trimmed.lastIndexOf('_');
  if (separator <= 0) {
    return undefined;
  }

  const prefix = trimmed.slice(0, separator);
  const langSuffix = trimmed.slice(separator + 1);
  const lang = LANG_SUFFIX_TO_LANG[langSuffix];
  if (!lang) {
    return undefined;
  }

  const kind = OFFER_CREATE_KINDS.find(candidate => KIND_PREFIX[candidate] === prefix);
  if (!kind) {
    return undefined;
  }

  if (resolveOfferCreateSchemaId(kind, lang) !== trimmed) {
    return undefined;
  }

  return { kind, lang };
}

/** Remaps an offer-creation schema id to another dashboard language, if applicable. */
export function remapOfferCreateSchemaId(
  schemaId: string,
  targetLang: DashboardLang,
): { kind: OfferCreateKind; nextSchemaId: string } | undefined {
  const parsed = parseOfferCreateSchemaId(schemaId);
  if (!parsed) {
    return undefined;
  }

  const nextSchemaId = resolveOfferCreateSchemaId(parsed.kind, targetLang);
  if (nextSchemaId === schemaId.trim()) {
    return undefined;
  }

  return { kind: parsed.kind, nextSchemaId };
}

/** i18n key for the offer-type-unavailable toast shown when a locale schema is missing. */
export function offerCreateUnavailableToastKey(kind: OfferCreateKind): string {
  if (kind === 'corpus') {
    return 'offers.createPage.typeUnavailableCorpus';
  }
  if (kind === 'lcr') {
    return 'offers.createPage.typeUnavailableLexical';
  }
  if (kind === 'model') {
    return 'offers.createPage.typeUnavailableModel';
  }
  return 'offers.createPage.typeUnavailableApi';
}
