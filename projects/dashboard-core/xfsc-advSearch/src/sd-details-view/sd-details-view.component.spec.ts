import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { OwnOfferSelfDescriptionsService, ParticipantNameService } from '@eclipse-edc/dashboard-core';
import { SdDetailsViewComponent } from './sd-details-view.component';
import { SimplAdvancedSearchService } from '../advanced-search.service';
import { ContractConsumptionService } from '../services/contract-consumption.service';
import { ContractNegotiationStateService } from '../state/contract-negotiation-state.service';

describe('SdDetailsViewComponent', () => {
  function createNegotiationStateSpy(isNegotiationFinalized = false, overrides: Record<string, unknown> = {}) {
    return jasmine.createSpyObj<ContractNegotiationStateService>(
      'ContractNegotiationStateService',
      ['resetNegotiationState', 'setNegotiationData', 'initiateNegotiation'],
      {
        negotiationId: null,
        negotiationStatus: null,
        negotiationStatusError: null,
        isNegotiationEnded: false,
        isNegotiationFinalized,
        isNegotiationTerminated: false,
        ...overrides,
      },
    );
  }

  it('should map id/description and policy tables from API response', () => {
    const detailsApi = jasmine.createSpyObj<SimplAdvancedSearchService>('SimplAdvancedSearchService', [
      'detailedSearchSD',
    ]);
    const contractConsumption = jasmine.createSpyObj<ContractConsumptionService>('ContractConsumptionService', [
      'getCatalogOffers',
    ]);
    const negotiationState = createNegotiationStateSpy();
    detailsApi.detailedSearchSD.and.returnValue(
      of({
        credentialSubject: {
          'simpl:edcRegistration': {
            'simpl:assetId': 'asset-001',
            'simpl:contractDefinitionId': 'contract-def-001',
          },
          'simpl:edcConnector': {
            'simpl:providerEndpointURL': 'https://provider.example/protocol',
          },
          'simpl:generalServiceProperties': {
            'simpl:description': 'dataset description',
          },
          'simpl:offeringPrice': {
            'simpl:currency': 'EUR',
            'simpl:price': { '@value': 0 },
            'simpl:priceType': 'free',
          },
          'simpl:servicePolicy': {
            'simpl:access-policy':
              '{"permission":[{"assignee":{"uid":"EDNEL_PARTICIPANT"},"action":["http://simpl.eu/odrl/actions/consume"],"constraint":[{"leftOperand":"http://www.w3.org/ns/odrl/2/dateTime","operator":"http://www.w3.org/ns/odrl/2/gteq","rightOperand":"2026-02-01T14:38:40Z"},{"leftOperand":"http://www.w3.org/ns/odrl/2/dateTime","operator":"http://www.w3.org/ns/odrl/2/lteq","rightOperand":"2026-03-31T13:39:31Z"}]}]}',
            'simpl:usage-policy':
              '{"permission":[{"assignee":{"uid":"EDNEL_PARTICIPANT"},"action":["http://www.w3.org/ns/odrl/2/use"],"constraint":[{"leftOperand":"http://www.w3.org/ns/odrl/2/count","operator":"http://www.w3.org/ns/odrl/2/lteq","rightOperand":"10"}]}]}',
          },
        },
      }),
    );
    contractConsumption.getCatalogOffers.and.returnValue(of({ offers: [{ '@id': 'offer-001' }] }));

    TestBed.configureTestingModule({
      imports: [SdDetailsViewComponent],
      providers: [
        provideRouter([]),
        { provide: SimplAdvancedSearchService, useValue: detailsApi },
        { provide: ContractConsumptionService, useValue: contractConsumption },
        { provide: ContractNegotiationStateService, useValue: negotiationState },
        { provide: ParticipantNameService, useValue: { getName: (id: string) => Promise.resolve(id) } },
        {
          provide: OwnOfferSelfDescriptionsService,
          useValue: { getOwnSelfDescriptionIds: async () => new Set<string>() },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(
              convertToParamMap({ id: 'did:web:registry.gaia-x.eu:DataOffering:f13e7bcd-548d-4c37-b6ef-a1c3b364846f' }),
            ),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(SdDetailsViewComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.displayShortId).toBe('f13e7bcd-548d-4c37-b6ef-a1c3b364846f');
    expect(component.displayDescription).toBe('dataset description');
    expect(component.isEligibleForNegotiation).toBeTrue();
    expect(component.contractNegotiationData).toEqual({
      providerEndpoint: 'https://provider.example/protocol',
      assetId: 'asset-001',
      contractDefinitionId: 'contract-def-001',
    });
    expect(component.isGetDataDisabled).toBeFalse();

    expect(component.sortedAccessPolicyRows[0].actions).toBe('Consume');
    expect(component.sortedAccessPolicyRows[0].from).toBe('1 de febrero de 2026');
    expect(component.sortedAccessPolicyRows[0].to).toBe('31 de marzo de 2026');

    expect(component.sortedUsagePolicyRows.length).toBeGreaterThan(0);
    expect(component.sortedUsagePolicyRows[0].usageType).toBe('Restricted number of usages');
    expect(component.sortedUsagePolicyRows[0].constraint).toBe('10');
  });

  it('should show no usage policy when usage-policy is absent', () => {
    const detailsApi = jasmine.createSpyObj<SimplAdvancedSearchService>('SimplAdvancedSearchService', [
      'detailedSearchSD',
    ]);
    const contractConsumption = jasmine.createSpyObj<ContractConsumptionService>('ContractConsumptionService', [
      'getCatalogOffers',
    ]);
    const negotiationState = createNegotiationStateSpy();
    detailsApi.detailedSearchSD.and.returnValue(
      of({
        credentialSubject: {
          'simpl:servicePolicy': {
            'simpl:access-policy':
              '{"permission":[{"assignee":{"uid":"USER_A"},"action":["http://simpl.eu/odrl/actions/consume"],"constraint":[]}]}',
          },
        },
      }),
    );
    contractConsumption.getCatalogOffers.and.returnValue(of({ offers: [] }));

    TestBed.configureTestingModule({
      imports: [SdDetailsViewComponent],
      providers: [
        provideRouter([]),
        { provide: SimplAdvancedSearchService, useValue: detailsApi },
        { provide: ContractConsumptionService, useValue: contractConsumption },
        { provide: ContractNegotiationStateService, useValue: negotiationState },
        { provide: ParticipantNameService, useValue: { getName: (id: string) => Promise.resolve(id) } },
        {
          provide: OwnOfferSelfDescriptionsService,
          useValue: { getOwnSelfDescriptionIds: async () => new Set<string>() },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: 'did:web:test:without-usage' })),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(SdDetailsViewComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.sortedUsagePolicyRows.length).toBe(0);
    expect(component.isEligibleForNegotiation).toBeFalse();
    expect(component.contractNegotiationData).toBeNull();
  });

  it('should show Go to Contracts link when negotiation is finalized', () => {
    const detailsApi = jasmine.createSpyObj<SimplAdvancedSearchService>('SimplAdvancedSearchService', [
      'detailedSearchSD',
    ]);
    const contractConsumption = jasmine.createSpyObj<ContractConsumptionService>('ContractConsumptionService', [
      'getCatalogOffers',
    ]);
    const negotiationState = createNegotiationStateSpy(true);
    detailsApi.detailedSearchSD.and.returnValue(
      of({
        credentialSubject: {
          'simpl:edcRegistration': {
            'simpl:assetId': 'asset-001',
            'simpl:contractDefinitionId': 'contract-def-001',
          },
          'simpl:edcConnector': {
            'simpl:providerEndpointURL': 'https://provider.example/protocol',
          },
        },
      }),
    );
    contractConsumption.getCatalogOffers.and.returnValue(of({ offers: [{ '@id': 'offer-001' }] }));

    TestBed.configureTestingModule({
      imports: [SdDetailsViewComponent],
      providers: [
        provideRouter([]),
        { provide: SimplAdvancedSearchService, useValue: detailsApi },
        { provide: ContractConsumptionService, useValue: contractConsumption },
        { provide: ContractNegotiationStateService, useValue: negotiationState },
        { provide: ParticipantNameService, useValue: { getName: (id: string) => Promise.resolve(id) } },
        {
          provide: OwnOfferSelfDescriptionsService,
          useValue: { getOwnSelfDescriptionIds: async () => new Set<string>() },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: 'did:web:test:negotiation-finalized' })),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(SdDetailsViewComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.isTransferWizardVisible = true;
    fixture.detectChanges();

    const contractsLink = fixture.nativeElement.querySelector('a[routerlink="/contracts"]');
    expect(contractsLink).toBeTruthy();
    expect(contractsLink.textContent.trim()).toBe('Go to Contracts');
  });

  it('reports a TERMINATED negotiation as an error, not as pending approval', () => {
    const detailsApi = jasmine.createSpyObj<SimplAdvancedSearchService>('SimplAdvancedSearchService', [
      'detailedSearchSD',
    ]);
    const contractConsumption = jasmine.createSpyObj<ContractConsumptionService>('ContractConsumptionService', [
      'getCatalogOffers',
    ]);
    const negotiationState = createNegotiationStateSpy(false, {
      negotiationId: 'negotiation-001',
      negotiationStatus: {
        '@id': 'negotiation-001',
        state: 'TERMINATED',
        errorDetail: 'Provider refused: self-contracting is not allowed',
      },
      isNegotiationEnded: true,
      isNegotiationTerminated: true,
    });
    detailsApi.detailedSearchSD.and.returnValue(
      of({
        credentialSubject: {
          'simpl:edcRegistration': {
            'simpl:assetId': 'asset-001',
            'simpl:contractDefinitionId': 'contract-def-001',
          },
          'simpl:edcConnector': {
            'simpl:providerEndpointURL': 'https://provider.example/protocol',
          },
        },
      }),
    );
    contractConsumption.getCatalogOffers.and.returnValue(of({ offers: [{ '@id': 'offer-001' }] }));

    TestBed.configureTestingModule({
      imports: [SdDetailsViewComponent],
      providers: [
        provideRouter([]),
        { provide: SimplAdvancedSearchService, useValue: detailsApi },
        { provide: ContractConsumptionService, useValue: contractConsumption },
        { provide: ContractNegotiationStateService, useValue: negotiationState },
        { provide: ParticipantNameService, useValue: { getName: (id: string) => Promise.resolve(id) } },
        {
          provide: OwnOfferSelfDescriptionsService,
          useValue: { getOwnSelfDescriptionIds: async () => new Set<string>() },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: 'did:web:test:negotiation-terminated' })),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(SdDetailsViewComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.isNegotiationTerminated).toBeTrue();
    expect(component.isNegotiationPendingApproval).toBeFalse();
    expect(component.currentNegotiationError?.description).toBe('Provider refused: self-contracting is not allowed');

    component.isTransferWizardVisible = true;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.alert-error')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.alert-success')).toBeNull();
  });

  it('blocks Get data for an offer published by this connector', async () => {
    const detailsApi = jasmine.createSpyObj<SimplAdvancedSearchService>('SimplAdvancedSearchService', [
      'detailedSearchSD',
    ]);
    const contractConsumption = jasmine.createSpyObj<ContractConsumptionService>('ContractConsumptionService', [
      'getCatalogOffers',
    ]);
    const negotiationState = createNegotiationStateSpy();
    detailsApi.detailedSearchSD.and.returnValue(
      of({
        credentialSubject: {
          'simpl:edcRegistration': {
            'simpl:assetId': 'asset-001',
            'simpl:contractDefinitionId': 'contract-def-001',
          },
          'simpl:edcConnector': {
            'simpl:providerEndpointURL': 'https://provider.example/protocol',
          },
        },
      }),
    );
    contractConsumption.getCatalogOffers.and.returnValue(of({ offers: [{ '@id': 'offer-001' }] }));

    TestBed.configureTestingModule({
      imports: [SdDetailsViewComponent],
      providers: [
        provideRouter([]),
        { provide: SimplAdvancedSearchService, useValue: detailsApi },
        { provide: ContractConsumptionService, useValue: contractConsumption },
        { provide: ContractNegotiationStateService, useValue: negotiationState },
        { provide: ParticipantNameService, useValue: { getName: (id: string) => Promise.resolve(id) } },
        {
          provide: OwnOfferSelfDescriptionsService,
          useValue: {
            getOwnSelfDescriptionIds: async () => new Set<string>(['did:web:test:own-offer']),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: 'did:web:test:own-offer' })),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(SdDetailsViewComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    await fixture.whenStable();

    expect(component.isOwnOffer).toBeTrue();
    expect(component.isGetDataDisabled).toBeTrue();
  });
});
