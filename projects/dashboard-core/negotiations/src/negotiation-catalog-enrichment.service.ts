import { Injectable, inject } from '@angular/core';
import { Asset, ContractAgreement, ContractNegotiation } from '@think-it-labs/edc-connector-client';
import { firstValueFrom } from 'rxjs';
import { findEdcAssetByConnectorId, resolveSelfDescriptionIdFromEdcAssets } from '@eclipse-edc/dashboard-core';
import { AssetService, resolveAssetCatalogDisplayName } from '@eclipse-edc/dashboard-core/assets';
import {
  normalizeSelfDescriptionSearchItem,
  selfDescriptionIdFromNormalized,
  SimplAdvancedSearchService,
} from '@eclipse-edc/dashboard-core/xfsc-advSearch';
import { NegotiationsService } from './negotiations.service';
import type { CatalogEnrichmentEntry, NegotiationRow } from './negotiation-row.model';

function normalizeAssetLookupKey(assetId: string): string {
  return assetId.trim().toLowerCase();
}

@Injectable({
  providedIn: 'root',
})
export class NegotiationCatalogEnrichmentService {
  private readonly negotiationsService = inject(NegotiationsService);
  private readonly xfscSearch = inject(SimplAdvancedSearchService);
  private readonly assetService = inject(AssetService);

  private readonly cacheByAssetId = new Map<string, CatalogEnrichmentEntry>();
  private readonly inflightCatalogByAssetId = new Map<string, Promise<CatalogEnrichmentEntry>>();
  private allAssetsPromise: Promise<readonly Asset[]> | undefined;

  seedCache(entries: Iterable<[string, CatalogEnrichmentEntry]>): void {
    for (const [assetId, entry] of entries) {
      const key = normalizeAssetLookupKey(assetId);
      if (key) {
        this.cacheByAssetId.set(key, entry);
      }
    }
  }

  clearCache(): void {
    this.cacheByAssetId.clear();
    this.inflightCatalogByAssetId.clear();
    this.allAssetsPromise = undefined;
  }

  getCached(assetId: string): CatalogEnrichmentEntry | undefined {
    return this.cacheByAssetId.get(normalizeAssetLookupKey(assetId));
  }

  /** Resolves self-description id: local EDC asset properties first, then catalog (cached). */
  async resolveSelfDescriptionId(assetId: string, assetPendingLabel: string): Promise<string | undefined> {
    const id = assetId?.trim();
    if (!id) {
      return undefined;
    }
    const entry = await this.resolveEnrichmentEntry(id, assetPendingLabel);
    return entry.selfDescriptionId?.trim() || undefined;
  }

  private async loadLocalAssets(): Promise<readonly Asset[]> {
    // The SD-matched warmup rewrites the shared 'assets/request' cache with ONLY the handful of
    // SD-matched assets, so neither the cache snapshot nor getCachedOrFetchAssets() can resolve
    // arbitrary agreement asset ids. Fetch the full asset list once and memoize it for the
    // lifetime of the enrichment cache (reset on connector change via clearCache()).
    if (!this.allAssetsPromise) {
      this.allAssetsPromise = this.assetService.getAllAssets().catch((err: unknown) => {
        this.allAssetsPromise = undefined; // allow a retry after a failed fetch
        throw err;
      });
    }
    return this.allAssetsPromise;
  }

  private async resolveEdcEnrichmentEntry(
    assetId: string,
    assetPendingLabel: string,
  ): Promise<CatalogEnrichmentEntry | undefined> {
    const assets = await this.loadLocalAssets();
    const asset = assets?.length ? findEdcAssetByConnectorId(assets, assetId) : undefined;
    if (!asset) {
      return undefined;
    }
    // The local EDC asset already carries a human-readable name; surface it even when the
    // asset has no self-description associated (only a minority of assets do). Otherwise the
    // catalog fallback (disabled in most environments) leaves every row on the pending label.
    const displayName = resolveAssetCatalogDisplayName(asset).trim() || assetPendingLabel;
    const selfDescriptionId = resolveSelfDescriptionIdFromEdcAssets(assetId, assets);
    return { displayName, selfDescriptionId };
  }

  /**
   * Resolves agreement + federated catalog name for the given rows (typically current page, max 5).
   */
  async enrichRows(
    rows: NegotiationRow[],
    options: {
      createPlaceholderAgreement: (negotiation: ContractNegotiation) => ContractAgreement;
      assetPendingLabel: string;
    },
  ): Promise<void> {
    const pending = rows.filter(
      row => row.negotiationId && (row.enrichmentStatus === 'idle' || row.enrichmentStatus === 'error'),
    );

    for (const row of pending) {
      row.enrichmentStatus = 'loading';
    }

    await Promise.all(
      pending.map(row => this.enrichOneRow(row, options.createPlaceholderAgreement, options.assetPendingLabel)),
    );
  }

