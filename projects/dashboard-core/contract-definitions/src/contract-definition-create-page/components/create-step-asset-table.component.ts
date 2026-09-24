import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FilterInputComponent } from '@eclipse-edc/dashboard-core';
import type { CreateAssetRow } from '../create-page.types';
import { ContractDefinitionsFilterBarComponent } from '../../contract-definitions-view/components/contract-definitions-filter-bar.component';
import {
  ContractDefinitionsFiltersModalComponent,
  type FilterSelectionChangeEvent,
} from '../../contract-definitions-view/components/contract-definitions-filters-modal.component';
import {
  FILTER_CATEGORY_LABELS,
  PRICE_FILTER_OPTIONS,
  VISIBILITY_FILTER_OPTIONS,
  type AppliedFilterChip,
  type FilterCategory,
  type FilterOption,
  type PriceFilter,
  type VisibilityFilter,
} from '../../contract-definitions-ui.constants';
import { assetTypeFilterLabel, priceFilterLabel, visibilityFilterLabel } from '../../offer-list-filter.util';

@Component({
  selector: 'lib-create-step-asset-table',
  standalone: true,
  imports: [FilterInputComponent, ContractDefinitionsFilterBarComponent, ContractDefinitionsFiltersModalComponent],
  templateUrl: './create-step-asset-table.component.html',
})
export class CreateStepAssetTableComponent {
  @Input({ required: true }) rows: CreateAssetRow[] = [];
  @Input() selectedAssetId: string | null = null;
  @Input() sortDirection: 'asc' | 'desc' = 'desc';

  @Output() searchChanged = new EventEmitter<string>();
  @Output() toggleSort = new EventEmitter<void>();
  @Output() selectAsset = new EventEmitter<string>();
  @Output() saveAndContinue = new EventEmitter<void>();

  readonly assetTypeOptions: FilterOption[] = [];
  readonly visibilityOptions = VISIBILITY_FILTER_OPTIONS;
  readonly priceOptions = PRICE_FILTER_OPTIONS;

  private draftAssetTypes = new Set<string>();
  private draftVisibility: VisibilityFilter = 'all';
  private draftPrice: PriceFilter = 'all';
  private appliedAssetTypes = new Set<string>();
  private appliedVisibility: VisibilityFilter = 'all';
  private appliedPrice: PriceFilter = 'all';

  @ViewChild(ContractDefinitionsFiltersModalComponent)
  private filtersModal?: ContractDefinitionsFiltersModalComponent;

  openFiltersModal() {
    this.draftAssetTypes = new Set(this.appliedAssetTypes);
    this.draftVisibility = this.appliedVisibility;
    this.draftPrice = this.appliedPrice;
    this.filtersModal?.open();
  }

  closeFiltersModal() {
    this.filtersModal?.close();
  }

  toggleFilterSelection({ value, checked }: FilterSelectionChangeEvent) {
    if (checked) {
      this.draftAssetTypes.add(value);
    } else {
      this.draftAssetTypes.delete(value);
    }
  }

  draftVisibilityChanged(value: VisibilityFilter) {
    this.draftVisibility = value;
  }

  draftPriceChanged(value: PriceFilter) {
    this.draftPrice = value;
  }

  applyFilters() {
    this.appliedAssetTypes = new Set(this.draftAssetTypes);
    this.appliedVisibility = this.draftVisibility;
    this.appliedPrice = this.draftPrice;
    this.closeFiltersModal();
  }

  clearSingleFilterChip(category: FilterCategory, value: string) {
    if (category === 'assetType') {
      this.appliedAssetTypes.delete(value);
      this.appliedAssetTypes = new Set(this.appliedAssetTypes);
    } else if (category === 'visibility') {
      this.appliedVisibility = 'all';
    } else if (category === 'price') {
      this.appliedPrice = 'all';
    }
  }

  get selectedAssetTypeDraftValues(): string[] {
    return [...this.draftAssetTypes];
  }

  get selectedVisibilityDraft(): VisibilityFilter {
    return this.draftVisibility;
  }

  get selectedPriceDraft(): PriceFilter {
    return this.draftPrice;
  }

  get appliedFilterChips(): AppliedFilterChip[] {
    const chips: AppliedFilterChip[] = [];

    for (const value of this.appliedAssetTypes) {
      chips.push({
        category: 'assetType',
        value,
        categoryLabel: FILTER_CATEGORY_LABELS.assetType,
        label: assetTypeFilterLabel(value),
      });
    }

    if (this.appliedVisibility !== 'all') {
      chips.push({
        category: 'visibility',
        value: this.appliedVisibility,
        categoryLabel: FILTER_CATEGORY_LABELS.visibility,
        label: visibilityFilterLabel(this.appliedVisibility),
      });
    }

    if (this.appliedPrice !== 'all') {
      chips.push({
        category: 'price',
        value: this.appliedPrice,
        categoryLabel: FILTER_CATEGORY_LABELS.price,
        label: priceFilterLabel(this.appliedPrice),
      });
    }

    return chips;
  }
}
