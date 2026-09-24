import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'lib-transfer-placeholder-modal',
  standalone: true,
  templateUrl: './transfer-placeholder-modal.component.html',
})
export class TransferPlaceholderModalComponent {
  @Output() canceled = new EventEmitter<void>();
  @Output() transfer = new EventEmitter<void>();
}
