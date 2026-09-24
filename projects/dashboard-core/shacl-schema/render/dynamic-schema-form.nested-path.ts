import { isValueEmpty } from './dynamic-schema-form.normalizers';

export const readNestedPathFromField = (field: { schema?: Record<string, unknown> }): string[] | undefined => {
  const nestedPath = field.schema?.['nestedPath'];
  if (!Array.isArray(nestedPath) || nestedPath.length < 2) {
    return undefined;
  }
  const path = nestedPath.filter((segment): segment is string => typeof segment === 'string' && segment.length > 0);
  if (path.length !== nestedPath.length) {
    return undefined;
  }
  return path;
};

export const writeNestedValue = (
  target: Record<string, unknown>,
  path: string[],
  value: unknown,
  mapKey: (key: string) => string = key => key,
) => {
  if (path.length === 0) {
    return;
  }

  const mappedPath = path.map(mapKey);
  let current: Record<string, unknown> = target;
  for (let i = 0; i < mappedPath.length - 1; i++) {
    const key = mappedPath[i];
    const next = current[key];
    if (typeof next !== 'object' || next === null || Array.isArray(next)) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  // Los contenedores intermedios (p. ej. "dataProperties") se crean SIEMPRE,
  // aunque el valor de la hoja esté vacío. El filtrado de "vacío" se aplica
  // solo a la propia hoja, nunca al nodo padre, para que un sh:node opcional
  // con todos sus campos sin rellenar siga viajando como objeto (aunque sea
  // "{}" / solo con rdf:type) en vez de desaparecer del payload.
  const leafKey = mappedPath[mappedPath.length - 1];
  if (isValueEmpty(value)) {
    return;
  }
  current[leafKey] = value;
};

/**
 * Crea (si no existe ya) el contenedor anidado correspondiente a `path`,
 * sin escribir ningún valor de hoja. Útil para forzar que un nodo opcional
 * (p. ej. el sh:node de una sección completa como DataPropertiesShape)
 * viaje en el payload incluso cuando NINGÚN campo de esa sección tiene
 * valor, y por tanto `writeNestedValue` nunca llegaría a crearlo por sí solo.
 *
 * Llamar a esto una vez por sección/objeto anidado ANTES de iterar sus
 * campos con `writeNestedValue`.
 */
export const ensureNestedContainer = (
  target: Record<string, unknown>,
  path: string[],
  mapKey: (key: string) => string = key => key,
): void => {
  if (path.length === 0) {
    return;
  }

  const mappedPath = path.map(mapKey);
  let current: Record<string, unknown> = target;
  for (const key of mappedPath) {
    const next = current[key];
    if (typeof next !== 'object' || next === null || Array.isArray(next)) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
};
