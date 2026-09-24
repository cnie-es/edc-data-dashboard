import { mapSdDetailsSections } from './sd-details.mapper';

describe('mapSdDetailsSections', () => {
  it('should map access and usage policy rows with formatted values', () => {
    const sections = mapSdDetailsSections({
      credentialSubject: {
        'simpl:generalServiceProperties': {
          'simpl:description': 'dataset description',
        },
        'simpl:servicePolicy': {
          'simpl:access-policy':
            '{"permission":[{"assignee":{"uid":"EDNEL_PARTICIPANT"},"action":["http://simpl.eu/odrl/actions/consume"],"constraint":[{"leftOperand":"http://www.w3.org/ns/odrl/2/dateTime","operator":"http://www.w3.org/ns/odrl/2/gteq","rightOperand":"2026-02-01T14:38:40Z"},{"leftOperand":"http://www.w3.org/ns/odrl/2/dateTime","operator":"http://www.w3.org/ns/odrl/2/lteq","rightOperand":"2026-03-31T13:39:31Z"}]}]}',
          'simpl:usage-policy':
            '{"permission":[{"assignee":{"uid":"EDNEL_PARTICIPANT"},"action":["http://www.w3.org/ns/odrl/2/use"],"constraint":[{"leftOperand":"http://www.w3.org/ns/odrl/2/count","operator":"http://www.w3.org/ns/odrl/2/lteq","rightOperand":"10"}]}]}',
        },
      },
    });

    expect(sections.generalDescription).toBe('dataset description');
    expect(sections.accessPolicyRows[0].actions).toBe('Consume');
    expect(sections.accessPolicyRows[0].from).toBe('1 de febrero de 2026');
    expect(sections.accessPolicyRows[0].to).toBe('31 de marzo de 2026');
    expect(sections.hasUsagePolicy).toBeTrue();
    expect(sections.usagePolicyRows[0].usageType).toBe('Restricted number of usages');
    expect(sections.usagePolicyRows[0].constraint).toBe('10');
  });
});
