/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

/** Strips compact vocabulary prefixes (e.g. `ms:image` → `image`, `omtd:pdf` → `pdf`). */
export function stripCuriePrefix(value: string): string {
  return value.replace(/^[a-zA-Z0-9]+:/, '').trim();
}
