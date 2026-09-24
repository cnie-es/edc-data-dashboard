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
import { DashboardStateService } from '@eclipse-edc/dashboard-core';
import { AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';
import { map } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'lib-home-view',
  imports: [AsyncPipe, TranslateModule, TranslateModule],
  templateUrl: './home-view.component.html',
})
export class HomeViewComponent {
  readonly stateService = inject(DashboardStateService);
  private readonly router = inject(Router);

  catalogItems$ = this.stateService.appConfig$.pipe(
    map(config => config?.menuItems?.filter(i => i.routerPath == 'catalog')),
  );

  operationItems$ = this.stateService.appConfig$.pipe(
    map(config => config?.menuItems?.filter(i => ['contracts', 'transfer-history'].includes(i.routerPath))),
  );

  myItems$ = this.stateService.appConfig$.pipe(
    map(config =>
      config?.menuItems?.filter(i => ['assets', 'policies', 'contract-definitions'].includes(i.routerPath)),
    ),
  );

  async navigate(path: string) {
    await this.router.navigate([path]);
  }

  async navigateToNewOffer() {
    await this.router.navigate(['contract-definitions', 'new']);
  }
}
