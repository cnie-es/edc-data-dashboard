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

import { Component, inject, type OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AssetService } from '../asset.service';
import type { Asset } from '@think-it-labs/edc-connector-client';
import { debounceTime, distinctUntilChanged, of, Subject, takeUntil, type Observable } from 'rxjs';
import {
  DashboardStateService,
  getAssetSdId,
  JsonldViewerComponent,
  ModalAndAlertService,
  SdMatchedAssetsWarmupService,
} from '@eclipse-edc/dashboard-core';
import { formatAssetCreatedAtDdMmYyyy, getAssetCreatedAtTimestamp } from '../utils/asset-created-at-ddmmyyyy.util';
import { AssetToolbarComponent } from './components/asset-toolbar.component';
import { AssetFilterBarComponent } from './components/asset-filter-bar.component';
import { AssetTableComponent } from './components/asset-table.component';
import type { AssetTableRow } from './asset-table-row.model';

@Component({
  selector: 'lib-asset-view',
  standalone: true,
  imports: [AssetToolbarComponent, AssetFilterBarComponent, AssetTableComponent],
  templateUrl: './asset-view.component.html',
  styleUrl: './asset-view.component.css',
})
export class AssetViewComponent implements OnDestroy {
  private static readonly EDC_NS = 'https://w3id.org/edc/v0.0.1/ns/';

  private readonly assetService = inject(AssetService);
  private readonly assetsWarmup = inject(SdMatchedAssetsWarmupService);
  private readonly modalAndAlertService = inject(ModalAndAlertService);
  private readonly stateService = inject(DashboardStateService);
  private readonly router = inject(Router);

  private readonly destroy$ = new Subject<void>();
  private readonly searchInput$ = new Subject<string>();

  rows$: Observable<AssetTableRow[]> = of([]);
  filteredRows$: Observable<AssetTableRow[]> = of([]);
  pageRows$: Observable<AssetTableRow[]> = of([]);
  fetched = false;
  readonly pageItemCount = 5;
  selectedSort = 'newest';
  private allRows: AssetTableRow[] = [];
  private lastSearchText = '';
  private fetchRunSequence = 0;

