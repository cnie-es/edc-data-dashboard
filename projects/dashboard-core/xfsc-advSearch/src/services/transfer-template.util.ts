export const REST_API_DATA_TEMPLATE_ID = '14';

export function isStartedFinalizedTemplate(templateId: string | undefined | null): boolean {
  return templateId === REST_API_DATA_TEMPLATE_ID;
}
