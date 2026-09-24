/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  This program and the accompanying materials are made available under the
 *  terms of the Apache License, Version 2.0 which is available at
 *  https://www.apache.org/licenses/LICENSE-2.0
 *
 *  SPDX-License-Identifier: Apache-2.0
 *
 *  Contributors:
 *       Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V. - initial API and implementation
 *
 */

import { Component, Input, inject } from '@angular/core';

import {
  ContractAgreement,
  ContractNegotiation,
  TransferProcess,
  TransferProcessStates,
} from '@think-it-labs/edc-connector-client';
import { DatePipe, NgClass } from '@angular/common';
import { TransferHistoryDetailsComponent } from '../transfer-history-details/transfer-history-details.component';
import { ListLoadingStateComponent, ModalAndAlertService } from '@eclipse-edc/dashboard-core';
import { ContractAndTransferService } from '../contract-and-transfer.service';
import { TransferPullDownloadComponent } from '../transfer-pull-download/transfer-pull-download.component';
import { TransferPullExecuteModalComponent } from '../transfer-pull-execute-modal/transfer-pull-execute-modal.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { readTransferAssetId, readTransferContractId } from '../transfer-process-fields.util';

@Component({
  selector: 'lib-transfer-history-table',
  standalone: true,
  imports: [NgClass, DatePipe, TranslateModule, ListLoadingStateComponent],
  templateUrl: './transfer-history-table.component.html',
})
export class TransferHistoryTableComponent {
  private readonly modalAndAlertService = inject(ModalAndAlertService);
  private readonly contractAndTransferService = inject(ContractAndTransferService);
  private readonly translate = inject(TranslateService);

  @Input() transferProcesses: TransferProcess[] | null = [];
  @Input() fetched = false;
  @Input() loadFailed = false;
  @Input() filterActive = false;
  @Input() assetDisplayByAssetId: ReadonlyMap<string, string> | null = null;
  @Input() connectorLabelByContractId: ReadonlyMap<string, string> | null = null;
  @Input() assetEnrichmentInProgress = false;
  @Input() isProviderView = false;

  get tableColspan(): number {
    return this.isProviderView ? 5 : 6;
  }

  transferStateLabel(state: string | undefined): string {
    const raw = state?.trim();
    if (!raw) {
      return '-';
    }
    const key = `transferProcess.state.${raw}`;
    const translated = this.translate.instant(key);
    return translated !== key ? translated : `${this.translate.instant('transferProcess.stateUnknown')} (${raw})`;
  }

  /** Same detection as `transferTypeLabel` for Push vs Pull (case-insensitive). */
  isTransferPull(process: TransferProcess): boolean {
    const t = this.transferTypeLabel(process).toLowerCase();
    return t.includes('pull');
  }

  /**
   * Pull treats STARTED as effective completion in the progress UI; mirror that for badges.
   * See `TransferProgressComponent` Pull branch.
   */
  transferStatusBadgeClass(process: TransferProcess): string {
    const state = process.state;
    if (state === TransferProcessStates.COMPLETED) {
      return 'badge-success';
    }
    if (this.isTransferPull(process) && state === TransferProcessStates.STARTED) {
      return 'badge-success';
    }
    if (
      state === TransferProcessStates.TERMINATED ||
      state === TransferProcessStates.DEPROVISIONED ||
      state === TransferProcessStates.SUSPENDED
    ) {
      return 'badge-error';
    }
    if (state === TransferProcessStates.STARTED || state === TransferProcessStates.REQUESTED) {
      return 'badge-info';
    }
    if (state === TransferProcessStates.INITIAL || state === TransferProcessStates.PROVISIONED) {
      return 'badge-warning';
    }
    return 'badge-warning';
  }

  roleLabel(process: TransferProcess): string {
    return process.type === 'PROVIDER' ? 'Proveedor' : 'Consumidor';
  }

  transferTypeLabel(process: TransferProcess): string {
    try {
      return process.mandatoryValue<string>('edc', 'transferType');
    } catch {
      return (process as unknown as { transferType?: string }).transferType ?? '-';
    }
  }

