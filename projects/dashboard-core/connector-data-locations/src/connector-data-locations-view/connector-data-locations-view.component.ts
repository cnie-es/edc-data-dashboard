import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreadcrumbsComponent, DashboardStateService, type BreadcrumbItem } from '@eclipse-edc/dashboard-core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

interface RawDataplaneEntry {
  '@id': string;
  url: string;
  allowedSourceTypes: string[];
}

interface ConnectorDataLocation {
  name: string;
  types: string[];
  url: string;
}

const MOCK_DATAPLANE_RESPONSE: RawDataplaneEntry[] = [
  {
    '@id': 'cc8630df-49bd-42e5-8bed-73dc43c5b541',
    url: 'http://localhost:19192/control/v1/dataflows',
    allowedSourceTypes: ['MinioS3', 'HttpData', 'Infrastructure'],
  },
  {
    '@id': '92b45011-856e-46b8-80de-6cb36f80a24e',
    url: 'http://localhost:19192/control/v1/dataflows',
    allowedSourceTypes: ['MinioS3', 'HttpData', 'Infrastructure'],
  },
  {
    '@id': '660b4a68-0eba-480a-b2c7-6b6e79fc6439',
    url: 'http://localhost:19192/control/v1/dataflows',
    allowedSourceTypes: ['MinioS3', 'HttpData', 'Infrastructure'],
  },
];

@Component({
  selector: 'lib-connector-data-locations-view',
  standalone: true,
  imports: [BreadcrumbsComponent, TranslateModule],
  templateUrl: './connector-data-locations-view.component.html',
})
export class ConnectorDataLocationsViewComponent {
  private translate = inject(TranslateService);
  private readonly dashboardState = inject(DashboardStateService);

  private readonly currentEdcConfig = toSignal(this.dashboardState.currentEdcConfig$, {
    initialValue: undefined,
  });

  readonly locations = computed(() => {
    if (this.currentEdcConfig()?.dashboardMocksEnabled !== true) {
      return [];
    }
    return MOCK_DATAPLANE_RESPONSE.map(entry => this.toLocationRow(entry));
  });

  readonly breadcrumbItems: BreadcrumbItem[] = [{ label: 'menu.home', route: '/home' }, { label: 'menu.storage' }];

  get breadcrumbItemsTranslated(): BreadcrumbItem[] {
    return this.breadcrumbItems.map(item => ({
      ...item,
      label: this.translate.instant(item.label),
    }));
  }

  private toLocationRow(entry: RawDataplaneEntry): ConnectorDataLocation {
    return {
      name: entry['@id'],
      types: entry.allowedSourceTypes,
      url: entry.url,
    };
  }
}
