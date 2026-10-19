import { currencySymbol } from '@eclipse-edc/dashboard-core';

/**
 * Paid price label for offer cards, with the symbol of the offer currency (`simpl:currency`), like the offer detail.
 * Without currency, euro is assumed.
 */
export function formatOfferCardPaidPriceLabel(amount: string, currency: string | undefined): string {
  return `${amount} ${currencySymbol(currency) || '€'}`;
}
