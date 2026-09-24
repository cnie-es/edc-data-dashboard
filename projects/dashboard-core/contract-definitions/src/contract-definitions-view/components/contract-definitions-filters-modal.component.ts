import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import type {
  FilterOption,
  PriceFilter,
  RadioFilterOption,
  VisibilityFilter,
} from '../../contract-definitions-ui.constants';
import { TranslateModule } from '@ngx-translate/core';
export interface FilterSelectionChangeEvent {
  category: 'assetType';
  value: string;
  checked: boolean;
}

@Component({
  selector: 'lib-contract-definitions-filters-modal',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './contract-definitions-filters-modal.component.html',
})
export class ContractDefinitionsFiltersModalComponent {
  @ViewChild('filtersDialog') private filtersDialog?: ElementRef<HTMLDialogElement>;

  @Input({ required: true }) assetTypeOptions: FilterOption[] = [];
  @Input({ required: true }) visibilityOptions: RadioFilterOption<VisibilityFilter>[] = [];
  @Input({ required: true }) priceOptions: RadioFilterOption<PriceFilter>[] = [];
  @Input({ required: true }) selectedAssetTypeValues: string[] = [];
  @Input({ required: true }) selectedVisibility: VisibilityFilter = 'all';
  @Input({ required: true }) selectedPrice: PriceFilter = 'all';

  @Output() selectionChanged = new EventEmitter<FilterSelectionChangeEvent>();
  @Output() visibilityChanged = new EventEmitter<VisibilityFilter>();
  @Output() priceChanged = new EventEmitter<PriceFilter>();
  @Output() apply = new EventEmitter<void>();

  open(): void {
    this.filtersDialog?.nativeElement.showModal();
  }

  close(): void {
    this.filtersDialog?.nativeElement.close();
  }

  isAssetTypeSelected(value: string): boolean {
    return this.selectedAssetTypeValues.includes(value);
  }

  onVisibilityChange(value: string): void {
    this.visibilityChanged.emit(value as VisibilityFilter);
  }

  onPriceChange(value: string): void {
    this.priceChanged.emit(value as PriceFilter);
  }
}
