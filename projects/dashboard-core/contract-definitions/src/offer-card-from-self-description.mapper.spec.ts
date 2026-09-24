import { TranslateService } from '@ngx-translate/core';
import { mapCorpusOfferingSelfDescription } from '@eclipse-edc/dashboard-core';
import {
  applyUsagePolicyLabelsToOfferCard,
  buildOfferCardViewModelFromSelfDescriptionDetail,
  buildPlaceholderOfferCardFromSearchSummary,
} from './offer-card-from-self-description.mapper';
import { formatOfferPublishedAt } from './format-offer-published-at';

const flatCorpusOfferingFixture: Record<string, unknown> = {
  '@id': 'mock-corpus-offering-001',
  'edval:isPublicOffering': { '@type': 'xsd:boolean', '@value': true },
  'simpl:contractTemplate': {
    'simpl:contractTemplateURL': 'https://files.example.com/static/contract/ContractTemplate1.json',
  },
  'simpl:generalServiceProperties': {
    'simpl:name': 'ABSITA dataset1',
    'simpl:description': 'The ABSITA dataset contains 4,121 reviews.',
    'simpl:offeringType': 'data',
  },
  'simpl:offeringPrice': {
    'simpl:currency': 'EUR',
    'simpl:price': { '@type': 'xsd:decimal', '@value': 0 },
    'simpl:priceType': 'free',
  },
  'simpl:providerInformation': {
    'simpl:providedBy': '019d0543-7115-739f-829a-99ca5edcba2c',
  },
};

describe('buildOfferCardViewModelFromSelfDescriptionDetail', () => {
  it('maps corpus detail VM to offer card fields', () => {
    const vm = mapCorpusOfferingSelfDescription(flatCorpusOfferingFixture);
    const card = buildOfferCardViewModelFromSelfDescriptionDetail(vm, 'did:web:registry.example:offer-1');

    expect(card.title).toBe('ABSITA dataset1');
    expect(card.providerLabel).toBe('019d0543-7115-739f-829a-99ca5edcba2c');
    expect(card.subtitle).toBe('data');
    expect(card.description).toBe('The ABSITA dataset contains 4,121 reviews.');
    expect(card.priceLabel).toBe('Gratuito');
    expect(card.statusBadge).toBe('Cat. Público');
    expect(card.policySummary).toBe('https://files.example.com/static/contract/ContractTemplate1.json');
    expect(card.policyEnrichmentStatus).toBe('ready');
    expect(card.offerSelfDescriptionId).toBe('did:web:registry.example:offer-1');
  });

  it('uses paid price label when priceType is not free', () => {
    const paidFixture = {
      ...flatCorpusOfferingFixture,
      'simpl:offeringPrice': {
        'simpl:price': { '@type': 'xsd:decimal', '@value': 12 },
        'simpl:priceType': 'paid',
      },
    };
    const vm = mapCorpusOfferingSelfDescription(paidFixture);
    const card = buildOfferCardViewModelFromSelfDescriptionDetail(vm, 'did:web:paid');

    expect(card.priceLabel).toBe('12 € + IVA');
  });

  it('maps issuanceDate to publishedAt for Mis ofertas card date formatting', () => {
    const fixture = {
      issuanceDate: '2026-05-15T09:20:06.009023252Z',
      credentialSubject: flatCorpusOfferingFixture,
    };
    const vm = mapCorpusOfferingSelfDescription(fixture);
    const card = buildOfferCardViewModelFromSelfDescriptionDetail(vm, 'did:web:test:offer');

    expect(vm.issuanceDateIso).toBe('2026-05-15T09:20:06.009Z');
    expect(formatOfferPublishedAt(card.publishedAt)).toBe('15 May 2026');
  });

  it('maps Cat. No público when isPublicOffering is false', () => {
    const privateFixture = {
      ...flatCorpusOfferingFixture,
      'edval:isPublicOffering': { '@type': 'xsd:boolean', '@value': false },
    };
    const vm = mapCorpusOfferingSelfDescription(privateFixture);
    const card = buildOfferCardViewModelFromSelfDescriptionDetail(vm, 'did:web:private');

    expect(card.statusBadge).toBe('Cat. No público');
  });
});

describe('applyUsagePolicyLabelsToOfferCard', () => {
  const translate = {
    instant: (key: string, params?: Record<string, string>) => {
      if (key === 'policy.contract.action.use') {
        return 'Uso del recurso';
      }
      if (key === 'policies.list.name') {
        return `${params?.['assetName']} · ${params?.['action']} · ${params?.['assigner']}`;
      }
      if (key === 'policies.list.description') {
        return `${params?.['action']}. ${params?.['constraint']}`;
      }
      if (key === 'policy.constraint.openEnded') {
        return 'Sin límite de vigencia';
      }
      return key;
    },
    currentLang: 'es',
    defaultLang: 'es',
  } as unknown as TranslateService;

  it('sets policySummary and providerLabel from simpl:usage-policy', () => {
    const usagePolicy =
      '{"assigner":{"uid":"devtelefonica"},"permission":[{"action":["http://www.w3.org/ns/odrl/2/use"]}]}';
    const fixture = {
      ...flatCorpusOfferingFixture,
      'simpl:servicePolicy': {
        'simpl:usage-policy': usagePolicy,
      },
    };
    const vm = mapCorpusOfferingSelfDescription(fixture);
    const card = buildOfferCardViewModelFromSelfDescriptionDetail(vm, 'did:web:test:offer');
    const enriched = applyUsagePolicyLabelsToOfferCard(card, vm, translate);

    expect(enriched.policySummary).toBe('ABSITA dataset1 · Uso del recurso · devtelefonica');
    expect(enriched.providerLabel).toBe('devtelefonica');
  });
});

describe('buildPlaceholderOfferCardFromSearchSummary', () => {
  it('builds loading placeholder from search summary', () => {
    const card = buildPlaceholderOfferCardFromSearchSummary({
      selfDescriptionId: 'did:web:test:sd-1',
      name: 'Search name',
      description: 'Search desc',
      offeringType: 'ms:Corpus',
      policyEnrichmentStatus: 'loading',
    });

    expect(card.title).toBe('Search name');
    expect(card.description).toBe('Search desc');
    expect(card.subtitle).toBe('corpus');
    expect(card.policyEnrichmentStatus).toBe('loading');
    expect(card.offerSelfDescriptionId).toBe('did:web:test:sd-1');
  });
});
