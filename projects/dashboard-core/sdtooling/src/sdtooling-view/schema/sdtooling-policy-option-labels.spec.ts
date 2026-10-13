import type { TranslateService } from '@ngx-translate/core';
import {
  IDENTITY_ATTRIBUTE_I18N_NAMESPACE,
  POLICY_ACTION_I18N_NAMESPACE,
  localizePolicyOptions,
} from './sdtooling-policy-option-labels';

describe('localizePolicyOptions', () => {
  const translations: Record<string, string> = {
    'policyAction.RESTRICTED_CONSUME': 'Consumo restringido',
    'identityAttribute.DATA_PROVIDER': 'Proveedor de datos',
  };
  const translate = {
    instant: (key: string) => translations[key] ?? key,
  } as unknown as TranslateService;

  it('translates labels by option value and keeps the value untouched', () => {
    const options = [{ label: 'restrictedConsume', value: 'RESTRICTED_CONSUME' }];

    expect(localizePolicyOptions(options, POLICY_ACTION_I18N_NAMESPACE, translate)).toEqual([
      { label: 'Consumo restringido', value: 'RESTRICTED_CONSUME' },
    ]);
  });

  it('keeps the backend label for options without a translation', () => {
    const options = [
      { label: 'Data Provider', value: 'DATA_PROVIDER' },
      { label: 'Researcher', value: 'RESEARCHER' },
    ];

    expect(localizePolicyOptions(options, IDENTITY_ATTRIBUTE_I18N_NAMESPACE, translate)).toEqual([
      { label: 'Proveedor de datos', value: 'DATA_PROVIDER' },
      { label: 'Researcher', value: 'RESEARCHER' },
    ]);
  });
});
