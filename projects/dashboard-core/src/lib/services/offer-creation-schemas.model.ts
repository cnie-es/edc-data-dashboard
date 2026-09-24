/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

/** Session key for passing schema metadata from offer creation to SD Tooling (read once, then cleared). */
export const OFFER_CREATION_PENDING_SCHEMA_STORAGE_KEY = 'edcDashboard.sdtooling.pendingSchema';

export interface OfferCreationSchemaItem {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  version?: string;
  resourceType?: string;
}

export interface OfferCreationSchemasCatalog {
  schemas: OfferCreationSchemaItem[];
}

/** Payload written to sessionStorage before navigating to `/sdtooling?schemaId=…`. */
export interface OfferCreationPendingSchemaPayload {
  id: string;
  resourceType: string;
  label: string;
}
