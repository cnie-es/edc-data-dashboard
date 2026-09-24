import { SUPPORTED_DASHBOARD_LANGS } from './resolve-dashboard-lang';
import { DASHBOARD_LANG_OPTIONS, dashboardLangFlagClass, dashboardLangLabel } from './dashboard-lang-options';

const EXPECTED_FLAG_CLASS: Record<(typeof SUPPORTED_DASHBOARD_LANGS)[number], string> = {
  es: 'dashboard-lang-flag-es',
  ca: 'dashboard-lang-flag-ca',
  va: 'dashboard-lang-flag-va',
  gl: 'dashboard-lang-flag-gl',
  eu: 'dashboard-lang-flag-eu',
  en: 'dashboard-lang-flag-en',
};

describe('dashboardLangOptions', () => {
  it('exposes one option per supported dashboard language', () => {
    expect(DASHBOARD_LANG_OPTIONS.map(o => o.code)).toEqual([...SUPPORTED_DASHBOARD_LANGS]);
  });

  it('maps each language to the expected dashboard flag CSS class', () => {
    for (const lang of SUPPORTED_DASHBOARD_LANGS) {
      expect(dashboardLangFlagClass(lang)).toContain(EXPECTED_FLAG_CLASS[lang]);
      const option = DASHBOARD_LANG_OPTIONS.find(o => o.code === lang);
      expect(option?.flagClass).toContain(EXPECTED_FLAG_CLASS[lang]);
    }
  });

  it('provides native labels for each language', () => {
    expect(dashboardLangLabel('es')).toBe('Español');
    expect(dashboardLangLabel('ca')).toBe('Català');
    expect(dashboardLangLabel('va')).toBe('Valencià');
    expect(dashboardLangLabel('gl')).toBe('Galego');
    expect(dashboardLangLabel('eu')).toBe('Euskara');
    expect(dashboardLangLabel('en')).toBe('English');
  });
});
