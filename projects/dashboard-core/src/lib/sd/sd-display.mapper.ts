import type { TranslateService } from '@ngx-translate/core';
import { stripCuriePrefix } from './sd-display.util';

function getCode(value?: string | null): string {
  if (!value) {
    return '';
  }

  const clean = stripCuriePrefix(value);

  if (clean.includes('_')) {
    return clean.split('_')[1];
  }

  return clean;
}

export class SdDisplayMapper {
  constructor(private readonly translate: TranslateService) {}

  private t(key: string, fallback: string): string {
    const res = this.translate.instant(key);
    return res !== key ? res : fallback;
  }

  language(raw?: string): string {
    const code = getCode(raw).toLowerCase();
    return this.t(`language.${code}`, code);
  }

  region(raw?: string): string {
    const code = getCode(raw).toUpperCase();
    return this.t(`region.${code}`, code);
  }

  languageWithRegion(langRaw?: string, regionRaw?: string): string {
    const lang = this.language(langRaw);
    const region = this.region(regionRaw);

    if (lang && region) {
      return `${lang} (${region})`;
    }
    if (lang) {
      return lang;
    }
    if (region) {
      return region;
    }

    return '';
  }
}
