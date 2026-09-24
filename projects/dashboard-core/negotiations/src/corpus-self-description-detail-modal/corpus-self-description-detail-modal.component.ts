import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import type { Asset } from '@think-it-labs/edc-connector-client';
import { CorpusSelfDescriptionDetailViewComponent } from '@eclipse-edc/dashboard-core';
import { SimplAdvancedSearchService } from '@eclipse-edc/dashboard-core/xfsc-advSearch';

@Component({
  selector: 'lib-corpus-self-description-detail-modal',
  standalone: true,
  imports: [CommonModule, CorpusSelfDescriptionDetailViewComponent],
  templateUrl: './corpus-self-description-detail-modal.component.html',
  styleUrl: './corpus-self-description-detail-modal.component.css',
})
export class CorpusSelfDescriptionDetailModalComponent {
  readonly xfsc = inject(SimplAdvancedSearchService);

  readonly selfDescriptionId = input.required<string>();
  readonly edcAssetId = input<string | undefined>();
  readonly edcAsset = input<Asset | undefined>();
  readonly titleOverride = input<string | undefined>();
  readonly providerLabelOverride = input<string | undefined>();
  readonly offeringTypeLabelOverride = input<string | undefined>();
  readonly listDateDisplay = input('');
}
