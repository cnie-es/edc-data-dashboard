import { isStartedFinalizedTemplate, REST_API_DATA_TEMPLATE_ID } from './transfer-template.util';

describe('transfer-template.util', () => {
  it('should identify REST API data template id as started-finalized', () => {
    expect(REST_API_DATA_TEMPLATE_ID).toBe('14');
    expect(isStartedFinalizedTemplate('14')).toBeTrue();
  });

  it('should not treat other template ids as started-finalized', () => {
    expect(isStartedFinalizedTemplate('5')).toBeFalse();
    expect(isStartedFinalizedTemplate('HttpData-PULL')).toBeFalse();
  });

  it('should return false for empty template id', () => {
    expect(isStartedFinalizedTemplate(undefined)).toBeFalse();
    expect(isStartedFinalizedTemplate(null)).toBeFalse();
    expect(isStartedFinalizedTemplate('')).toBeFalse();
  });
});
