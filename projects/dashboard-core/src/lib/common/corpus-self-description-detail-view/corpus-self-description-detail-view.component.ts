import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, computed, DestroyRef, inject, input, type OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { toSignal } from '@angular/core/rxjs-interop';
import type { Asset } from '@think-it-labs/edc-connector-client';
import { DashboardStateService } from '../../services/dashboard-state.service';
import { EdcClientService } from '../../services/edc-client.service';
import { ParticipantNameService } from '../../services/participant-name.service';
import { useFixtureMocks } from '../../services/dashboard-mocks.util';
import { applyCorpusDetailDisplayOverrides } from '../../sd/corpus-display-overrides.util';
import {
  loadCorpusSelfDescriptionDetail,
  type CorpusSelfDescriptionDetailFetcher,
} from '../../sd/corpus-self-description-detail.loader';
import type { OfferSelfDescriptionDetailViewModel } from '../../sd/corpus-offering-self-description.mapper';
import {
  CorpusSelfDescriptionDetailLayoutComponent,
  type CorpusSelfDescriptionLayoutMode,
} from '../corpus-self-description-detail-layout/corpus-self-description-detail-layout.component';
import type { BreadcrumbItem } from '../breadcrumbs/breadcrumbs.component';
import { finalize, tap } from 'rxjs';

@Component({
  selector: 'lib-corpus-self-description-detail-view',
  standalone: true,
  imports: [CommonModule, CorpusSelfDescriptionDetailLayoutComponent],
  templateUrl: './corpus-self-description-detail-view.component.html',
})
export class CorpusSelfDescriptionDetailViewComponent implements OnInit {
  readonly xfsc = input.required<CorpusSelfDescriptionDetailFetcher>();
  private readonly edc = inject(EdcClientService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dashboardState = inject(DashboardStateService);
  private readonly participantNameService = inject(ParticipantNameService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly selfDescriptionId = input.required<string>();
  readonly edcAssetId = input<string | undefined>();
  readonly edcAsset = input<Asset | undefined>();
  readonly titleOverride = input<string | undefined>();
  readonly providerLabelOverride = input<string | undefined>();
  readonly offeringTypeLabelOverride = input<string | undefined>();
  readonly listDateDisplay = input('');
  readonly embeddedInModal = input(false);
  readonly breadcrumbItemsTranslated = input<BreadcrumbItem[]>([]);
  readonly backRoute = input('/assets');
  readonly backLabelKey = input('assets.detail.backToList');
  readonly layoutMode = input<CorpusSelfDescriptionLayoutMode>('asset');
  readonly showDeleteOffer = input(false);
  readonly deleteOfferDisabled = input(true);

  private readonly currentEdcConfig = toSignal(this.dashboardState.currentEdcConfig$, {
    initialValue: undefined,
  });
  readonly useMocks = computed(() => useFixtureMocks(this.currentEdcConfig()));

  loading = false;
  errorMessageKey: string | undefined;
  vm: OfferSelfDescriptionDetailViewModel | undefined;
  hasLinkedOffers = false;

  ngOnInit(): void {
    this.loading = true;
    this.errorMessageKey = undefined;
    this.vm = undefined;
    this.hasLinkedOffers = false;

    loadCorpusSelfDescriptionDetail({
      sdId: this.selfDescriptionId(),
      useMocks: this.useMocks(),
      xfsc: this.xfsc(),
      edc: this.edc,
      edcAssetId: this.edcAssetId(),
      edcAsset: this.edcAsset(),
    })
      .pipe(
        tap(result => {
          const vm = result.vm;
          this.vm = vm
            ? applyCorpusDetailDisplayOverrides(vm, {
                title: this.titleOverride(),
                providerLabel: this.providerLabelOverride(),
                offeringTypeLabel: this.offeringTypeLabelOverride(),
              })
            : undefined;
          this.hasLinkedOffers = result.hasLinkedOffers;
          this.errorMessageKey = result.errorMessageKey;
          this.cdr.detectChanges();
          void this.resolveProviderLabel();
        }),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  /** providerLabel normally comes as a uid/DID (policy assigner or counter-party id); resolve it to a display name. */
  private async resolveProviderLabel(): Promise<void> {
    const current = this.vm;
    const label = current?.providerLabel?.trim();
    if (!current || !label) {
      return;
    }
    const resolved = await this.participantNameService.getName(label);
    // Ignore if the vm was replaced while the request was in flight.
    if (this.vm !== current) {
      return;
    }
    this.vm = { ...current, providerLabel: resolved || label };
    this.cdr.detectChanges();
  }
}
