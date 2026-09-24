/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

import { stripCuriePrefix } from './sd-display.util';

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
