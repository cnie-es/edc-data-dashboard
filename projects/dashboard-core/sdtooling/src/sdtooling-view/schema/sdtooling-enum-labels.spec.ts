import type { TranslateService } from '@ngx-translate/core';
import { resolveEnumOptionLabel } from './sdtooling-enum-labels';

describe('resolveEnumOptionLabel', () => {
  const translations: Record<string, string> = {
    'mediaType.audio': 'Audio',
    'mediaType.textNumerical': 'Texto numérico',
    'lingualityType.monolingual': 'Monolingüe',
    'technicalOrganisationalMeasure.encryptionOfPersonalData': 'Cifrado de datos personales',
    'dataProtectionPrinciple.dataMinimisation': 'Minimización de datos',
    'priceType.free': 'Gratuito',
  };
  const translate = {
    instant: (key: string) => translations[key] ?? key,
  } as unknown as TranslateService;

  it('translates media type options from the mediaType i18n namespace', () => {
    const field = { key: 'ms:mediaType', enumOptionLabels: { 'ms:textNumerical': 'Text Numerical' } };

    expect(resolveEnumOptionLabel(field, 'ms:textNumerical', translate)).toBe('Texto numérico');
    expect(resolveEnumOptionLabel(field, 'ms:audio', translate)).toBe('Audio');
  });

  it('translates linguality type options from the lingualityType i18n namespace', () => {
    const field = { key: 'ms:lingualityType', enumOptionLabels: { 'ms:monolingual': 'Monolingual' } };

    expect(resolveEnumOptionLabel(field, 'ms:monolingual', translate)).toBe('Monolingüe');
  });

  it('translates data protection taxonomies, also when the field key is a full IRI', () => {
    const measureField = { key: 'https://w3id.org/dpv#hasTechnicalOrganisationalMeasure' };
    const principleField = { key: 'ms:dataProtectionPrincipleApplied' };

    expect(resolveEnumOptionLabel(measureField, 'ms:encryptionOfPersonalData', translate)).toBe(
      'Cifrado de datos personales',
    );
    expect(resolveEnumOptionLabel(principleField, 'ms:dataMinimisation', translate)).toBe('Minimización de datos');
  });

  it('translates literal (non-IRI) options such as the offering price type', () => {
    const field = { key: 'simpl:priceType' };

    expect(resolveEnumOptionLabel(field, 'free', translate)).toBe('Gratuito');
    expect(resolveEnumOptionLabel(field, 'commercial', translate)).toBe('commercial');
  });

  it('falls back to the schema label when there is no translation', () => {
    const field = { key: 'ms:mediaType', enumOptionLabels: { 'ms:hologram': 'Hologram' } };

    expect(resolveEnumOptionLabel(field, 'ms:hologram', translate)).toBe('Hologram');
  });

  it('keeps the schema label for fields without translated options', () => {
    const field = { key: 'ms:sizeUnit', enumOptionLabels: { 'ms:audio': 'Audio unit' } };

    expect(resolveEnumOptionLabel(field, 'ms:audio', translate)).toBe('Audio unit');
  });
});
