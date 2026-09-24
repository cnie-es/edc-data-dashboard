import { stripCuriePrefix } from './sd-display.util';

describe('stripCuriePrefix', () => {
  it('strips ms: prefix', () => {
    expect(stripCuriePrefix('ms:seconds')).toBe('seconds');
    expect(stripCuriePrefix('ms:image')).toBe('image');
    expect(stripCuriePrefix('ms:noA')).toBe('noA');
  });

  it('strips omtd: prefix', () => {
    expect(stripCuriePrefix('omtd:pdf')).toBe('pdf');
  });

  it('leaves values without prefix unchanged', () => {
    expect(stripCuriePrefix('monolingual')).toBe('monolingual');
    expect(stripCuriePrefix('pdf')).toBe('pdf');
  });
});