  constructor() {
    this.searchInput$
      .pipe(debounceTime(450), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(searchText => {
        this.lastSearchText = searchText;
        this.applyFilterAndSort();
      });
    this.stateService.currentEdcConfig$.pipe(takeUntil(this.destroy$)).subscribe(this.fetchAssets.bind(this));
  }

  filter(searchText: string) {
    this.searchInput$.next((searchText || '').trim());
  }

  paginationEvent(pageItems: AssetTableRow[]) {
    this.pageRows$ = of(pageItems);
  }

  sortChanged(sortValue: string) {
    this.selectedSort = sortValue;
    this.applyFilterAndSort();
  }

  openDetails(row: AssetTableRow) {
    const asset = row.sourceAsset;
    if (!asset) {
      this.modalAndAlertService.openModal(JsonldViewerComponent, { jsonLdObject: row.detailPayload });
      return;
    }
    const sdId = this.resolveSelfDescriptionIdFromAsset(asset);
    if (!sdId) {
      this.modalAndAlertService.openModal(JsonldViewerComponent, { jsonLdObject: row.detailPayload });
      return;
    }
    void this.router.navigate(['/assets', 'self-descriptions', sdId], {
      state: { edcAssetId: row.id, listDateDisplay: row.creationDate },
    });
  }

  private resolveSelfDescriptionIdFromAsset(asset: Asset): string | undefined {
    const fromSd = getAssetSdId(asset);
    if (fromSd && fromSd.trim().length > 0) {
      return fromSd.trim();
    }
    const props = asset.properties as Record<string, unknown> | undefined;
    const o1 = props?.['offer.offerID'];
    if (typeof o1 === 'string' && o1.trim().length > 0) {
      return o1.trim();
    }
    const o2 = props?.['offer.offer_id'];
    if (typeof o2 === 'string' && o2.trim().length > 0) {
      return o2.trim();
    }
    return undefined;
  }

  private fetchAssets() {
    const fetchRun = ++this.fetchRunSequence;
    console.debug('[AssetViewComponent][temp] fetchAssets start', { fetchRun });
    this.fetched = false;
    this.rows$ = this.filteredRows$ = this.pageRows$ = of([]);
    void this.loadRowsForActiveSource(fetchRun);
  }

  private applyFilterAndSort() {
    const lower = this.safeText(this.lastSearchText).toLowerCase().trim();
    let rows = [...this.allRows];
    if (lower.length > 0) {
      rows = rows.filter(
        row =>
          this.safeText(row.id).toLowerCase().includes(lower) ||
          this.safeText(row.assetName).toLowerCase().includes(lower) ||
          this.safeText(row.type).toLowerCase().includes(lower) ||
          this.safeText(row.description).toLowerCase().includes(lower),
      );
    }
    if (this.selectedSort === 'title') {
      rows.sort((a, b) => this.safeText(a.assetName).localeCompare(this.safeText(b.assetName)));
    } else if (this.selectedSort === 'type') {
      rows.sort((a, b) => this.safeText(a.type).localeCompare(this.safeText(b.type)));
    } else {
      rows.sort((a, b) => {
        const aTime = Number.isNaN(a.creationTimestamp) ? -Infinity : a.creationTimestamp;
        const bTime = Number.isNaN(b.creationTimestamp) ? -Infinity : b.creationTimestamp;
        return bTime - aTime;
      });
    }
    this.filteredRows$ = of(rows);
    this.pageRows$ = of(rows.slice(0, this.pageItemCount));
  }

  private async loadRowsForActiveSource(fetchRun: number): Promise<void> {
    const snapshot = await this.assetService.getAssetsCacheSnapshotOrLoad();
    if (!this.isActiveFetchRun(fetchRun)) {
      console.debug('[AssetViewComponent][temp] skipping stale fetch run after cache read', { fetchRun });
      return;
    }

    if (!snapshot || snapshot.data.length === 0) {
      console.debug('[AssetViewComponent][temp] assets cache miss/empty; rendering empty state', { fetchRun });
      this.updateRows([], 'cache-empty', fetchRun);
      this.completeInitialLoad(fetchRun, 'cache-empty');
      return;
    }

    console.debug('[AssetViewComponent][temp] assets cache hit', {
      fetchRun,
      cachedCount: snapshot.data.length,
      fetchedAt: snapshot.fetchedAt,
      expiresAt: snapshot.expiresAt,
      isRefreshing: snapshot.isRefreshing,
    });

    const cachedRows = this.mapAssetsToRows(snapshot.data, fetchRun, 'cache');
    this.updateRows(cachedRows, 'cache', fetchRun);
    this.completeInitialLoad(fetchRun, 'cache');

    const isStale = snapshot.expiresAt <= Date.now();
    console.debug('[AssetViewComponent][temp] assets cache stale check', {
      fetchRun,
      isStale,
      expiresAt: snapshot.expiresAt,
      now: Date.now(),
    });

    if (!isStale) {
      return;
    }

    console.debug('[AssetViewComponent][temp] stale cache detected; refreshing assets cache', { fetchRun });
    try {
      // Repopulate the shared `assets/request` cache with the SD-matched subset (same source the offers
      // list reads). Calling AssetService.refreshAssetsCache() here would overwrite it with every
      // connector asset, so the list would show assets that shouldn't appear.
      await this.assetsWarmup.run({ trigger: 'asset-view-stale' });
      if (!this.isActiveFetchRun(fetchRun)) {
        console.debug('[AssetViewComponent][temp] skipping stale fetch run after refresh', { fetchRun });
        return;
      }
      const refreshedSnapshot = await this.assetService.getAssetsCacheSnapshotOrLoad();
      if (!this.isActiveFetchRun(fetchRun)) {
        console.debug('[AssetViewComponent][temp] skipping stale fetch run after refresh snapshot read', { fetchRun });
        return;
      }
      const refreshedRows = this.mapAssetsToRows(refreshedSnapshot?.data ?? [], fetchRun, 'refresh');
      this.updateRows(refreshedRows, 'refresh', fetchRun);
      console.debug('[AssetViewComponent][temp] refresh completed', {
        fetchRun,
        previousCount: cachedRows.length,
        refreshedCount: refreshedRows.length,
      });
    } catch (error) {
      console.debug('[AssetViewComponent][temp] refresh failed; keeping cached rows', { fetchRun, error });
    }
  }

  private isActiveFetchRun(fetchRun: number): boolean {
    return fetchRun === this.fetchRunSequence;
  }

  private updateRows(rows: AssetTableRow[], source: 'cache-empty' | 'cache' | 'refresh', fetchRun: number): void {
    this.allRows = rows;
    this.rows$ = of(this.allRows);
    this.applyFilterAndSort();
    console.debug('[AssetViewComponent][temp] rows updated', { fetchRun, source, rowCount: rows.length });
  }

  private completeInitialLoad(fetchRun: number, source: 'cache-empty' | 'cache'): void {
    this.fetched = true;
    console.debug('[AssetViewComponent][temp] fetchAssets end', { fetchRun, source, fetched: this.fetched });
  }

  private mapAssetsToRows(assets: readonly Asset[], fetchRun: number, source: 'cache' | 'refresh'): AssetTableRow[] {
    const rows = assets.map(asset => this.toTableRow(asset));
    console.debug('[AssetViewComponent][temp] assets mapped', {
      fetchRun,
      source,
      assetCount: assets.length,
      rowCount: rows.length,
    });
    return rows;
  }

  private toTableRow(asset: Asset): AssetTableRow {
    const normalizedId = this.getAssetId(asset);
    const typeLabel =
      this.getPropertyValue(asset, 'assetType') ??
      this.getPropertyValue(asset, 'assetTypeId') ??
      this.getAssetType(asset) ??
      '-';
    const objectName = this.getObjectName(asset);
    const assetName =
      this.getPropertyValue(asset, 'assetTitle') ??
      this.getPropertyValue(asset, 'simpl:name') ??
      this.getPropertyValue(asset, 'name') ??
      objectName ??
      normalizedId;
    const description =
      this.getPropertyValue(asset, 'assetDescription') ??
      this.getPropertyValue(asset, 'simpl:description') ??
      this.getPropertyValue(asset, 'offer.offerDescription') ??
      this.getPropertyValue(asset, 'description') ??
      '-';
    return {
      id: normalizedId,
      creationDate: formatAssetCreatedAtDdMmYyyy(asset),
      creationTimestamp: getAssetCreatedAtTimestamp(asset),
      type: typeLabel,
      assetName,
      description,
      detailPayload: asset,
      sourceAsset: asset,
    };
  }

  private getAssetId(asset: Asset): string {
    const directId = typeof asset.id === 'string' ? asset.id.trim() : '';
    if (directId.length > 0) {
      return directId;
    }

    const jsonLdId = this.readJsonLdValue((asset as Record<string, unknown>)['@id'])?.trim();
    if (jsonLdId && jsonLdId.length > 0) {
      return jsonLdId;
    }

    const propertyId = this.getPropertyValue(asset, 'id')?.trim();
    if (propertyId && propertyId.length > 0) {
      return propertyId;
    }

    const fallbackName = this.getPropertyValue(asset, 'name')?.trim();
    if (fallbackName && fallbackName.length > 0) {
      return fallbackName;
    }

    return 'unknown-asset';
  }

  private safeText(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private getAssetType(asset: Asset): string | undefined {
    const candidate = this.readJsonLdValue((asset as Record<string, unknown>)['@type']);
    return this.toShortType(candidate);
  }

  private getObjectName(asset: Asset): string | undefined {
    return this.getDataAddressValue(asset, 'objectName');
  }

  private getPropertyValue(asset: Asset, key: string): string | undefined {
    const properties = asset.properties as {
      optionalValue?: <T>(ns: string, prop: string) => T | undefined;
    };

    if (typeof properties?.optionalValue === 'function') {
      const fromOptional = properties.optionalValue<string>('edc', key);
      if (fromOptional) {
        return fromOptional;
      }
    }

    const propertiesRecord = asset.properties as Record<string, unknown> | undefined;
    const direct = this.readJsonLdValue(propertiesRecord?.[key]);
    if (direct) {
      return direct;
    }

    const expandedKey = `${AssetViewComponent.EDC_NS}${key}`;
    const expanded = this.readJsonLdValue(propertiesRecord?.[expandedKey]);
    if (expanded) {
      return expanded;
    }

    const expandedProperties = this.readFirstObject(
      (asset as Record<string, unknown>)[`${AssetViewComponent.EDC_NS}properties`],
    );
    return this.readJsonLdValue(expandedProperties?.[expandedKey] ?? expandedProperties?.[key]);
  }

  private getDataAddressValue(asset: Asset, key: string): string | undefined {
    const dataAddress = asset.dataAddress as {
      optionalValue?: <T>(ns: string, prop: string) => T | undefined;
    };

    if (typeof dataAddress?.optionalValue === 'function') {
      const fromOptional = dataAddress.optionalValue<string>('edc', key);
      if (fromOptional) {
        return fromOptional;
      }
    }

    const dataAddressRecord = asset.dataAddress as Record<string, unknown> | undefined;
    const direct = this.readJsonLdValue(dataAddressRecord?.[key]);
    if (direct) {
      return direct;
    }

    const expandedKey = `${AssetViewComponent.EDC_NS}${key}`;
    const expanded = this.readJsonLdValue(dataAddressRecord?.[expandedKey]);
    if (expanded) {
      return expanded;
    }

    const expandedDataAddress = this.readFirstObject(
      (asset as Record<string, unknown>)[`${AssetViewComponent.EDC_NS}dataAddress`],
    );
    return this.readJsonLdValue(expandedDataAddress?.[expandedKey] ?? expandedDataAddress?.[key]);
  }

  private readJsonLdValue(value: unknown): string | undefined {
    if (typeof value === 'string') {
      return value;
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        const normalized = this.readJsonLdValue(entry);
        if (normalized) {
          return normalized;
        }
      }
      return undefined;
    }
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    const record = value as Record<string, unknown>;
    const scalar = record['@value'];
    if (typeof scalar === 'string') {
      return scalar;
    }

    const identifier = record['@id'];
    if (typeof identifier === 'string') {
      return identifier;
    }

    return undefined;
  }

  private readFirstObject(value: unknown): Record<string, unknown> | undefined {
    if (Array.isArray(value)) {
      const first = value[0];
      return first && typeof first === 'object' ? (first as Record<string, unknown>) : undefined;
    }
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
  }

  private toShortType(value: string | undefined): string | undefined {
    if (!value) {
      return undefined;
    }
    const parts = value.split('/');
    return parts[parts.length - 1] || value;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
