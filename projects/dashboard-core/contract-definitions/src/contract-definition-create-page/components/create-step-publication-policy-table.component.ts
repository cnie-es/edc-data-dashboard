import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FilterInputComponent } from '@eclipse-edc/dashboard-core';
import type { CreatePolicyRow } from '../create-page.types';

@Component({
  selector: 'lib-create-step-publication-policy-table',
  standalone: true,
  imports: [FilterInputComponent],
  templateUrl: './create-step-publication-policy-table.component.html',
})
export class CreateStepPublicationPolicyTableComponent {
  @Input({ required: true }) rows: CreatePolicyRow[] = [];
  @Input() selectedPolicyId: string | null = null;
  @Input() sortDirection: 'asc' | 'desc' = 'desc';

  @Output() searchChanged = new EventEmitter<string>();
  @Output() toggleSort = new EventEmitter<void>();
  @Output() selectPolicy = new EventEmitter<string>();
  @Output() previous = new EventEmitter<void>();
  @Output() saveAndContinue = new EventEmitter<void>();
}
