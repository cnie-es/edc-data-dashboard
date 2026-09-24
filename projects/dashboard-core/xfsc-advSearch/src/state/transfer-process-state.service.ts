import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TransferProcessService } from '../services/transfer-process.service';
import { isStartedFinalizedTemplate } from '../services/transfer-template.util';
import type {
  EdcTransferRequestData,
  TransferProcessStatusResponse,
  UiError,
} from '../types/contract-negotiation.model';
import type { OnDestroy } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TransferProcessStateService implements OnDestroy {
  private readonly transferProcess = inject(TransferProcessService);
  private pollingTimerId: ReturnType<typeof setInterval> | null = null;

  private readonly _transferRequestData = new BehaviorSubject<EdcTransferRequestData | null>(null);
  readonly transferRequestData$ = this._transferRequestData.asObservable();

  private readonly _transferProcessId = new BehaviorSubject<string | null>(null);
  readonly transferProcessId$ = this._transferProcessId.asObservable();

  private readonly _transferProcessStatus = new BehaviorSubject<TransferProcessStatusResponse | null>(null);
  readonly transferProcessStatus$ = this._transferProcessStatus.asObservable();

  private readonly _transferProcessStatusError = new BehaviorSubject<UiError | null>(null);
  readonly transferProcessStatusError$ = this._transferProcessStatusError.asObservable();

  private readonly _isNextTransferProcessStatusLoading = new BehaviorSubject<boolean>(false);
  readonly isNextTransferProcessStatusLoading$ = this._isNextTransferProcessStatusLoading.asObservable();

  private readonly _isTransferProcessFinalized = new BehaviorSubject<boolean>(false);
  readonly isTransferProcessFinalized$ = this._isTransferProcessFinalized.asObservable();

  private readonly _isTransferProcessTerminated = new BehaviorSubject<boolean>(false);
  readonly isTransferProcessTerminated$ = this._isTransferProcessTerminated.asObservable();

  private readonly _isTransferProcessEnded = new BehaviorSubject<boolean>(false);
  readonly isTransferProcessEnded$ = this._isTransferProcessEnded.asObservable();

  get transferRequestData(): EdcTransferRequestData | null {
    return this._transferRequestData.getValue();
  }

  get transferProcessId(): string | null {
    return this._transferProcessId.getValue();
  }

  get transferProcessStatus(): TransferProcessStatusResponse | null {
    return this._transferProcessStatus.getValue();
  }

  get transferProcessStatusError(): UiError | null {
    return this._transferProcessStatusError.getValue();
  }

  get isNextTransferProcessStatusLoading(): boolean {
    return this._isNextTransferProcessStatusLoading.getValue();
  }

  get isTransferProcessFinalized(): boolean {
    return this._isTransferProcessFinalized.getValue();
  }

  get isTransferProcessTerminated(): boolean {
    return this._isTransferProcessTerminated.getValue();
  }

  get isTransferProcessEnded(): boolean {
    return this._isTransferProcessEnded.getValue();
  }

  setTransferRequestData(transferRequestData: EdcTransferRequestData | null): void {
    this._transferRequestData.next(transferRequestData);
  }

  setTransferProcessId(transferProcessId: string | null): void {
    this._transferProcessId.next(transferProcessId);
  }

  setTransferProcessStatus(status: TransferProcessStatusResponse | null): void {
    this._transferProcessStatus.next(status);
    this.syncDerivedState();
  }

  initiateTransferProcess(): void {
    const transferRequestData = this._transferRequestData.getValue();
    if (!transferRequestData) {
      return;
    }

    this.transferProcess.startTransferProcess(transferRequestData).subscribe({
      next: response => {
        this._transferProcessId.next(response.transferProcessId);
        this.resumePolling();
      },
      error: error => {
        this._transferProcessStatusError.next(error);
        this.syncDerivedState();
        this.pausePolling();
      },
    });
  }

  fetchNewTransferProcessStatus(): void {
    const transferProcessId = this._transferProcessId.getValue();
    if (!transferProcessId || this._isNextTransferProcessStatusLoading.getValue()) {
      return;
    }

    this._isNextTransferProcessStatusLoading.next(true);
    this.transferProcess.fetchTransferProcessStatus(transferProcessId).subscribe({
      next: status => {
        this._transferProcessStatus.next(status);
        this._isNextTransferProcessStatusLoading.next(false);
        this.syncDerivedState();
        if (this._isTransferProcessEnded.getValue()) {
          this.pausePolling();
        }
      },
      error: error => {
        this._transferProcessStatusError.next(error);
        this._isNextTransferProcessStatusLoading.next(false);
        this.syncDerivedState();
        this.pausePolling();
      },
    });
  }

  resumePolling(): void {
    if (this.pollingTimerId !== null || !this._transferProcessId.getValue()) {
      return;
    }

    this.pollingTimerId = setInterval(() => {
      if (this._transferProcessId.getValue() && !this._isNextTransferProcessStatusLoading.getValue()) {
        this.fetchNewTransferProcessStatus();
      }
      if (this._isTransferProcessEnded.getValue()) {
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

  resetTransferState(): void {
    this._transferRequestData.next(null);
    this._transferProcessId.next(null);
    this._transferProcessStatus.next(null);
    this._transferProcessStatusError.next(null);
    this._isNextTransferProcessStatusLoading.next(false);
    this.syncDerivedState();
    this.pausePolling();
  }

  ngOnDestroy(): void {
    this.pausePolling();
  }

  private syncDerivedState(): void {
    const status = this._transferProcessStatus.getValue();
    const templateId = this._transferRequestData.getValue()?.templateId;
    const isStartedSuccess = isStartedFinalizedTemplate(templateId) && status?.state === 'STARTED';
    const isFinalized = isStartedSuccess || status?.state === 'COMPLETED' || status?.state === 'DEPROVISIONED';
    const isTerminated = status?.state === 'TERMINATED';
    const isEnded = isFinalized || isTerminated || !!this._transferProcessStatusError.getValue();

    this._isTransferProcessFinalized.next(isFinalized);
    this._isTransferProcessTerminated.next(isTerminated);
    this._isTransferProcessEnded.next(isEnded);
  }
}
