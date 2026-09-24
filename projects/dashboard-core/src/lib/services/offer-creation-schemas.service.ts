/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { map, switchMap, take } from 'rxjs';
import type { EdcConfig } from '../models/edc-config';
import { resolveSdToolingV2BaseUrl } from '../sd-tooling/sd-resource-descriptions.model';
import { DashboardStateService } from './dashboard-state.service';
import type { OfferCreationSchemaItem, OfferCreationSchemasCatalog } from './offer-creation-schemas.model';

@Injectable({
  providedIn: 'root',
})
export class OfferCreationSchemasService {
  private readonly http = inject(HttpClient);
  private readonly dashboardState = inject(DashboardStateService);

  /**
   * Fetches the offer-creation schema catalog (`{ schemas: [...] }`, root array, or SD Tooling `Service`/`Contract` lists).
   * URL: `currentEdcConfig.offerCreationSchemasUrl` when set; otherwise `${resolveSdToolingV2BaseUrl(sdToolingApiBaseUrl)}/schemas`.
   */
  fetchCatalog(): Observable<OfferCreationSchemasCatalog> {
    return this.dashboardState.currentEdcConfig$.pipe(
      take(1),
      switchMap((config: EdcConfig | undefined) => {
        const override = config?.offerCreationSchemasUrl?.trim();
        const url = override || `${resolveSdToolingV2BaseUrl(config?.sdToolingApiBaseUrl)}/schemas`;
        return this.http.get<unknown>(url).pipe(map(body => this.parseCatalog(body)));
      }),
    );
  }

  private parseCatalog(body: unknown): OfferCreationSchemasCatalog {
    if (Array.isArray(body)) {
      return { schemas: this.schemaItemsFromArray(body) };
    }
    const rec = body && typeof body === 'object' ? (body as Record<string, unknown>) : undefined;
    if (!rec) {
      return { schemas: [] };
    }
    const fromSchemas = this.schemaItemsFromArray(rec['schemas']);
    if (fromSchemas.length > 0) {
      return { schemas: fromSchemas };
    }
    const service = Array.isArray(rec['Service']) ? rec['Service'] : [];
    const contract = Array.isArray(rec['Contract']) ? rec['Contract'] : [];
    const merged = [...service, ...contract];
    return { schemas: this.schemaItemsFromArray(merged) };
  }

  private schemaItemsFromArray(raw: unknown): OfferCreationSchemaItem[] {
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.map(n => this.asSchemaItem(n)).filter((s): s is OfferCreationSchemaItem => !!s);
  }

  private asSchemaItem(value: unknown): OfferCreationSchemaItem | undefined {
    if (!value || typeof value !== 'object') {
      return undefined;
    }
    const o = value as Record<string, unknown>;
    const id = typeof o['id'] === 'string' ? o['id'] : '';
    if (!id) {
      return undefined;
    }
    const item: OfferCreationSchemaItem = { id };
    if (typeof o['name'] === 'string') {
      item.name = o['name'];
    }
    if (typeof o['title'] === 'string') {
      item.title = o['title'];
    }
    if (typeof o['description'] === 'string') {
      item.description = o['description'];
    }
    if (typeof o['version'] === 'string') {
      item.version = o['version'];
    }
    if (typeof o['resourceType'] === 'string') {
      item.resourceType = o['resourceType'];
    }
    return item;
  }
}