  private async enrichOneRow(
    row: NegotiationRow,
    createPlaceholderAgreement: (negotiation: ContractNegotiation) => ContractAgreement,
    assetPendingLabel: string,
  ): Promise<void> {
    try {
      let agreement: ContractAgreement;
      try {
        agreement = await this.negotiationsService.getAgreementForNegotiation(row.negotiationId);
      } catch {
        agreement = createPlaceholderAgreement(row.negotiation);
        row.agreement = agreement;
        row.displayName = assetPendingLabel;
        row.enrichmentStatus = 'error';
        return;
      }

      row.agreement = agreement;
      const assetId = agreement.assetId?.trim();
      if (!assetId || assetId.toLowerCase() === 'unknown') {
        row.displayName = assetPendingLabel;
        row.enrichmentStatus = 'done';
        return;
      }

      row.assetId = assetId;
      const cached = this.cacheByAssetId.get(normalizeAssetLookupKey(assetId));
      if (cached) {
        this.applyCatalogEntry(row, cached, assetPendingLabel);
        row.enrichmentStatus = 'done';
        return;
      }

      const entry = await this.resolveEnrichmentEntry(assetId, assetPendingLabel);
      this.applyCatalogEntry(row, entry, assetPendingLabel);
      row.enrichmentStatus = 'done';
    } catch {
      row.displayName = assetPendingLabel;
      row.enrichmentStatus = 'error';
    }
  }

  private async resolveEnrichmentEntry(assetId: string, assetPendingLabel: string): Promise<CatalogEnrichmentEntry> {
    const key = normalizeAssetLookupKey(assetId);
    const fromEdc = await this.resolveEdcEnrichmentEntry(assetId, assetPendingLabel);

    // Fully resolved locally (name + self-description): nothing else to do.
    if (fromEdc?.selfDescriptionId) {
      this.cacheByAssetId.set(key, fromEdc);
      return fromEdc;
    }

    // Otherwise consult the catalog: it may provide a self-description id (and/or a better
    // name). Keep the local EDC name whenever the catalog only returns the pending label.
    const fromCatalog = await this.resolveCatalogEntry(assetId, assetPendingLabel);
    const catalogHasRealName = !!fromCatalog.displayName && fromCatalog.displayName !== assetPendingLabel;
    const entry: CatalogEnrichmentEntry = {
      displayName: catalogHasRealName ? fromCatalog.displayName : (fromEdc?.displayName ?? fromCatalog.displayName),
      selfDescriptionId: fromCatalog.selfDescriptionId ?? fromEdc?.selfDescriptionId,
    };
    this.cacheByAssetId.set(key, entry);
    return entry;
  }

  private resolveCatalogEntry(assetId: string, assetPendingLabel: string): Promise<CatalogEnrichmentEntry> {
    const key = normalizeAssetLookupKey(assetId);
    const cached = this.cacheByAssetId.get(key);
    if (cached) {
      return Promise.resolve(cached);
    }

    const inflight = this.inflightCatalogByAssetId.get(key);
    if (inflight) {
      return inflight;
    }

    const promise = this.fetchCatalogEntry(assetId, assetPendingLabel)
      .then(entry => {
        this.cacheByAssetId.set(key, entry);
        return entry;
      })
      .finally(() => {
        this.inflightCatalogByAssetId.delete(key);
      });
    this.inflightCatalogByAssetId.set(key, promise);
    return promise;
  }

  private async fetchCatalogEntry(assetId: string, assetPendingLabel: string): Promise<CatalogEnrichmentEntry> {
    const result = await firstValueFrom(this.xfscSearch.simpleSearchSD(assetId, { page: 1, pageSize: 1 }));
    const first = result.items?.[0];
    if (!first) {
      return { displayName: assetPendingLabel };
    }

    const normalized = normalizeSelfDescriptionSearchItem(first);
    const selfDescriptionId = selfDescriptionIdFromNormalized(normalized);
    const name = normalized.name.trim();
    return {
      displayName: name || assetPendingLabel,
      selfDescriptionId,
    };
  }

  private applyCatalogEntry(row: NegotiationRow, entry: CatalogEnrichmentEntry, assetPendingLabel: string): void {
    row.displayName = entry.displayName.trim() || assetPendingLabel;
    row.selfDescriptionId = entry.selfDescriptionId;
  }
}
