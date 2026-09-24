import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PendingPaymentAgreement } from './payment-approval.service';

@Component({
  selector: 'lib-pending-payment-card',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './pending-payment-card.component.html',
})
export class PendingPaymentCardComponent {
  @Input() agreement!: PendingPaymentAgreement;
  @Input() isProcessing = false;

  @Output() confirmEvent = new EventEmitter<string>();
  @Output() rejectEvent = new EventEmitter<string>();
}
