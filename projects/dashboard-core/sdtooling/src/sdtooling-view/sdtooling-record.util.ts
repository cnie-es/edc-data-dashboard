export const asRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
};

export const asString = (value: unknown): string | undefined => {
  return typeof value === 'string' ? value : undefined;
};

export const asOptionalString = (value: unknown): string | undefined => {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
};

export const safeParseJson = (content: string): unknown => {
  try {
    return JSON.parse(content);
  } catch {
    return undefined;
  }
};
