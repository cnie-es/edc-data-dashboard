import type { TranslateService } from '@ngx-translate/core';
import type { DynamicField } from '@eclipse-edc/dashboard-core/shacl-schema';

/**
 * Taxonomy fields whose options are translated from i18n (`<namespace>.<localName>`, e.g. `mediaType.audio`)
 * instead of using the label derived from the IRI. The same namespaces are used by the detail views.
 */
const TRANSLATED_ENUM_NAMESPACE_BY_FIELD_KEY: Record<string, string> = {
  'ms:mediaType': 'mediaType',
  'ms:lingualityType': 'lingualityType',
  'dpv:hasTechnicalOrganisationalMeasure': 'technicalOrganisationalMeasure',
  'ms:dataProtectionPrincipleApplied': 'dataProtectionPrinciple',
  'simpl:priceType': 'priceType',
  // Metadata language codes (`es`, `ca-valencia`…); shares the `language.*` names used by the detail views.
  'simpl:inLanguage': 'language',
};

// Field keys may arrive compacted (`ms:mediaType`) or as full IRIs, so lookups go by local name.
const localName = (value: string): string =>
  value.slice(Math.max(value.lastIndexOf('#'), value.lastIndexOf('/'), value.lastIndexOf(':')) + 1);

const NAMESPACE_BY_FIELD_LOCAL_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(TRANSLATED_ENUM_NAMESPACE_BY_FIELD_KEY).map(([fieldKey, namespace]) => [
    localName(fieldKey),
    namespace,
  ]),
);

export const resolveEnumOptionLabel = (
  field: Pick<DynamicField, 'key' | 'enumOptionLabels'>,
  option: string,
  translate: TranslateService,
): string => {
  const namespace = NAMESPACE_BY_FIELD_LOCAL_NAME[localName(field.key)];
  if (namespace) {
    const key = `${namespace}.${localName(option)}`;
    const translated = translate.instant(key);
    if (translated !== key) {
      return translated;
    }
  }
  return field.enumOptionLabels?.[option] ?? option;
};
