import { CommonModule } from '@angular/common';
import { Component, inject, type OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  CorpusSelfDescriptionDetailViewComponent,
  decodeSdRouteParam,
  findEdcAssetByConnectorId,
  type BreadcrumbItem,
} from '@eclipse-edc/dashboard-core';
import { AssetService } from '../asset.service';
import type { Asset } from '@think-it-labs/edc-connector-client';
import { SimplAdvancedSearchService } from '@eclipse-edc/dashboard-core/xfsc-advSearch';
import { map } from 'rxjs';

export interface AssetSelfDescriptionListNavigationState {
  edcAssetId?: string;
  listDateDisplay?: string;
}

function readAssetListNavigationState(router: Router): AssetSelfDescriptionListNavigationState | undefined {
  const fromNav = router.getCurrentNavigation()?.extras?.state;
  if (fromNav && typeof fromNav === 'object' && ('edcAssetId' in fromNav || 'listDateDisplay' in fromNav)) {
    return fromNav as AssetSelfDescriptionListNavigationState;
  }
  if (typeof history !== 'undefined' && history.state && typeof history.state === 'object') {
    const h = history.state as Record<string, unknown>;
    if ('edcAssetId' in h || 'listDateDisplay' in h) {
      return h as AssetSelfDescriptionListNavigationState;
    }
  }
  return undefined;
}

@Component({
  selector: 'lib-asset-self-description-detail-page',
  standalone: true,
  imports: [CommonModule, CorpusSelfDescriptionDetailViewComponent, TranslateModule],
  templateUrl: './asset-self-description-detail-page.component.html',
  styleUrl: './asset-self-description-detail-page.component.css',
})
export class AssetSelfDescriptionDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly xfsc = inject(SimplAdvancedSearchService);
  private readonly assetService = inject(AssetService);
  private readonly translate = inject(TranslateService);

  readonly edcAssetIdFromList: string | undefined;
  readonly listDateDisplay: string;

  selfDescriptionId = '';
  invalidRoute = false;
  edcAssetFromList: Asset | undefined;

  readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: 'menu.home', route: '/home' },
    { label: 'menu.assets', route: '/assets' },
    { label: 'assets.detail.breadcrumbCurrent' },
  ];

  constructor() {
    const listState = readAssetListNavigationState(this.router);
    const aid = listState?.edcAssetId;
    this.edcAssetIdFromList = typeof aid === 'string' && aid.trim().length > 0 ? aid.trim() : undefined;
    const d = listState?.listDateDisplay;
    this.listDateDisplay = typeof d === 'string' ? d.trim() : '';
  }

  get breadcrumbItemsTranslated(): BreadcrumbItem[] {
    return this.breadcrumbItems.map(item => ({
      ...item,
      label: this.translate.instant(item.label),
    }));
  }

  async ngOnInit(): Promise<void> {
    await this.loadEdcAssetFromList();
    this.route.paramMap.pipe(map(pm => decodeSdRouteParam(pm.get('sdId') ?? ''))).subscribe(sdId => {
      if (!sdId) {
        this.invalidRoute = true;
        this.selfDescriptionId = '';
        return;
      }
      this.invalidRoute = false;
      this.selfDescriptionId = sdId;
    });
  }

  private async loadEdcAssetFromList(): Promise<void> {
    const assetId = this.edcAssetIdFromList;
    if (!assetId) {
      this.edcAssetFromList = undefined;
      return;
    }
    try {
      const snapshot = await this.assetService.getAssetsCacheSnapshotOrLoad();
      this.edcAssetFromList = findEdcAssetByConnectorId(snapshot?.data ?? [], assetId);
    } catch {
      this.edcAssetFromList = undefined;
    }
  }
}
