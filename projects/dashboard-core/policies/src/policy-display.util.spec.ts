import { TranslateService } from '@ngx-translate/core';
import {
  buildContractPolicyLabelsFromUsagePolicyJson,
  buildPolicyListLabels,
  parsePolicyOdrl,
  parsePolicyPermissions,
  resolveAccessPolicyAction,
  resolveDateConstraintKind,
  resolveIntlLocale,
} from './policy-display.util';

describe('policy-display.util', () => {
  const translate = {
    instant: (key: string, params?: Record<string, string>) => {
      if (key === 'policy.access.action.search') {
        return 'Buscar en catálogo';
      }
      if (key === 'policies.list.name') {
        return `${params?.['assetName']} · ${params?.['action']} · ${params?.['assigner']}`;
      }
      if (key === 'policies.list.nameNoAssigner') {
        return `${params?.['assetName']} · ${params?.['action']}`;
      }
      if (key === 'policies.list.description') {
        return `${params?.['action']}. ${params?.['constraint']}`;
      }
      if (key === 'policy.constraint.validRange') {
        return `Válida del ${params?.['from']} al ${params?.['to']}`;
      }
      if (key === 'policy.constraint.openEnded') {
        return 'Sin límite de vigencia';
      }
      if (key === 'policy.contract.action.use') {
        return 'Uso del recurso';
      }
      return key;
    },
    currentLang: 'es',
    defaultLang: 'es',
  } as unknown as TranslateService;

  const assetContext = { assetDisplayName: 'Dataset IoT Barcelona' };

  it('resolveAccessPolicyAction detects SEARCH, CONSUME, RESTRICTED_CONSUME', () => {
    expect(resolveAccessPolicyAction('http://simpl.eu/odrl/actions/search')).toBe('SEARCH');
    expect(resolveAccessPolicyAction('http://simpl.eu/odrl/actions/consume')).toBe('CONSUME');
    expect(resolveAccessPolicyAction('http://simpl.eu/odrl/actions/restrictedConsume')).toBe('RESTRICTED_CONSUME');
  });

  it('parsePolicyOdrl reads compact odrl assigner, action, and date range', () => {
    const parsed = parsePolicyOdrl({
      policy: {
        'odrl:assigner': 'devsqs',
        'odrl:permission': {
          'odrl:action': { '@id': 'http://simpl.eu/odrl/actions/search' },
          'odrl:constraint': [
            {
              'odrl:leftOperand': { '@id': 'odrl:dateTime' },
              'odrl:operator': { '@id': 'odrl:gteq' },
              'odrl:rightOperand': '2026-05-11T23:02:00Z',
            },
            {
              'odrl:leftOperand': { '@id': 'http://www.w3.org/ns/odrl/2/dateTime' },
              'odrl:operator': { '@id': 'odrl:lteq' },
              'odrl:rightOperand': '2026-05-29T04:32:00Z',
            },
          ],
        },
      },
    });

    expect(parsed.assigner).toBe('devsqs');
    expect(parsed.accessAction).toBe('SEARCH');
    expect(parsed.fromIso).toBe('2026-05-11T23:02:00Z');
    expect(parsed.toIso).toBe('2026-05-29T04:32:00Z');
    expect(resolveDateConstraintKind(parsed.fromIso, parsed.toIso)).toBe('datetime_range');
  });

  it('buildPolicyListLabels composes asset, action, assigner in name for Publicación', () => {
    const parsed = parsePolicyOdrl({
      policy: {
        'odrl:assigner': 'devsqs',
        'odrl:permission': {
          'odrl:action': { '@id': 'http://simpl.eu/odrl/actions/search' },
          'odrl:constraint': [
            {
              'odrl:leftOperand': { '@id': 'odrl:dateTime' },
              'odrl:operator': { '@id': 'odrl:gteq' },
              'odrl:rightOperand': '2026-05-11T23:02:00Z',
            },
            {
              'odrl:leftOperand': { '@id': 'odrl:dateTime' },
              'odrl:operator': { '@id': 'odrl:lteq' },
              'odrl:rightOperand': '2026-05-29T04:32:00Z',
            },
          ],
        },
      },
    });

    const labels = buildPolicyListLabels(parsed, 'Publicación', translate, assetContext);
    expect(labels.name).toBe('Dataset IoT Barcelona · Buscar en catálogo · devsqs');
    expect(labels.description).toContain('Buscar en catálogo');
    expect(labels.description).toContain('Válida del');
  });

  it('resolveIntlLocale maps ngx-translate codes to Intl locales', () => {
    expect(resolveIntlLocale('eu')).toBe('eu');
    expect(resolveIntlLocale('es')).toBe('es-ES');
    expect(resolveIntlLocale('en')).toBe('en-GB');
    expect(resolveIntlLocale('va')).toBe('ca');
  });

  it('parsePolicyOdrl reads assigner uid from simpl:usage-policy shaped JSON', () => {
    const usagePolicy =
      '{"assigner":{"uid":"devtelefonica","role":"http://www.w3.org/ns/odrl/2/assigner"},"permission":[{"action":["http://www.w3.org/ns/odrl/2/use"],"constraint":[{"leftOperand":"http://www.w3.org/ns/odrl/2/deletion","operator":"http://www.w3.org/ns/odrl/2/eq","rightOperand":"after_use"}]}]}';
    const parsed = parsePolicyOdrl(JSON.parse(usagePolicy) as Record<string, unknown>);
    expect(parsed.assigner).toBe('devtelefonica');
    expect(parsed.contractAction).toBe('USE');
  });

  it('buildContractPolicyLabelsFromUsagePolicyJson uses offer name and assigner uid', () => {
    const usagePolicy =
      '{"assigner":{"uid":"devtelefonica","role":"http://www.w3.org/ns/odrl/2/assigner"},"permission":[{"action":["http://www.w3.org/ns/odrl/2/use"]}]}';
    const labels = buildContractPolicyLabelsFromUsagePolicyJson(usagePolicy, 'Mi oferta corpus', translate);
    expect(labels?.name).toBe('Mi oferta corpus · Uso del recurso · devtelefonica');
  });

  it('parsePolicyOdrl reads contract consume action', () => {
    const parsed = parsePolicyOdrl({
      policy: {
        'odrl:assigner': 'dataprovider03',
        'odrl:permission': {
          'odrl:action': { '@id': 'http://simpl.eu/odrl/actions/consume' },
        },
      },
    });
    expect(parsed.contractAction).toBe('CONSUME');
    expect(parsed.assigner).toBe('dataprovider03');
  });

  it('parsePolicyOdrl reads assignee and max use count from simpl:usage-policy shaped JSON', () => {
    const usagePolicy =
      '{"permission":[{"assignee":{"uid":"EDNEL_PARTICIPANT"},"action":["http://www.w3.org/ns/odrl/2/use"],"constraint":[{"leftOperand":"http://www.w3.org/ns/odrl/2/count","operator":"http://www.w3.org/ns/odrl/2/lteq","rightOperand":"10"}]}]}';
    const parsed = parsePolicyOdrl(JSON.parse(usagePolicy) as Record<string, unknown>);
    expect(parsed.assignee).toBe('EDNEL_PARTICIPANT');
    expect(parsed.maxUseCount).toBe(10);
    expect(parsed.deleteAfterUse).toBeFalse();
  });

  it('parsePolicyOdrl reads compact odrl:count with a numeric right operand', () => {
    const parsed = parsePolicyOdrl({
      policy: {
        'odrl:permission': {
          'odrl:action': { '@id': 'odrl:use' },
          'odrl:assignee': 'consumer',
          'odrl:constraint': {
            'odrl:leftOperand': { '@id': 'odrl:count' },
            'odrl:operator': { '@id': 'odrl:lt' },
            'odrl:rightOperand': 5,
          },
        },
      },
    });
    expect(parsed.assignee).toBe('consumer');
    expect(parsed.maxUseCount).toBe(4);
  });

  it('parsePolicyOdrl detects deletion after use from the deletion constraint', () => {
    const usagePolicy =
      '{"permission":[{"action":["http://www.w3.org/ns/odrl/2/use"],"constraint":[{"leftOperand":"http://www.w3.org/ns/odrl/2/deletion","operator":"http://www.w3.org/ns/odrl/2/eq","rightOperand":"after_use"}]}]}';
    const parsed = parsePolicyOdrl(JSON.parse(usagePolicy) as Record<string, unknown>);
    expect(parsed.deleteAfterUse).toBeTrue();
  });

  it('parsePolicyOdrl detects deletion after use from a delete duty', () => {
    const parsed = parsePolicyOdrl({
      policy: {
        'odrl:permission': {
          'odrl:action': { '@id': 'odrl:use' },
          'odrl:duty': { 'odrl:action': { '@id': 'odrl:delete' } },
        },
      },
    });
    expect(parsed.deleteAfterUse).toBeTrue();
  });

  it('parsePolicyPermissions returns every permission and flattens logical constraints', () => {
    const permissions = parsePolicyPermissions({
      policy: {
        'odrl:permission': [
          {
            'odrl:action': { '@id': 'http://simpl.eu/odrl/actions/search' },
            'odrl:assignee': { uid: 'DATA_SEARCHER' },
          },
          {
            'odrl:action': { '@id': 'http://simpl.eu/odrl/actions/consume' },
            'odrl:assignee': { uid: 'CONSUMER' },
            'odrl:constraint': {
              'odrl:and': [
                {
                  'odrl:leftOperand': { '@id': 'odrl:dateTime' },
                  'odrl:operator': { '@id': 'odrl:gteq' },
                  'odrl:rightOperand': '2026-02-01T00:00:00Z',
                },
                {
                  'odrl:leftOperand': { '@id': 'odrl:dateTime' },
                  'odrl:operator': { '@id': 'odrl:lteq' },
                  'odrl:rightOperand': '2026-03-31T00:00:00Z',
                },
              ],
            },
          },
        ],
      },
    });

    expect(permissions.length).toBe(2);
    expect(permissions[0].accessAction).toBe('SEARCH');
    expect(permissions[0].assignee).toBe('DATA_SEARCHER');
    expect(permissions[1].accessAction).toBe('CONSUME');
    expect(permissions[1].assignee).toBe('CONSUMER');
    expect(permissions[1].fromIso).toBe('2026-02-01T00:00:00Z');
    expect(permissions[1].toIso).toBe('2026-03-31T00:00:00Z');
  });

  it('parsePolicyPermissions returns an empty list when the policy has no permissions', () => {
    expect(parsePolicyPermissions({ '@id': 'p1', '@type': 'PolicyDefinition' })).toEqual([]);
  });
});
