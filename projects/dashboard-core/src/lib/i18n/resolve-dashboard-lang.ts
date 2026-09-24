export const SUPPORTED_DASHBOARD_LANGS = ['es', 'en', 'ca', 'va', 'gl', 'eu'] as const;

export type DashboardLang = (typeof SUPPORTED_DASHBOARD_LANGS)[number];

export function resolveDashboardLang(candidate?: string | null): DashboardLang {
  if (!candidate) {
    return 'es';
  }

  const lower = candidate.toLowerCase();
  const normalized = lower.split('-')[0];

  if (lower.includes('valencia') || normalized === 'va') {
    return 'va';
  }
  if (normalized === 'en') {
    return 'en';
  }
  if (normalized === 'ca') {
    return 'ca';
  }
  if (normalized === 'gl') {
    return 'gl';
  }
  if (normalized === 'eu' || normalized === 'eus') {
    return 'eu';
  }

  return 'es';
}

export function isSupportedDashboardLang(value: string): value is DashboardLang {
  return (SUPPORTED_DASHBOARD_LANGS as readonly string[]).includes(value);
}
