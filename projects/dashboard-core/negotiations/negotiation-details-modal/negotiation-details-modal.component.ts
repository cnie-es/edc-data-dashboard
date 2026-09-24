import { DatePipe } from '@angular/common';
import { Component, inject, Input } from '@angular/core';

import { ModalAndAlertService } from '@eclipse-edc/dashboard-core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ContractAgreement, ContractNegotiation } from '@think-it-labs/edc-connector-client';

@Component({
  selector: 'lib-negotiation-details-modal',
  imports: [DatePipe, TranslateModule],
  templateUrl: './negotiation-details-modal.component.html',
  styleUrl: './negotiation-details-modal.component.css',
})
export class NegotiationDetailsModalComponent {
  private readonly modalService = inject(ModalAndAlertService);
  private readonly translate = inject(TranslateService);

  @Input() agreement!: ContractAgreement;
  @Input() negotiation!: ContractNegotiation;
  /** Resolved catalog title when available (from parent negotiations table). */
  @Input() assetDisplayName?: string;
  /** Federated catalogue DID for detail / xfsc GET by id (stored for future navigation). */
  @Input() selfDescriptionId?: string;

  close() {
    this.modalService.closeModal();
  }

  negotiationStateLabel(state: string | undefined): string {
    const raw = state?.trim();
    if (!raw) {
      return '-';
    }
    const key = `negotiation.state.${raw}`;
    const translated = this.translate.instant(key);
    return translated !== key ? translated : `${this.translate.instant('negotiation.stateUnknown')} (${raw})`;
  }

  get assetName(): string {
    const resolved = this.assetDisplayName?.trim();
    if (resolved) {
      return resolved;
    }
    const id = this.agreement?.assetId?.trim();
    if (!id || id.toLowerCase() === 'unknown') {
      return this.translate.instant('negotiation.assetPending');
    }
    return id;
  }

  get description(): string {
    if (this.negotiation?.errorDetail) {
      return this.negotiation.errorDetail;
    }

    return 'Negociación realizada correctamente entre proveedor y consumidor.';
  }
}
