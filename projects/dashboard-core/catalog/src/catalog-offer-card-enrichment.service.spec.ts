import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { delay, of, throwError } from 'rxjs';
import { SimplAdvancedSearchService, type SelfDescriptorModel } from '@eclipse-edc/dashboard-core/xfsc-advSearch';
import { CatalogOfferCardEnrichmentService } from './catalog-offer-card-enrichment.service';

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
    'simpl:price': { '@type': 'xsd:decimal', '@value': 0 },
    'simpl:priceType': 'free',
  },
  'simpl:providerInformation': {
    'simpl:providedBy': 'provider-org',
  },
};

function summary(id: string, name: string): SelfDescriptorModel {
  return {
    selfDescriptionId: id,
    claimsGraphUri0: [id],
    name,
    description: 'summary desc',
    inLanguage: 'en',
    offeringType: 'data',
  };
}

describe('CatalogOfferCardEnrichmentService', () => {
  let service: CatalogOfferCardEnrichmentService;
  let xfscSearch: jasmine.SpyObj<SimplAdvancedSearchService>;

  beforeEach(() => {
    xfscSearch = jasmine.createSpyObj('SimplAdvancedSearchService', ['detailedSearchSD']);

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [CatalogOfferCardEnrichmentService, { provide: SimplAdvancedSearchService, useValue: xfscSearch }],
    });

    service = TestBed.inject(CatalogOfferCardEnrichmentService);
  });

  it('fetches detailedSearchSD and maps to offer card', async () => {
    xfscSearch.detailedSearchSD.and.returnValue(of(flatCorpusOfferingFixture));

    const [card] = await service.enrichPage([summary('did:web:test:offer-1', 'Search name')]);

    expect(xfscSearch.detailedSearchSD).toHaveBeenCalledWith('did:web:test:offer-1');
    expect(card.title).toBe('ABSITA dataset1');
    expect(card.providerLabel).toBe('provider-org');
    expect(card.policyEnrichmentStatus).toBe('ready');
    expect(card.offerSelfDescriptionId).toBe('did:web:test:offer-1');
  });

  it('returns cached card without refetching', async () => {
    xfscSearch.detailedSearchSD.and.returnValue(of(flatCorpusOfferingFixture));

    const items = [summary('did:web:test:offer-1', 'Search name')];
    await service.enrichPage(items);
    await service.enrichPage(items);

    expect(xfscSearch.detailedSearchSD).toHaveBeenCalledTimes(1);
  });

  it('dedupes in-flight requests for the same self-description id', async () => {
    xfscSearch.detailedSearchSD.and.returnValue(of(flatCorpusOfferingFixture).pipe(delay(10)));

    const items = [summary('did:web:test:offer-1', 'Search name')];
    const p1 = service.enrichPage(items);
    const p2 = service.enrichPage(items);
    await Promise.all([p1, p2]);

    expect(xfscSearch.detailedSearchSD).toHaveBeenCalledTimes(1);
  });

  it('returns error placeholder when detailedSearchSD fails', async () => {
    xfscSearch.detailedSearchSD.and.returnValue(throwError(() => new Error('network')));

    const [card] = await service.enrichPage([summary('did:web:test:offer-1', 'Search name')]);

    expect(card.title).toBe('Search name');
    expect(card.policyEnrichmentStatus).toBe('error');
  });

  it('clearCache forces a new fetch', async () => {
    xfscSearch.detailedSearchSD.and.returnValue(of(flatCorpusOfferingFixture));

    const items = [summary('did:web:test:offer-1', 'Search name')];
    await service.enrichPage(items);
    service.clearCache();
    await service.enrichPage(items);

    expect(xfscSearch.detailedSearchSD).toHaveBeenCalledTimes(2);
  });

  it('buildLoadingPlaceholders uses loading status for uncached items', () => {
    const [placeholder] = service.buildLoadingPlaceholders([summary('did:web:test:offer-1', 'Search name')]);

    expect(placeholder.title).toBe('Search name');
    expect(placeholder.policyEnrichmentStatus).toBe('loading');
  });
});
