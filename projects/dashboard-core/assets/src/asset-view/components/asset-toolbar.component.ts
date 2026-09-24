import { Component, inject } from '@angular/core';
import { BreadcrumbsComponent, type BreadcrumbItem } from '@eclipse-edc/dashboard-core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'lib-asset-toolbar',
  standalone: true,
  imports: [BreadcrumbsComponent, TranslateModule],
  templateUrl: './asset-toolbar.component.html',
})
export class AssetToolbarComponent {
  private translate = inject(TranslateService);

  readonly breadcrumbItems: BreadcrumbItem[] = [{ label: 'menu.home', route: '/home' }, { label: 'menu.assets' }];

  get breadcrumbItemsTranslated(): BreadcrumbItem[] {
    return this.breadcrumbItems.map(item => ({
      ...item,
      label: this.translate.instant(item.label),
    }));
  }
}
