import { normalizeUsagePolicyAction, toUsagePermissions } from './sdtooling-policy-transform';

describe('sdtooling-policy-transform', () => {
  it('maps ODRL use IRI to USE for usage policy API payload', () => {
    const out = toUsagePermissions([
      {
        assignee: 'urn:example:party',
        action: 'http://www.w3.org/ns/odrl/2/use',
        constraints: [{ type: 'Deletion', assignee: 'urn:example:party', afterUse: true }],
      },
    ]);

    expect(out.length).toBe(1);
    expect(out[0].action).toBe('USE');
  });

  it('normalizes usage policy action strings', () => {
    expect(normalizeUsagePolicyAction('http://www.w3.org/ns/odrl/2/use')).toBe('USE');
    expect(normalizeUsagePolicyAction('USE')).toBe('USE');
  });
});
