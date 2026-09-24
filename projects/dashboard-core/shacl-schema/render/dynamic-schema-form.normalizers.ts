export const toArrayValues = (rawValue: unknown): string[] => {
  if (Array.isArray(rawValue)) {
    return rawValue
      .map(item => (typeof item === 'string' ? item.trim() : String(item).trim()))
      .filter(item => item.length > 0);
  }

  const source = asString(rawValue);
  if (!source) {
    return [];
  }
  return source
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0);
};

export const isValueEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim().length === 0;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return false;
};

export const asRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
};

export const asString = (value: unknown): string | undefined => {
  return typeof value === 'string' ? value : undefined;
};

export const asStringArray = (value: unknown): string[] => {
  return Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];
};

export const asNumber = (value: unknown): number | undefined => {
  return typeof value === 'number' && !Number.isNaN(value) ? value : undefined;
};
