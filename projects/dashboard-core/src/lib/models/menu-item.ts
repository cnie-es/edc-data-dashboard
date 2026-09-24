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

export interface MenuItem {
  textKey?: string;
  descriptionKey?: string;

  // legacy (para migración progresiva)
  text?: string;
  viewDescription?: string;

  materialSymbol: string;
  routerPath: string;
  divider?: boolean;
  isGroupTitle?: boolean;
  imagePath?: string;
}
