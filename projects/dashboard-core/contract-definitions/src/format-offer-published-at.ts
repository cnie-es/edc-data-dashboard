/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/**
 * Formats an ISO or parseable date string like the Mis ofertas cards (Spanish day / month / year).
 */
export function formatOfferPublishedAt(dateValue: string): string {
  const trimmed = dateValue.trim();
  if (!trimmed) {
    return '';
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }
  return `${parsed.getDate()} ${MONTHS_ES[parsed.getMonth()]} ${parsed.getFullYear()}`;
}
