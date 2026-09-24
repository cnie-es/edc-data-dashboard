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

import { Component, DestroyRef, inject, type OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import {
  BreadcrumbsComponent,
  type BreadcrumbItem,
  ModalAndAlertService,
  OfferCreationSchemasService,
  OFFER_CREATION_PENDING_SCHEMA_STORAGE_KEY,
  type OfferCreationPendingSchemaPayload,
  type OfferCreationSchemaItem,
  resolveDashboardLang,
} from '@eclipse-edc/dashboard-core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  offerCreateUnavailableToastKey,
  type OfferCreateKind,
  resolveOfferCreateSchemaId,
} from './offer-create-schema-ids';

@Component({
  selector: 'lib-offer-create-selection',
  standalone: true,
  imports: [BreadcrumbsComponent, TranslateModule],
  templateUrl: './offer-create-selection.component.html',
  styleUrl: './offer-create-selection.component.css',
})
export class OfferCreateSelectionComponent implements OnInit {
  private readonly translate = inject(TranslateService);
  private readonly schemasService = inject(OfferCreationSchemasService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalAndAlert = inject(ModalAndAlertService);

  readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: 'menu.home', route: '/home' },
    { label: 'menu.offers', route: '/contract-definitions' },
    { label: 'offers.create' },
  ];

  catalogLoading = true;
  private schemas: OfferCreationSchemaItem[] = [];
  private readonly schemaIds = new Set<string>();

  get breadcrumbItemsTranslated(): BreadcrumbItem[] {
    return this.breadcrumbItems.map(item => ({
      ...item,
      label: this.translate.instant(item.label),
    }));
  }

  ngOnInit(): void {
    this.schemasService
      .fetchCatalog()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: catalog => {
          this.schemas = catalog.schemas;
          this.schemaIds.clear();
          for (const s of catalog.schemas) {
            this.schemaIds.add(s.id);
          }
          this.catalogLoading = false;
        },
        error: () => {
          this.catalogLoading = false;
        },
      });
  }

  onOfferTypeClick(kind: OfferCreateKind): void {
    if (this.catalogLoading) {
      return;
    }
    const lang = resolveDashboardLang(this.translate.currentLang);
    const expectedId = resolveOfferCreateSchemaId(kind, lang);
    if (!this.schemaIds.has(expectedId)) {
      this.showTypeUnavailableToast(kind);
      return;
    }
    const item = this.schemas.find(s => s.id === expectedId);
    if (!item) {
      this.showTypeUnavailableToast(kind);
      return;
    }
    const resourceType = item.resourceType?.trim() || 'data';
    const label = item.title?.trim() || item.name?.trim() || expectedId;
    const payload: OfferCreationPendingSchemaPayload = {
      id: expectedId,
      resourceType,
      label,
    };
    try {
      sessionStorage.setItem(OFFER_CREATION_PENDING_SCHEMA_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      this.showTypeUnavailableToast(kind);
      return;
    }
    void this.router.navigate(['/sdtooling'], { queryParams: { schemaId: expectedId } });
  }

  private showTypeUnavailableToast(kind: OfferCreateKind): void {
    const msg = this.translate.instant(offerCreateUnavailableToastKey(kind));
    try {
      this.modalAndAlert.showAlert(msg, undefined, 'error', 6);
    } catch {
      /* No alert outlet (e.g. isolated tests without dashboard shell). */
    }
  }
}
