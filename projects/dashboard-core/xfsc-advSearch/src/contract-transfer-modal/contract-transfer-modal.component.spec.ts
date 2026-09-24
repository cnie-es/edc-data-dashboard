import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { SimplAdvancedSearchService } from '../advanced-search.service';
import { ContractNegotiationStateService } from '../state/contract-negotiation-state.service';
import { ResourceSharingMethodStateService } from '../state/resource-sharing-method-state.service';
import { TransferProcessStateService } from '../state/transfer-process-state.service';
import { ContractTransferModalComponent } from './contract-transfer-modal.component';

describe('ContractTransferModalComponent', () => {
  const eligibleSdDocument = {
    credentialSubject: {
      'simpl:edcRegistration': {
        'simpl:assetId': 'asset-001',
        'simpl:contractDefinitionId': 'contract-def-001',
      },
      'simpl:edcConnector': {
        'simpl:providerEndpointURL': 'https://provider.example/protocol',
      },
    },
  };

  it('should load SD, seed finalized negotiation, and start at transfer details', () => {
    const detailsApi = jasmine.createSpyObj<SimplAdvancedSearchService>('SimplAdvancedSearchService', [
      'detailedSearchSD',
    ]);
    const negotiationState = jasmine.createSpyObj<ContractNegotiationStateService>(
      'ContractNegotiationStateService',
      ['resetNegotiationState', 'seedFinalizedNegotiation'],
      {
        negotiationId: 'neg-123',
        negotiationStatus: {
          '@id': 'neg-123',
          state: 'FINALIZED',
          contractAgreementId: 'agr-123',
          counterPartyAddress: 'https://provider.example/protocol',
        },
        isNegotiationFinalized: true,
      },
    );
    const resourceSharingMethodState = jasmine.createSpyObj<ResourceSharingMethodStateService>(
      'ResourceSharingMethodStateService',
      ['initialize', 'resetResourceSharingMethodState'],
      {
        isResourceAddressReady: false,
        refresh$: of(undefined),
      },
    );
    const transferProcessState = jasmine.createSpyObj<TransferProcessStateService>('TransferProcessStateService', [
      'resetTransferState',
    ]);

    detailsApi.detailedSearchSD.and.returnValue(of(eligibleSdDocument));

    TestBed.configureTestingModule({
      imports: [ContractTransferModalComponent, TranslateModule.forRoot()],
      providers: [
        { provide: SimplAdvancedSearchService, useValue: detailsApi },
        { provide: ContractNegotiationStateService, useValue: negotiationState },
        { provide: ResourceSharingMethodStateService, useValue: resourceSharingMethodState },
        { provide: TransferProcessStateService, useValue: transferProcessState },
      ],
    });

    const fixture = TestBed.createComponent(ContractTransferModalComponent);
    fixture.componentRef.setInput('selfDescriptionId', 'did:web:test:offer');
    fixture.componentRef.setInput('negotiationId', 'neg-123');
    fixture.componentRef.setInput('contractAgreementId', 'agr-123');
    fixture.componentRef.setInput('counterPartyAddress', 'https://provider.example/protocol');
    fixture.componentRef.setInput('assetLabel', 'Test asset');
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const translate = TestBed.inject(TranslateService);

    expect(detailsApi.detailedSearchSD).toHaveBeenCalledWith('did:web:test:offer');
    expect(negotiationState.seedFinalizedNegotiation).toHaveBeenCalledWith({
      negotiationId: 'neg-123',
      contractAgreementId: 'agr-123',
      counterPartyAddress: 'https://provider.example/protocol',
    });
    expect(resourceSharingMethodState.initialize).toHaveBeenCalledWith(eligibleSdDocument);
    expect(component.wizardReady).toBeTrue();
    expect(component.transferStep).toBe('transferDetails');
    expect(component.modalTitle).toBe(translate.instant('contractTransfer.titleWithAsset', { asset: 'Test asset' }));
  });

  it('should show error when SD is not eligible for transfer', () => {
    const detailsApi = jasmine.createSpyObj<SimplAdvancedSearchService>('SimplAdvancedSearchService', [
      'detailedSearchSD',
    ]);
    const negotiationState = jasmine.createSpyObj<ContractNegotiationStateService>('ContractNegotiationStateService', [
      'resetNegotiationState',
      'seedFinalizedNegotiation',
    ]);
    const resourceSharingMethodState = jasmine.createSpyObj<ResourceSharingMethodStateService>(
      'ResourceSharingMethodStateService',
      ['initialize', 'resetResourceSharingMethodState'],
    );
    const transferProcessState = jasmine.createSpyObj<TransferProcessStateService>('TransferProcessStateService', [
      'resetTransferState',
    ]);

    detailsApi.detailedSearchSD.and.returnValue(of({ credentialSubject: {} }));

    TestBed.configureTestingModule({
      imports: [ContractTransferModalComponent, TranslateModule.forRoot()],
      providers: [
        { provide: SimplAdvancedSearchService, useValue: detailsApi },
        { provide: ContractNegotiationStateService, useValue: negotiationState },
        { provide: ResourceSharingMethodStateService, useValue: resourceSharingMethodState },
        { provide: TransferProcessStateService, useValue: transferProcessState },
      ],
    });

    const fixture = TestBed.createComponent(ContractTransferModalComponent);
    fixture.componentRef.setInput('selfDescriptionId', 'did:web:test:ineligible');
    fixture.componentRef.setInput('negotiationId', 'neg-123');
    fixture.componentRef.setInput('contractAgreementId', 'agr-123');
    fixture.componentRef.setInput('counterPartyAddress', 'https://provider.example/protocol');
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const translate = TestBed.inject(TranslateService);

    expect(negotiationState.seedFinalizedNegotiation).not.toHaveBeenCalled();
    expect(component.wizardReady).toBeFalse();
    expect(component.errorMessage).toBe(translate.instant('contractTransfer.notEligibleForTransfer'));
  });
});
