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

import { Component, OnInit, inject } from '@angular/core';
import { DashboardAppComponent, EdcConfig } from '@eclipse-edc/dashboard-core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AppConfig } from '../../projects/dashboard-core/src/lib/models/app-config';
import { AppMenuConfigService } from './services/app-menu-config.service';
import { GeneralTokenService } from './services/general-token.service';
import Keycloak, { type KeycloakTokenParsed } from 'keycloak-js';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
import { LoadingService } from './services/loading.service';
import { AsyncPipe } from '@angular/common';

interface UserInfoClaims {
  given_name?: string;
  family_name?: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  imports: [DashboardAppComponent, AsyncPipe],
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly appMenuConfigService = inject(AppMenuConfigService);
  private readonly generalTokenService = inject(GeneralTokenService);
  private readonly keycloak = inject(Keycloak);

  router = inject(Router);
  loadingService = inject(LoadingService);

  edcConfigs?: Promise<EdcConfig[]>;
  appConfig?: Promise<AppConfig>;
  userInfo?: UserInfoClaims;
  readonly handleLogout = async () => {
    await this.generalTokenService.logout();
  };

  ngOnInit() {
    this.edcConfigs = firstValueFrom(this.http.get<EdcConfig[]>('config/edc-connector-config.json'));
    this.appConfig = this.appMenuConfigService.getFilteredAppConfig();
    this.userInfo = this.extractUserInfoClaims();

    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.loadingService.show();
      }

      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        this.loadingService.hide();
      }
    });
  }

  private extractUserInfoClaims(): UserInfoClaims | undefined {
    const parsedToken = this.keycloak.tokenParsed as (KeycloakTokenParsed & UserInfoClaims) | undefined;
    if (!parsedToken) {
      return undefined;
    }
    return {
      given_name: parsedToken.given_name,
      family_name: parsedToken.family_name,
    };
  }
}
