import type { TranslateService } from '@ngx-translate/core';
import type { PolicySelectOption } from '../sdtooling-view.types';

/** i18n namespaces for the policy options served by the backend (`<namespace>.<option value>`). */
export const POLICY_ACTION_I18N_NAMESPACE = 'policyAction';
export const IDENTITY_ATTRIBUTE_I18N_NAMESPACE = 'identityAttribute';

/**
 * Replaces the backend labels (`restrictedConsume`, `Data Provider`…) with the translation for the option value.
 * Options without a translation keep the backend label, e.g. identity attributes a governance authority added.
 */
export const localizePolicyOptions = (
  options: PolicySelectOption[],
  namespace: string,
  translate: TranslateService,
): PolicySelectOption[] =>
  options.map(option => {
    const key = `${namespace}.${option.value}`;
    const translated = translate.instant(key);
    return typeof translated === 'string' && translated && translated !== key
      ? { ...option, label: translated }
      : option;
  });
