import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import type { PolicyDefinition } from '@think-it-labs/edc-connector-client';
import { PolicyService } from './policy.service';
import { PolicyListEnrichmentService } from './policy-list-enrichment.service';
import type { PolicyUI } from './policy.models';
import type { OfferPolicyEnrichable } from './offer-policy-enrichable';

describe('PolicyListEnrichmentService', () => {
  let service: PolicyListEnrichmentService;
  let policyServiceSpy: jasmine.SpyObj<PolicyService>;

  const translate = {
    instant: (key: string, params?: Record<string, string>) => {
      const map: Record<string, string> = {
        'policy.access.action.search': 'Buscar en catálogo',
        'policies.list.name': `${params?.['assetName']} · ${params?.['action']} · ${params?.['assigner']}`,
        'policies.list.description': `${params?.['action']}. ${params?.['constraint']}`,
        'policy.constraint.validRange': `Válida del ${params?.['from']} al ${params?.['to']}`,
        'policy.constraint.openEnded': 'Sin límite de vigencia',
        'policies.list.loadError': 'Error de carga',
        'policies.list.pending': 'Cargando…',
        'policy.contract.action.use': 'Usar',
      };
      return map[key] ?? key;
    },
    currentLang: 'es',
    defaultLang: 'es',
  } as unknown as TranslateService;

  const translateEu = {
    instant: (key: string, params?: Record<string, string>) => {
      const map: Record<string, string> = {
        'policy.access.action.search': 'Katalogoan bilatu',
        'policies.list.name': `${params?.['assetName']} · ${params?.['action']} · ${params?.['assigner']}`,
        'policies.list.description': `${params?.['action']}. ${params?.['constraint']}`,
        'policy.constraint.openEnded': 'Indarraldi mugarik gabe',
        'policies.list.pending': 'Kargatzen…',
        'policy.contract.action.use': 'Erabili',
      };
      return map[key] ?? key;
    },
    currentLang: 'eu',
    defaultLang: 'eu',
  } as unknown as TranslateService;

  const makeRow = (
    policyDefinitionId: string,
    assetDisplayName: string,
    type: PolicyUI['type'] = 'Publicación',
  ): PolicyUI => ({
    id: `asset|access|${policyDefinitionId}|${assetDisplayName}`,
    policyDefinitionId,
    name: 'Cargando…',
    description: 'Cargando…',
    type,
    date: '01/01/2026',
    assetDisplayName,
    enrichmentStatus: 'idle',
  });

  beforeEach(() => {
    policyServiceSpy = jasmine.createSpyObj<PolicyService>('PolicyService', ['getPolicyDefinitionById']);
    TestBed.configureTestingModule({
      providers: [PolicyListEnrichmentService, { provide: PolicyService, useValue: policyServiceSpy }],
    });
    service = TestBed.inject(PolicyListEnrichmentService);
    service.setEdcConfig(undefined);
  });

  it('dedupes policy ids and fetches once per unique id on the page', async () => {
    const def = {
      policy: {
        'odrl:assigner': 'devsqs',
        'odrl:permission': {
          'odrl:action': { '@id': 'http://simpl.eu/odrl/actions/search' },
        },
      },
    } as unknown as PolicyDefinition;
    policyServiceSpy.getPolicyDefinitionById.and.resolveTo(def);

    const rows = [makeRow('policy-a', 'Asset A'), makeRow('policy-a', 'Asset A'), makeRow('policy-b', 'Asset B')];
    await service.enrichPageRows(rows, translate);

    expect(policyServiceSpy.getPolicyDefinitionById).toHaveBeenCalledTimes(2);
    expect(policyServiceSpy.getPolicyDefinitionById).toHaveBeenCalledWith('policy-a');
    expect(policyServiceSpy.getPolicyDefinitionById).toHaveBeenCalledWith('policy-b');
    expect(rows[0].enrichmentStatus).toBe('ready');
    expect(rows[0].name).toContain('Asset A');
    expect(rows[0].name).toContain('devsqs');
    expect(rows[1].name).toBe(rows[0].name);
  });

  it('builds distinct names per row when same policy id is linked to different assets', async () => {
    const def = {
      policy: {
        'odrl:assigner': 'devsqs',
        'odrl:permission': {
          'odrl:action': { '@id': 'http://simpl.eu/odrl/actions/search' },
        },
      },
    } as unknown as PolicyDefinition;
    policyServiceSpy.getPolicyDefinitionById.and.resolveTo(def);

    const rows = [makeRow('shared-policy', 'Dataset Alpha'), makeRow('shared-policy', 'Dataset Beta')];
    await service.enrichPageRows(rows, translate);

    expect(policyServiceSpy.getPolicyDefinitionById).toHaveBeenCalledTimes(1);
    expect(rows[0].name).toContain('Dataset Alpha');
    expect(rows[1].name).toContain('Dataset Beta');
    expect(rows[0].name).not.toBe(rows[1].name);
  });

  it('uses cache on second enrich for the same id', async () => {
    const def = {
      policy: {
        'odrl:assigner': 'x',
        'odrl:permission': { 'odrl:action': { '@id': 'http://simpl.eu/odrl/actions/search' } },
      },
    } as unknown as PolicyDefinition;
    policyServiceSpy.getPolicyDefinitionById.and.resolveTo(def);

    const rows1 = [makeRow('cached-id', 'Asset')];
    await service.enrichPageRows(rows1, translate);
    const rows2 = [makeRow('cached-id', 'Asset')];
    await service.enrichPageRows(rows2, translate);

    expect(policyServiceSpy.getPolicyDefinitionById).toHaveBeenCalledTimes(1);
  });

  it('relabelRows updates labels from cache without calling the API', async () => {
    const def = {
      policy: {
        'odrl:assigner': 'devsqs',
        'odrl:permission': {
          'odrl:action': { '@id': 'http://simpl.eu/odrl/actions/search' },
        },
      },
    } as unknown as PolicyDefinition;
    policyServiceSpy.getPolicyDefinitionById.and.resolveTo(def);

    const row = makeRow('cached-policy', 'My Asset');
    row.enrichmentStatus = 'idle';
    await service.enrichPageRows([row], translate);
    expect(row.name).toContain('Buscar en catálogo');

    service.relabelRows([row], translateEu);
    expect(policyServiceSpy.getPolicyDefinitionById).toHaveBeenCalledTimes(1);
    expect(row.name).toContain('Katalogoan bilatu');
    expect(row.name).toContain('My Asset');
  });

  it('sets error labels with asset name when GET fails', async () => {
    policyServiceSpy.getPolicyDefinitionById.and.rejectWith(new Error('network'));
    const rows = [makeRow('missing-policy', 'My Asset Title')];
    await service.enrichPageRows(rows, translate);

    expect(rows[0].enrichmentStatus).toBe('error');
    expect(rows[0].name).toBe('My Asset Title');
    expect(rows[0].description).toBe('Error de carga');
  });

  const makeOfferCard = (
    contractPolicyId: string,
    assetDisplayName: string,
    providerLabel = 'consumer',
  ): OfferPolicyEnrichable => ({
    contractPolicyId,
    assetDisplayName,
    providerLabel,
    policySummary: '',
    policyEnrichmentStatus: 'idle',
  });

  it('enrichSingleContractPolicyName returns Contratación label for one policy', async () => {
    const def = {
      policy: {
        'odrl:assigner': 'devsqs',
        'odrl:permission': {
          'odrl:action': { '@id': 'odrl:use' },
        },
      },
    } as unknown as PolicyDefinition;
    policyServiceSpy.getPolicyDefinitionById.and.resolveTo(def);

    const name = await service.enrichSingleContractPolicyName('policy-a', 'Offer A', translate);
    expect(name).toContain('Offer A');
    expect(name).toContain('devsqs');
    expect(policyServiceSpy.getPolicyDefinitionById).toHaveBeenCalledWith('policy-a');
  });

  it('enrichSinglePolicyName returns Publicación label for access policy', async () => {
    const def = {
      policy: {
        'odrl:assigner': 'devsqs',
        'odrl:permission': {
          'odrl:action': { '@id': 'http://simpl.eu/odrl/actions/search' },
        },
      },
    } as unknown as PolicyDefinition;
    policyServiceSpy.getPolicyDefinitionById.and.resolveTo(def);

    const name = await service.enrichSinglePolicyName('access-policy-a', 'Offer A', 'Publicación', translate);
    expect(name).toContain('Offer A');
    expect(name).toContain('devsqs');
    expect(policyServiceSpy.getPolicyDefinitionById).toHaveBeenCalledWith('access-policy-a');
  });

  it('enrichOfferCardPolicyNames dedupes ids and sets Contratación labels on cards', async () => {
    const def = {
      policy: {
        'odrl:assigner': 'devsqs',
        'odrl:permission': {
          'odrl:action': { '@id': 'odrl:use' },
        },
      },
    } as unknown as PolicyDefinition;
    policyServiceSpy.getPolicyDefinitionById.and.resolveTo(def);

    const cards = [
      makeOfferCard('policy-a', 'Offer A'),
      makeOfferCard('policy-a', 'Offer A'),
      makeOfferCard('policy-b', 'Offer B'),
    ];
    await service.enrichOfferCardPolicyNames(cards, translate);

    expect(policyServiceSpy.getPolicyDefinitionById).toHaveBeenCalledTimes(2);
    expect(cards[0].policyEnrichmentStatus).toBe('ready');
    expect(cards[0].policySummary).toContain('Offer A');
    expect(cards[0].policySummary).toContain('devsqs');
    expect(cards[0].providerLabel).toBe('devsqs');
    expect(cards[1].policySummary).toBe(cards[0].policySummary);
    expect(cards[2].policySummary).toContain('Offer B');
  });

  it('relabelOfferCards updates offer policySummary from cache without API', async () => {
    const def = {
      policy: {
        'odrl:assigner': 'devsqs',
        'odrl:permission': {
          'odrl:action': { '@id': 'odrl:use' },
        },
      },
    } as unknown as PolicyDefinition;
    policyServiceSpy.getPolicyDefinitionById.and.resolveTo(def);

    const card = makeOfferCard('cached-offer-policy', 'My Offer');
    await service.enrichOfferCardPolicyNames([card], translate);
    expect(card.policySummary).toContain('Usar');

    service.relabelOfferCards([card], translateEu);
    expect(policyServiceSpy.getPolicyDefinitionById).toHaveBeenCalledTimes(1);
    expect(card.policySummary).toContain('My Offer');
  });

  it('enrichOfferCardPolicyNames sets error fallback on card when GET fails', async () => {
    policyServiceSpy.getPolicyDefinitionById.and.rejectWith(new Error('network'));
    const cards = [makeOfferCard('missing', 'Offer Title')];
    await service.enrichOfferCardPolicyNames(cards, translate);

    expect(cards[0].policyEnrichmentStatus).toBe('error');
    expect(cards[0].policySummary).toBe('Offer Title');
  });
});
