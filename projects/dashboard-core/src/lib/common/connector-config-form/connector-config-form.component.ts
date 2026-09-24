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

import { Component, EventEmitter, Output, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EdcClientService } from '../../services/edc-client.service';
import { DashboardErrorService } from '../../services/dashboard-error.service';
import { DashboardStateService } from '../../services/dashboard-state.service';
import { NgClass } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { EdcConfig } from '../../models/edc-config';
import { EdcConnectorClient, HealthStatus } from '@think-it-labs/edc-connector-client';
import { AlertComponent } from '../alert/alert.component';
import { DID_WEB_REGEX, URL_REGEX } from '../../models/constants';

@Component({
  selector: 'lib-connector-config-form',
  templateUrl: './connector-config-form.component.html',
  imports: [ReactiveFormsModule, NgClass, AlertComponent, TranslateModule],
})
export class ConnectorConfigFormComponent {
  private readonly edc = inject(EdcClientService);
  private readonly stateService = inject(DashboardStateService);
  private readonly dashboardError = inject(DashboardErrorService);

  @Output() created = new EventEmitter<void>();

  connectorForm: FormGroup = new FormGroup({
    connectorName: new FormControl('', Validators.required),
    managementUrl: new FormControl('', [Validators.required, Validators.pattern(URL_REGEX)]),
    defaultUrl: new FormControl('', [Validators.required, Validators.pattern(URL_REGEX)]),
    protocolUrl: new FormControl('', [Validators.required, Validators.pattern(URL_REGEX)]),
    federatedCatalogEnabled: new FormControl(false),
    identityHubEnabled: new FormControl(false),
  });

  fcEnabled = false;
  ihEnabled = false;
  loading = false;
  errorMessageKey?: string;
  errorParams?: Record<string, string | number>;

  onFederatedCatalogToggle() {
    this.fcEnabled = !this.fcEnabled;
    if (this.fcEnabled) {
      this.connectorForm.addControl(
        'federatedCatalogUrl',
        new FormControl('', [Validators.required, Validators.pattern(URL_REGEX)]),
      );
    } else {
      this.connectorForm.removeControl('federatedCatalogUrl');
    }
  }

  onIdentityHubToggle() {
    this.ihEnabled = !this.ihEnabled;
    if (this.ihEnabled) {
      this.connectorForm.addControl(
        'did',
        new FormControl('', [Validators.required, Validators.pattern(DID_WEB_REGEX)]),
      );
    } else {
      this.connectorForm.removeControl('did');
    }
  }

  async addConnector() {
    const edcConfig: EdcConfig = {
      connectorName: this.connectorForm.value.connectorName,
      managementUrl: this.connectorForm.value.managementUrl,
      defaultUrl: this.connectorForm.value.defaultUrl,
      protocolUrl: this.connectorForm.value.protocolUrl,
      federatedCatalogEnabled: this.connectorForm.value.federatedCatalogEnabled,
    };
    if (edcConfig.federatedCatalogEnabled) {
      edcConfig.federatedCatalogUrl = this.connectorForm.value.federatedCatalogUrl;
    }
    if (this.connectorForm.value.identityHubEnabled) {
      edcConfig.did = this.connectorForm.value.did;
    }

    const client: EdcConnectorClient = await this.edc.createEdcConnectorClient(edcConfig);
    this.loading = true;
    try {
      const status: HealthStatus = await client.observability.checkHealth();
      if (status.isSystemHealthy) {
        this.stateService.addLocalStorageEdcConfig(edcConfig);
        this.created.emit();
      } else {
        this.errorMessageKey = 'connectorConfig.errors.unhealthy';
        this.errorParams = undefined;
      }
    } catch (error) {
      const resolved = this.dashboardError.showInline(error, { domain: 'connectorConfig' });
      if (resolved.messageKey === 'common.errors.generic') {
        this.errorMessageKey = 'connectorConfig.errors.unreachable';
        this.errorParams = { defaultUrl: edcConfig.defaultUrl };
      } else {
        this.errorMessageKey = resolved.messageKey;
        this.errorParams = resolved.params;
      }
    } finally {
      this.loading = false;
    }
  }
}
