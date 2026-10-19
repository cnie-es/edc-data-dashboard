/** Currencies whose symbol is shared with another one (Danish and Swedish krone are both `kr`): shown by code. */
const CURRENCIES_SHOWN_BY_CODE = new Set(['DKK', 'SEK']);

/**
 * Symbol of an ISO 4217 currency code (`EUR` → `€`, `PLN` → `zł`, `CZK` → `Kč`…), from the browser `Intl` data,
 * so every currency of the offer template (`simpl:currency`) gets one without keeping a table here.
 * Codes `Intl` does not know, or without a symbol, are returned as they are.
 */
export function currencySymbol(code: string | null | undefined): string {
  const trimmed = code?.trim() ?? '';
  if (!trimmed) {
    return '';
  }
  if (CURRENCIES_SHOWN_BY_CODE.has(trimmed.toUpperCase())) {
    return trimmed.toUpperCase();
  }
  try {
    const parts = new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: trimmed.toUpperCase(),
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0);
    return parts.find(part => part.type === 'currency')?.value ?? trimmed;
  } catch {
    // Not a valid ISO 4217 code (e.g. `€` or `euro` typed by hand).
    return trimmed;
  }
}
