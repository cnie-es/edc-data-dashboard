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

import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { JsonObjectTableComponent, JsonValue } from '@eclipse-edc/dashboard-core';
import { compact, TransferProcess } from '@think-it-labs/edc-connector-client';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'lib-transfer-history-details',
  standalone: true,
  imports: [JsonObjectTableComponent, TranslateModule],
  templateUrl: './transfer-history-details.component.html',
})
export class TransferHistoryDetailsComponent implements OnChanges {
  @Input() transferProcess!: TransferProcess;

  compactTransferProcess: Record<string, JsonValue> = {};
  dataDestination: Record<string, JsonValue> | undefined;
  privateProperties: Record<string, JsonValue> | undefined;

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['transferProcess']) {
      await this.updateProperties();
    }
  }

  private async updateProperties() {
    if (this.transferProcess) {
      this.compactTransferProcess = await compact(this.transferProcess);
      if (this.compactTransferProcess['dataDestination']) {
        this.dataDestination = await compact(this.transferProcess.dataDestination);
      } else {
        this.dataDestination = undefined;
      }
      if (this.compactTransferProcess['privateProperties']) {
        this.privateProperties = await compact(this.transferProcess.privateProperties);
      } else {
        this.privateProperties = undefined;
      }
    }
  }
}
