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
 */

import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'lib-item-count-selector',
  templateUrl: './item-count-selector.component.html',
  imports: [],
})
export class ItemCountSelectorComponent {
  @Input() currentItemCount = 10;
  @Output() itemCountChanged = new EventEmitter<number>();

  private readonly translate = inject(TranslateService);

  protected readonly itemCountOptions = [5, 10, 15, 20, 50, 100];

  protected get selectedLabel(): string {
    return this.translate.instant('show_items_per_page', {
      count: this.currentItemCount,
    });
  }

  protected selectItemCount(count: number): void {
    this.currentItemCount = count;
    this.itemCountChanged.emit(count);
    (document.activeElement as HTMLElement)?.blur();
  }
}
