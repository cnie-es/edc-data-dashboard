import type { TranslateService } from '@ngx-translate/core';
import type { DynamicField } from '@eclipse-edc/dashboard-core/shacl-schema';

export type TemplateFieldTextPart = 'label' | 'description';

/**
 * i18n key for a text of a source-template field: `sdtooling.templateFields.<fieldKey>.<part>`.
 * Template schemas are served by the backend in English only; these keys let the frontend translate them.
 * Dots in the field key would be read as nested i18n paths, so they are replaced by underscores.
 */
export const templateFieldTranslationKey = (fieldKey: string, part: TemplateFieldTextPart): string =>
  `sdtooling.templateFields.${fieldKey.replace(/\./g, '_')}.${part}`;

/** Translated text for a template field, or `undefined` when the active language has no entry for it. */
export const translateTemplateFieldText = (
  field: Pick<DynamicField, 'key'>,
  part: TemplateFieldTextPart,
  translate: TranslateService,
): string | undefined => {
  const key = templateFieldTranslationKey(field.key, part);
  const translated = translate.instant(key);
  return typeof translated === 'string' && translated && translated !== key ? translated : undefined;
};
