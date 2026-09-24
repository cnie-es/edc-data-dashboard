import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FilterInputComponent } from '@eclipse-edc/dashboard-core';
import type { AppliedFilterChip } from '../../contract-definitions-ui.constants';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'lib-contract-definitions-filter-bar',
  standalone: true,
  imports: [FilterInputComponent, TranslateModule],
  templateUrl: './contract-definitions-filter-bar.component.html',
})
export class ContractDefinitionsFilterBarComponent {
  @Input({ required: true }) selectedSort: 'title' | 'newest' | 'type' = 'title';
  @Input({ required: true }) appliedFilterChips: AppliedFilterChip[] = [];
  @Input() showSearchAndSort = true;

  @Output() openFiltersModal = new EventEmitter<void>();
  @Output() removeFilterChip = new EventEmitter<AppliedFilterChip>();
  @Output() searchChanged = new EventEmitter<string>();
  @Output() sortChanged = new EventEmitter<string>();
}
