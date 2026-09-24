import type { DashboardLang } from './resolve-dashboard-lang';
import { SUPPORTED_DASHBOARD_LANGS } from './resolve-dashboard-lang';

export interface DashboardLangOption {
  code: DashboardLang;
  label: string;
  flagClass: string;
}

const FLAG_BASE = 'dashboard-lang-flag';

const FLAG_SUFFIX_BY_LANG: Record<DashboardLang, string> = {
  es: 'es',
  ca: 'ca',
  va: 'va',
  gl: 'gl',
  eu: 'eu',
  en: 'en',
};

const LABEL_BY_LANG: Record<DashboardLang, string> = {
  es: 'Español',
  ca: 'Català',
  va: 'Valencià',
  gl: 'Galego',
  eu: 'Euskara',
  en: 'English',
};

function buildFlagClass(lang: DashboardLang): string {
  return `${FLAG_BASE} ${FLAG_BASE}-${FLAG_SUFFIX_BY_LANG[lang]}`;
}

export const DASHBOARD_LANG_OPTIONS: readonly DashboardLangOption[] = SUPPORTED_DASHBOARD_LANGS.map(code => ({
  code,
  label: LABEL_BY_LANG[code],
  flagClass: buildFlagClass(code),
}));

export function dashboardLangFlagClass(lang: DashboardLang): string {
  return buildFlagClass(lang);
}

export function dashboardLangLabel(lang: DashboardLang): string {
  return LABEL_BY_LANG[lang];
}
