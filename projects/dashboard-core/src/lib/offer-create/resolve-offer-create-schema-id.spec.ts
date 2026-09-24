import { SUPPORTED_DASHBOARD_LANGS } from '../i18n/resolve-dashboard-lang';
import {
  type OfferCreateKind,
  offerCreateUnavailableToastKey,
  parseOfferCreateSchemaId,
  remapOfferCreateSchemaId,
  resolveOfferCreateSchemaId,
} from './resolve-offer-create-schema-id';

const OFFER_CREATE_KINDS: OfferCreateKind[] = ['corpus', 'lcr', 'model', 'api'];

const EXPECTED_BY_KIND_LANG: Record<OfferCreateKind, Record<(typeof SUPPORTED_DASHBOARD_LANGS)[number], string>> = {
  corpus: {
    es: 'CorpusSchema_ES',
    en: 'CorpusSchema_EN',
    ca: 'CorpusSchema_CA',
    va: 'CorpusSchema_VA',
    gl: 'CorpusSchema_GL',
    eu: 'CorpusSchema_EU',
  },
  lcr: {
    es: 'LCRSchema_ES',
    en: 'LCRSchema_EN',
    ca: 'LCRSchema_CA',
    va: 'LCRSchema_VA',
    gl: 'LCRSchema_GL',
    eu: 'LCRSchema_EU',
  },
  model: {
    es: 'ModelSchema_ES',
    en: 'ModelSchema_EN',
    ca: 'ModelSchema_CA',
    va: 'ModelSchema_VA',
    gl: 'ModelSchema_GL',
    eu: 'ModelSchema_EU',
  },
  api: {
    es: 'ApiSchema_ES',
    en: 'ApiSchema_EN',
    ca: 'ApiSchema_CA',
    va: 'ApiSchema_VA',
    gl: 'ApiSchema_GL',
    eu: 'ApiSchema_EU',
  },
};

describe('resolveOfferCreateSchemaId', () => {
  for (const kind of OFFER_CREATE_KINDS) {
    for (const lang of SUPPORTED_DASHBOARD_LANGS) {
      it(`returns ${EXPECTED_BY_KIND_LANG[kind][lang]} for (${kind}, ${lang})`, () => {
        expect(resolveOfferCreateSchemaId(kind, lang)).toBe(EXPECTED_BY_KIND_LANG[kind][lang]);
      });
    }
  }

  it('never returns unqualified schema ids', () => {
    const unqualified = new Set(['CorpusSchema', 'LCRSchema', 'ModelSchema', 'ApiSchema']);
    for (const kind of OFFER_CREATE_KINDS) {
      for (const lang of SUPPORTED_DASHBOARD_LANGS) {
        expect(unqualified.has(resolveOfferCreateSchemaId(kind, lang))).toBeFalse();
      }
    }
  });
});

describe('parseOfferCreateSchemaId', () => {
  for (const kind of OFFER_CREATE_KINDS) {
    for (const lang of SUPPORTED_DASHBOARD_LANGS) {
      it(`parses ${EXPECTED_BY_KIND_LANG[kind][lang]}`, () => {
        expect(parseOfferCreateSchemaId(EXPECTED_BY_KIND_LANG[kind][lang])).toEqual({ kind, lang });
      });
    }
  }

  it('returns undefined for unknown schema ids', () => {
    expect(parseOfferCreateSchemaId('data-CorpusShape.ttl')).toBeUndefined();
    expect(parseOfferCreateSchemaId('CorpusSchema')).toBeUndefined();
    expect(parseOfferCreateSchemaId('')).toBeUndefined();
  });
});

describe('remapOfferCreateSchemaId', () => {
  it('remaps CorpusSchema_ES to CorpusSchema_CA for ca', () => {
    expect(remapOfferCreateSchemaId('CorpusSchema_ES', 'ca')).toEqual({
      kind: 'corpus',
      nextSchemaId: 'CorpusSchema_CA',
    });
  });

  it('returns undefined when target lang matches current schema', () => {
    expect(remapOfferCreateSchemaId('CorpusSchema_ES', 'es')).toBeUndefined();
  });

  it('returns undefined for non-offer schema ids', () => {
    expect(remapOfferCreateSchemaId('data-CorpusShape.ttl', 'ca')).toBeUndefined();
  });
});

describe('offerCreateUnavailableToastKey', () => {
  it('returns corpus, lexical, model, and api toast keys', () => {
    expect(offerCreateUnavailableToastKey('corpus')).toBe('offers.createPage.typeUnavailableCorpus');
    expect(offerCreateUnavailableToastKey('lcr')).toBe('offers.createPage.typeUnavailableLexical');
    expect(offerCreateUnavailableToastKey('model')).toBe('offers.createPage.typeUnavailableModel');
    expect(offerCreateUnavailableToastKey('api')).toBe('offers.createPage.typeUnavailableApi');
  });
});
