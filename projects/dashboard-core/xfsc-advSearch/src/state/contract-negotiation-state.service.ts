import { Injectable, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ContractConsumptionService } from '../services/contract-consumption.service';
import type {
  ContractNegotiationRequestData,
  ContractNegotiationStatusResponse,
  UiError,
} from '../types/contract-negotiation.model';

@Injectable({
  providedIn: 'root',
})
export class ContractNegotiationStateService implements OnDestroy {
  private readonly contractConsumption = inject(ContractConsumptionService);
  private pollingTimerId: ReturnType<typeof setInterval> | null = null;

  private readonly _negotiationData = new BehaviorSubject<ContractNegotiationRequestData | null>(null);
  readonly negotiationData$ = this._negotiationData.asObservable();

  private readonly _negotiationId = new BehaviorSubject<string | null>(null);
  readonly negotiationId$ = this._negotiationId.asObservable();

  private readonly _negotiationStatus = new BehaviorSubject<ContractNegotiationStatusResponse | null>(null);
  readonly negotiationStatus$ = this._negotiationStatus.asObservable();

  private readonly _negotiationStatusError = new BehaviorSubject<UiError | null>(null);
  readonly negotiationStatusError$ = this._negotiationStatusError.asObservable();

  private readonly _isNextNegotiationStatusLoading = new BehaviorSubject<boolean>(false);
  readonly isNextNegotiationStatusLoading$ = this._isNextNegotiationStatusLoading.asObservable();

  private readonly _isNegotiationFinalized = new BehaviorSubject<boolean>(false);
  readonly isNegotiationFinalized$ = this._isNegotiationFinalized.asObservable();

  private readonly _isNegotiationTerminated = new BehaviorSubject<boolean>(false);
  readonly isNegotiationTerminated$ = this._isNegotiationTerminated.asObservable();

  private readonly _isNegotiationEnded = new BehaviorSubject<boolean>(false);
  readonly isNegotiationEnded$ = this._isNegotiationEnded.asObservable();

  private isPaidAsset = false;

  get negotiationData(): ContractNegotiationRequestData | null {
    return this._negotiationData.getValue();
  }

  get negotiationId(): string | null {
    return this._negotiationId.getValue();
  }

  get negotiationStatus(): ContractNegotiationStatusResponse | null {
    return this._negotiationStatus.getValue();
  }

  get negotiationStatusError(): UiError | null {
    return this._negotiationStatusError.getValue();
  }

  get isNextNegotiationStatusLoading(): boolean {
    return this._isNextNegotiationStatusLoading.getValue();
  }

  get isNegotiationFinalized(): boolean {
    return this._isNegotiationFinalized.getValue();
  }

  get isNegotiationTerminated(): boolean {
    return this._isNegotiationTerminated.getValue();
  }

  get isNegotiationEnded(): boolean {
    return this._isNegotiationEnded.getValue();
  }

  setNegotiationData(negotiationData: ContractNegotiationRequestData | null, isPaidAsset: boolean): void {
    this.isPaidAsset = isPaidAsset;
    this._negotiationData.next(negotiationData);
  }

  setNegotiationId(negotiationId: string | null): void {
    this._negotiationId.next(negotiationId);
  }

  setNegotiationStatus(status: ContractNegotiationStatusResponse | null): void {
    this._negotiationStatus.next(status);
    this.syncDerivedState();
  }

  seedFinalizedNegotiation(params: {
    negotiationId: string;
    contractAgreementId: string;
    counterPartyAddress: string;
  }): void {
    this.pausePolling();
    this._negotiationStatusError.next(null);
    this._isNextNegotiationStatusLoading.next(false);
    this._negotiationId.next(params.negotiationId);
    this._negotiationStatus.next({
      '@id': params.negotiationId,
      state: 'FINALIZED',
      contractAgreementId: params.contractAgreementId,
      counterPartyAddress: params.counterPartyAddress,
    });
    this.syncDerivedState();
  }

  initiateNegotiation(): void {
    const negotiationData = this._negotiationData.getValue();
    if (!negotiationData) {
      return;
    }

    this.contractConsumption.startContractNegotiation(negotiationData).subscribe({
      next: response => {
        this._negotiationId.next(response.contractNegotiationId);
        this.resumePolling();
      },
      error: error => {
        this._negotiationStatusError.next(error);
        this.syncDerivedState();
        this.pausePolling();
      },
    });
  }

  fetchNewNegotiationStatus(): void {
    const negotiationId = this._negotiationId.getValue();
    if (!negotiationId || this._isNextNegotiationStatusLoading.getValue()) {
      return;
    }

    this._isNextNegotiationStatusLoading.next(true);
    this.contractConsumption.fetchContractNegotiationStatus(negotiationId).subscribe({
      next: status => {
        this._negotiationStatus.next(status);
        this._isNextNegotiationStatusLoading.next(false);
        this.syncDerivedState();
        if (this._isNegotiationEnded.getValue()) {
          this.pausePolling();
        }
      },
      error: error => {
        this._negotiationStatusError.next(error);
        this._isNextNegotiationStatusLoading.next(false);
        this.syncDerivedState();
        this.pausePolling();
      },
    });
  }

  resumePolling(): void {
    if (this.pollingTimerId !== null || !this._negotiationId.getValue()) {
      return;
    }

    this.pollingTimerId = setInterval(() => {
      if (this._negotiationId.getValue() && !this._isNextNegotiationStatusLoading.getValue()) {
        this.fetchNewNegotiationStatus();
      }
      if (this._isNegotiationEnded.getValue()) {
        this.pausePolling();
      }
    }, 3000);
  }

  pausePolling(): void {
    if (this.pollingTimerId === null) {
      return;
    }
    clearInterval(this.pollingTimerId);
    this.pollingTimerId = null;
  }

  resetNegotiationState(): void {
    this._negotiationData.next(null);
    this._negotiationId.next(null);
    this._negotiationStatus.next(null);
    this._negotiationStatusError.next(null);
    this._isNextNegotiationStatusLoading.next(false);
    this.syncDerivedState();
    this.pausePolling();
  }

  ngOnDestroy(): void {
    this.pausePolling();
  }

  private syncDerivedState(): void {
    const status = this._negotiationStatus.getValue();

    const isFinalized = status?.state === 'FINALIZED';
    const isTerminated = status?.state === 'TERMINATED';
    const isVerified = status?.state === 'VERIFIED'; //
    const isEnded =
      isFinalized || isTerminated || !!this._negotiationStatusError.getValue() || (isVerified && this.isPaidAsset);

    this._isNegotiationFinalized.next(isFinalized);
    this._isNegotiationTerminated.next(isTerminated);
    this._isNegotiationEnded.next(isEnded);
  }
}
