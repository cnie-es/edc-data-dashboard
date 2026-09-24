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

import { Component, Input } from '@angular/core';

export type ListLoadingVariant = 'grid' | 'centered' | 'table';

@Component({
  selector: 'lib-list-loading-state',
  standalone: true,
  templateUrl: './list-loading-state.component.html',
})
export class ListLoadingStateComponent {
  @Input({ required: true }) fetched = false;
  @Input() variant: ListLoadingVariant = 'centered';
  @Input() colspan = 1;
  @Input() error = false;
}
