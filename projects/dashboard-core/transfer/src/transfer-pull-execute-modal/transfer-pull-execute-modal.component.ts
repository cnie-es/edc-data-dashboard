/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

import { Component, Input, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import { TransferProcess } from '@think-it-labs/edc-connector-client';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { ModalAndAlertService } from '@eclipse-edc/dashboard-core';
import { ContractAndTransferService, PullExecutePayload, PullHttpMethod } from '../contract-and-transfer.service';
import { readTransferAssetId } from '../transfer-process-fields.util';

interface QueryParamRow {
  key: string;
  value: string;
}

@Component({
  selector: 'lib-transfer-pull-execute-modal',
  standalone: true,
  imports: [FormsModule, TranslateModule, NgClass],
  templateUrl: './transfer-pull-execute-modal.component.html',
})
export class TransferPullExecuteModalComponent implements OnDestroy {
  private readonly contractAndTransferService = inject(ContractAndTransferService);
  private readonly modalAndAlertService = inject(ModalAndAlertService);
  private readonly translate = inject(TranslateService);
  private readonly destroy$ = new Subject<void>();

  @Input() transferProcess!: TransferProcess;

  httpMethod: PullHttpMethod = 'GET';
  queryParams: QueryParamRow[] = [{ key: '', value: '' }];
  postBody = '';
  executing = false;
  downloadRunning = false;
  progress = 0;
  error = false;

  setMethod(method: PullHttpMethod): void {
    this.httpMethod = method;
  }

  addQueryParam(): void {
    this.queryParams.push({ key: '', value: '' });
  }

  removeQueryParam(index: number): void {
    if (this.queryParams.length <= 1) {
      this.queryParams[0] = { key: '', value: '' };
      return;
    }
    this.queryParams.splice(index, 1);
  }

  buildPayload(): PullExecutePayload {
    const queryParams: Record<string, string> = {};
    for (const row of this.queryParams) {
      const key = row.key.trim();
      if (key) {
        queryParams[key] = row.value;
      }
    }

    let body: unknown;
    if (this.httpMethod === 'POST' && this.postBody.trim()) {
      try {
        body = JSON.parse(this.postBody);
      } catch {
        body = this.postBody;
      }
    }

    return {
      transferId: this.transferProcess.id,
      method: this.httpMethod,
      queryParams,
      body,
    };
  }

  async executeTransfer(): Promise<void> {
    const transferId = this.transferProcess.id;
    if (!transferId) {
      this.modalAndAlertService.showAlert(
        this.translate.instant('transferProcess.pullExecute.missingTransferId'),
        undefined,
        'error',
        5,
      );
      return;
    }

    this.executing = true;
    this.downloadRunning = false;
    this.progress = 0;
    this.error = false;

    try {
      const download$ = await this.contractAndTransferService.executePullTransfer(this.buildPayload());
      this.downloadRunning = true;

      download$.pipe(takeUntil(this.destroy$)).subscribe({
        next: (event: HttpEvent<Blob>) => {
          switch (event.type) {
            case HttpEventType.DownloadProgress:
              if (event.total) {
                this.progress = Math.round((100 * event.loaded) / event.total);
              }
              break;
            case HttpEventType.Response:
              if (event.status < 400 && event.body) {
                this.createDownloadLink(event.body, this.defaultFilename());
                this.progress = 100;
              } else if (event.status >= 400) {
                this.handleExecuteError();
              }
              break;
          }
        },
        error: () => this.handleExecuteError(),
        complete: () => {
          this.executing = false;
          this.downloadRunning = false;
        },
      });
    } catch (error) {
      console.error(error);
      this.modalAndAlertService.showAlert(
        this.translate.instant('transferProcess.pullExecute.fetchEdrFailed'),
        undefined,
        'error',
        5,
      );
      this.executing = false;
      this.downloadRunning = false;
    }
  }

  private defaultFilename(): string {
    const assetId = readTransferAssetId(this.transferProcess);
    if (assetId && assetId.toLowerCase() !== 'unknown') {
      return assetId;
    }
    return `transfer-${this.transferProcess.id ?? 'download'}`;
  }

  private createDownloadLink(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  private handleExecuteError(): void {
    this.error = true;
    this.executing = false;
    this.downloadRunning = false;
    this.modalAndAlertService.showAlert(
      this.translate.instant('transferProcess.pullExecute.executeFailed'),
      undefined,
      'error',
      5,
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
