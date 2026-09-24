import {
  mapLanguageNodeFields,
  parseLanguageCode,
  parseRegionCode,
  regionCodeFromLanguageTag,
  regionFlagEmoji,
} from './language-bcp47.util';

describe('language-bcp47.util', () => {
  it('parses ms and bcp47 region IRIs', () => {
    expect(parseRegionCode('ms:ES')).toBe('ES');
    expect(parseRegionCode('bcp47:region_ES')).toBe('ES');
    expect(parseRegionCode('bcp47:region_CO')).toBe('CO');
    expect(parseRegionCode('region_419')).toBe('');
  });

  it('parses ms and bcp47 language code IRIs', () => {
    expect(parseLanguageCode('ms:spa')).toBe('spa');
    expect(parseLanguageCode('bcp47:language_es')).toBe('es');
    expect(parseLanguageCode('bcp47:language_ca')).toBe('ca');
  });

  it('extracts region from BCP47 language tags', () => {
    expect(regionCodeFromLanguageTag('es-ES')).toBe('ES');
    expect(regionCodeFromLanguageTag('ca-ES-valencia')).toBe('ES');
    expect(regionCodeFromLanguageTag('es')).toBe('');
  });

  it('builds emoji flags from ISO region codes', () => {
    expect(regionFlagEmoji('ES')).toBe('🇪🇸');
    expect(regionFlagEmoji('CO')).toBe('🇨🇴');
    expect(regionFlagEmoji('')).toBe('');
  });

  it('maps full LanguageShape fields to display row', () => {
    const row = mapLanguageNodeFields({
      regionIri: 'bcp47:region_ES',
      languageCodeIri: 'bcp47:language_es',
      languageVarietyName: 'Español de Europa / Español peninsular',
      languageTag: 'es-ES',
    });
    expect(row.regionCode).toBe('ES');
    expect(row.regionDisplay).toBe('España');
    expect(row.varietyLine).toBe('Español de Europa / Español peninsular (es-ES)');
    expect(row.hasDisplayContent).toBe(true);
  });

  it('treats language code alone as not displayable', () => {
    const row = mapLanguageNodeFields({
      languageCodeIri: 'ms:spa',
    });
    expect(row.regionCode).toBe('');
    expect(row.varietyLine).toBe('');
    expect(row.hasDisplayContent).toBe(false);
  });

  it('derives region from language tag when region IRI is missing', () => {
    const row = mapLanguageNodeFields({
      languageCodeIri: 'ms:spa',
      languageTag: 'es-CO',
    });
    expect(row.regionCode).toBe('CO');
    expect(row.regionDisplay).toBe('Colombia');
    expect(row.varietyLine).toBe('es-CO');
  });
});