  /** Epoch ms for `stateTimestamp` when present, else `createdAt`. */
  stateDateMs(process: TransferProcess): number {
    try {
      const ts = process.optionalValue('edc', 'stateTimestamp');
      if (typeof ts === 'number' && !Number.isNaN(ts)) {
        return ts;
      }
    } catch {
      /* fall through */
    }
    const rawTs = (process as unknown as { stateTimestamp?: number }).stateTimestamp;
    if (typeof rawTs === 'number' && !Number.isNaN(rawTs)) {
      return rawTs;
    }
    const created = process.createdAt;
    if (typeof created === 'number' && !Number.isNaN(created)) {
      return created;
    }
    return Date.now();
  }

  assetDisplay(process: TransferProcess): string {
    const value = readTransferAssetId(process);
    if (!value || value.toLowerCase() === 'unknown') {
      return this.translate.instant('transferProcess.assetPending');
    }
    const map = this.assetDisplayByAssetId;
    const resolved = map?.get(value.toLowerCase())?.trim();
    const label = (resolved && resolved.length > 0 ? resolved : value).trim();
    return label.length > 0 ? label : this.translate.instant('transferProcess.assetPending');
  }

  isAssetDisplayPending(process: TransferProcess): boolean {
    if (!this.assetEnrichmentInProgress) {
      return false;
    }
    const value = readTransferAssetId(process);
    if (!value || value.toLowerCase() === 'unknown') {
      return true;
    }
    const resolved = this.assetDisplayByAssetId?.get(value.toLowerCase())?.trim();
    return !resolved;
  }

  externalConnectorLabel(process: TransferProcess): string {
    const cid = readTransferContractId(process);
    if (!cid) {
      return this.translate.instant('transferProcess.connectorPending');
    }
    const hit = this.connectorLabelByContractId?.get(cid.toLowerCase())?.trim();
    if (hit) {
      return hit;
    }
    return this.translate.instant('transferProcess.connectorPending');
  }

  private isConsumerPull(process: TransferProcess): boolean {
    return process.type === 'CONSUMER' && this.isTransferPull(process);
  }

  canShowArchivoRecibido(process: TransferProcess): boolean {
    if (!this.isConsumerPull(process)) {
      return false;
    }
    return process.state === TransferProcessStates.COMPLETED;
  }

  /** Consumer Pull in STARTED: ready to execute pull request. */
  canShowPullExecuteIcon(process: TransferProcess): boolean {
    if (!this.isConsumerPull(process)) {
      return false;
    }
    if (this.canShowArchivoRecibido(process)) {
      return false;
    }
    return process.state === TransferProcessStates.STARTED;
  }

  /** Consumer Pull before STARTED: show same link affordance as reference; opens details. */
  canShowPreparedTransferIcon(process: TransferProcess): boolean {
    if (!this.isConsumerPull(process)) {
      return false;
    }
    if (this.canShowArchivoRecibido(process) || this.canShowPullExecuteIcon(process)) {
      return false;
    }
    return process.state === TransferProcessStates.PROVISIONED || process.state === TransferProcessStates.REQUESTED;
  }

  async openArchivoRecibido(process: TransferProcess) {
    try {
      const agreementId = readTransferContractId(process);
      if (!process.id || !agreementId) {
        throw new Error('Missing transfer id or contract id');
      }
      const agreement = await this.contractAndTransferService.getContractAgreement(agreementId);
      const negotiation = await this.contractAndTransferService.getNegotiationByAgreement(agreementId);
      this.modalAndAlertService.openModal(TransferPullDownloadComponent, {
        agreement: agreement as ContractAgreement,
        negotiation: negotiation as ContractNegotiation,
        transferId: process.id,
      });
    } catch (error) {
      console.error(error);
      this.modalAndAlertService.showAlert(
        this.translate.instant('transferProcess.openFileFailed'),
        undefined,
        'error',
        5,
      );
    }
  }

  openPullExecuteModal(process: TransferProcess): void {
    this.modalAndAlertService.openModal(TransferPullExecuteModalComponent, {
      transferProcess: process,
    });
  }

  openDetails(transferProcess: TransferProcess) {
    this.modalAndAlertService.openModal(TransferHistoryDetailsComponent, {
      transferProcess,
    });
  }
}
