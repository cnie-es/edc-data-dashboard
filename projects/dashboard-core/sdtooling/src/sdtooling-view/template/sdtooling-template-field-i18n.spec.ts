import type { TranslateService } from '@ngx-translate/core';
import { templateFieldTranslationKey, translateTemplateFieldText } from './sdtooling-template-field-i18n';

describe('sdtooling-template-field-i18n', () => {
  const translations: Record<string, string> = {
    'sdtooling.templateFields.bucketName.label': 'Nombre del bucket',
    'sdtooling.templateFields.bucketName.description': 'Bucket de S3 donde se almacenan los datos.',
    'sdtooling.templateFields.edc_baseUrl.label': 'URL base',
  };
  const translate = {
    instant: (key: string) => translations[key] ?? key,
  } as unknown as TranslateService;

  it('builds the i18n key from the field key, escaping dots', () => {
    expect(templateFieldTranslationKey('bucketName', 'label')).toBe('sdtooling.templateFields.bucketName.label');
    expect(templateFieldTranslationKey('edc.baseUrl', 'description')).toBe(
      'sdtooling.templateFields.edc_baseUrl.description',
    );
  });

  it('returns the translated label and description when present', () => {
    expect(translateTemplateFieldText({ key: 'bucketName' }, 'label', translate)).toBe('Nombre del bucket');
    expect(translateTemplateFieldText({ key: 'bucketName' }, 'description', translate)).toBe(
      'Bucket de S3 donde se almacenan los datos.',
    );
    expect(translateTemplateFieldText({ key: 'edc.baseUrl' }, 'label', translate)).toBe('URL base');
  });

  it('returns undefined when there is no translation so the backend text is kept', () => {
    expect(translateTemplateFieldText({ key: 'region' }, 'label', translate)).toBeUndefined();
    expect(translateTemplateFieldText({ key: 'edc.baseUrl' }, 'description', translate)).toBeUndefined();
  });
});
