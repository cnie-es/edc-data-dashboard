import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { BreadcrumbsComponent, type BreadcrumbItem } from '@eclipse-edc/dashboard-core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'lib-contract-definitions-toolbar',
  standalone: true,
  imports: [BreadcrumbsComponent, TranslateModule],
  templateUrl: './contract-definitions-toolbar.component.html',
})
export class ContractDefinitionsToolbarComponent {
  @Input({ required: true }) itsPublic = true;
  @Output() goHome = new EventEmitter<void>();
  @Output() createContractDefinition = new EventEmitter<void>();
  @Output() togglePublicCatalog = new EventEmitter<void>();

  private translate = inject(TranslateService);

  readonly breadcrumbItems: BreadcrumbItem[] = [{ label: 'menu.home', route: '/home' }, { label: 'menu.offers' }];

  get breadcrumbItemsTranslated(): BreadcrumbItem[] {
    return this.breadcrumbItems.map(item => ({
      ...item,
      label: this.translate.instant(item.label),
    }));
  }
}
