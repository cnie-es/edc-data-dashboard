/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  This program and the accompanying materials are made available under the
 *  terms of the Apache License, Version 2.0 which is available at
 *  https://www.apache.org/licenses/LICENSE-2.0
 *
 *  SPDX-License-Identifier: Apache-2.0
 *
 *  Contributors:
 *       Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V. - initial API and implementation
 *
 */

import { Component, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BreadcrumbsComponent } from '@eclipse-edc/dashboard-core';
import type { BreadcrumbItem } from '@eclipse-edc/dashboard-core';
import { CatalogOfferSearchListComponent } from '../catalog-offer-search-list/catalog-offer-search-list.component';

@Component({
  selector: 'lib-catalog-view',
  standalone: true,
  imports: [TranslateModule, BreadcrumbsComponent, CatalogOfferSearchListComponent],
  templateUrl: './catalog-view.component.html',
  styleUrl: './catalog-view.component.css',
})
export class CatalogViewComponent {
  private readonly translate = inject(TranslateService);

  readonly breadcrumbItems: BreadcrumbItem[] = [{ label: 'menu.home', route: '/home' }, { label: 'menu.catalog' }];

  get breadcrumbItemsTranslated(): BreadcrumbItem[] {
    return this.breadcrumbItems.map(item => ({
      ...item,
      label: this.translate.instant(item.label),
    }));
  }
}
