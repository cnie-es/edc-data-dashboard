import { currencySymbol } from './currency-symbol.util';

describe('currencySymbol', () => {
  it('maps ISO 4217 codes of the offer template to their symbol', () => {
    expect(currencySymbol('EUR')).toBe('€');
    expect(currencySymbol('PLN')).toBe('zł');
    expect(currencySymbol('CZK')).toBe('Kč');
    expect(currencySymbol('HUF')).toBe('Ft');
  });

  it('shows Danish and Swedish krone by code, since both symbols are kr', () => {
    expect(currencySymbol('DKK')).toBe('DKK');
    expect(currencySymbol('sek')).toBe('SEK');
  });

  it('accepts lower case and surrounding spaces', () => {
    expect(currencySymbol(' eur ')).toBe('€');
  });

  it('returns values that are not ISO codes as they are', () => {
    expect(currencySymbol('€')).toBe('€');
    expect(currencySymbol('euro')).toBe('euro');
  });

  it('returns an empty string without currency', () => {
    expect(currencySymbol('')).toBe('');
    expect(currencySymbol(undefined)).toBe('');
  });
});
