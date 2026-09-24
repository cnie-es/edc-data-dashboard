import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, input, OnDestroy, OnInit, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SimplAdvancedSearchService } from '../advanced-search.service';
import { SdTransferResourceSharingComponent } from '../sd-transfer-resource-sharing/sd-transfer-resource-sharing.component';
import { isEligibleForContractNegotiation } from '../services/contract-negotiation.util';
import { ContractNegotiationStateService } from '../state/contract-negotiation-state.service';
import { ResourceSharingMethodStateService } from '../state/resource-sharing-method-state.service';
import { TransferProcessStateService } from '../state/transfer-process-state.service';
import type { EdcTransferRequestData, UiError } from '../types/contract-negotiation.model';

@Component({
  selector: 'lib-contract-transfer-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule, SdTransferResourceSharingComponent],
  templateUrl: './contract-transfer-modal.component.html',
})
export class ContractTransferModalComponent implements OnInit, OnDestroy {
  private readonly xfsc = inject(SimplAdvancedSearchService);
  private readonly negotiationState = inject(ContractNegotiationStateService);
  private readonly resourceSharingMethodState = inject(ResourceSharingMethodStateService);
  private readonly transferProcessState = inject(TransferProcessStateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);

  readonly selfDescriptionId = input.required<string>();
  readonly negotiationId = input.required<string>();
  readonly contractAgreementId = input.required<string>();
  readonly counterPartyAddress = input.required<string>();
  readonly assetLabel = input<string>();

  readonly closed = output<void>();

  loading = true;
  errorMessage: string | undefined;
  wizardReady = false;
  transferStep: TransferStep = 'transferDetails';
  private sdDocumentContent: unknown;

  readonly transferSteps: {
    id: TransferStep;
    isNextStepAvailable: () => boolean;
  }[] = [
    {
      id: 'transferDetails',
      isNextStepAvailable: () => this.resourceSharingMethodState.isResourceAddressReady,
    },
    {
      id: 'transferProcess',
      isNextStepAvailable: () => this.transferProcessState.isTransferProcessFinalized,
    },
  ];

  get modalTitle(): string {
    const label = this.assetLabel()?.trim();
    if (label) {
      return this.translate.instant('contractTransfer.titleWithAsset', { asset: label });
    }
    return this.translate.instant('contractTransfer.titleDefault');
  }

  get canGoNextTransferStep(): boolean {
    return this.transferSteps.find(step => step.id === this.transferStep)?.isNextStepAvailable() ?? false;
  }

  get currentTransferProcessId(): string {
    return this.transferProcessState.transferProcessId ?? 'N/A';
  }

  get currentTransferProcessStatus(): string {
    return this.transferProcessState.transferProcessStatus?.state ?? 'REQUESTED';
  }

  get currentTransferProcessError(): UiError | null {
    return this.transferProcessState.transferProcessStatusError;
  }

  get isTransferProcessInProgress(): boolean {
    return !!this.transferProcessState.transferProcessId && !this.transferProcessState.isTransferProcessEnded;
  }

  ngOnInit(): void {
    this.resetTransferState();
    this.loadSelfDescription();
  }

  ngOnDestroy(): void {
    this.resetTransferState();
  }

  cancel(): void {
    this.closed.emit();
  }

  goNextTransferStep(): void {
    if (!this.canGoNextTransferStep) {
      return;
    }

    if (this.transferStep === 'transferDetails') {
      const transferRequestData = this.buildTransferRequestData();
      if (!transferRequestData) {
        return;
      }
      this.transferProcessState.setTransferRequestData(transferRequestData);
      this.transferProcessState.initiateTransferProcess();
      this.transferStep = 'transferProcess';
      return;
    }

    this.closed.emit();
  }

  private loadSelfDescription(): void {
    this.loading = true;
    this.errorMessage = undefined;
    this.wizardReady = false;

    this.xfsc
      .detailedSearchSD(this.selfDescriptionId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: content => {
          this.sdDocumentContent = content;
          if (!isEligibleForContractNegotiation(content)) {
            this.loading = false;
            this.errorMessage = this.translate.instant('contractTransfer.notEligibleForTransfer');
            return;
          }
          this.beginTransferWizard(content);
          this.loading = false;
          this.wizardReady = true;
        },
        error: () => {
          this.loading = false;
          this.errorMessage = this.translate.instant('contractTransfer.loadOfferFailed');
        },
      });
  }

  private beginTransferWizard(sdDocument: unknown): void {
    this.negotiationState.resetNegotiationState();
    this.resourceSharingMethodState.resetResourceSharingMethodState();
    this.transferProcessState.resetTransferState();
    this.transferStep = 'transferDetails';

    this.negotiationState.seedFinalizedNegotiation({
      negotiationId: this.negotiationId(),
      contractAgreementId: this.contractAgreementId(),
      counterPartyAddress: this.counterPartyAddress(),
    });
    this.resourceSharingMethodState.initialize(sdDocument);
  }

  private resetTransferState(): void {
    this.negotiationState.resetNegotiationState();
    this.resourceSharingMethodState.resetResourceSharingMethodState();
    this.transferProcessState.resetTransferState();
  }

  private buildTransferRequestData(): EdcTransferRequestData | null {
    const negotiationStatus = this.negotiationState.negotiationStatus;
    const contractAgreementId = negotiationStatus?.contractAgreementId;
    const counterPartyAddress = negotiationStatus?.counterPartyAddress;
    const templateId = this.resourceSharingMethodState.selectedTemplate;
    const dataDestination = this.resourceSharingMethodState.resourceAddress;

    if (!contractAgreementId || !counterPartyAddress || !templateId || !dataDestination) {
      return null;
    }

    return {
      contractAgreementId,
      counterPartyAddress,
      templateId,
      dataDestination,
    };
  }
}

type TransferStep = 'transferDetails' | 'transferProcess';
