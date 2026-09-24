import type { SdResourceAddressTemplatesResult, SdSharingMethodsResult } from '../../sdtooling.service';
import type { SharingMethodSelectOption, TemplateSelectOption } from '../sdtooling-view.types';

export const toTemplateOptions = (result: SdResourceAddressTemplatesResult): TemplateSelectOption[] => {
  const templates = result.templates;
  if (!Array.isArray(templates)) {
    return [];
  }
  return templates
    .map(template => {
      if (typeof template === 'string') {
        return {
          value: template,
          label: template,
        };
      }
      const templateRecord = template as unknown as Record<string, unknown>;
      const templateId =
        template.id ||
        (typeof templateRecord['templateId'] === 'string' ? (templateRecord['templateId'] as string) : '');
      if (!templateId) {
        return undefined;
      }
      return {
        value: templateId,
        label: template.label || (template.title ? `${template.title} (${templateId})` : templateId),
      };
    })
    .filter((value): value is TemplateSelectOption => !!value);
};

export const toSharingMethodOptions = (result: SdSharingMethodsResult): SharingMethodSelectOption[] => {
  const methods = result.sharingMethods;
  if (!Array.isArray(methods)) {
    return [];
  }
  return methods
    .map(method => {
      if (typeof method === 'string') {
        return {
          value: method,
          label: method,
        };
      }
      const methodId = method.id || method.value || '';
      if (!methodId) {
        return undefined;
      }
      return {
        value: methodId,
        label: method.label || methodId,
      };
    })
    .filter((value): value is SharingMethodSelectOption => !!value);
};
