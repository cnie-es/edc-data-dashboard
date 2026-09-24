import { Component, inject, signal } from '@angular/core';
import type { OnDestroy, OnInit } from '@angular/core';
import {
  AssetService,
  formatAssetCreatedAtDdMmYyyy,
  resolveAssetCatalogDisplayName,
} from '@eclipse-edc/dashboard-core/assets';
import { AsyncPipe, CommonModule } from '@angular/common';
import type { Observable } from 'rxjs';
import { BehaviorSubject, Subject, debounceTime, distinctUntilChanged, map, switchMap, takeUntil } from 'rxjs';
import { DashboardStateService, PaginationComponent, FilterInputComponent } from '@eclipse-edc/dashboard-core';
import { Router } from '@angular/router';
import type { PolicyUI } from '../policy.models';
import type { Asset } from '@think-it-labs/edc-connector-client';
import { BreadcrumbsComponent, type BreadcrumbItem } from '@eclipse-edc/dashboard-core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PolicyListEnrichmentService } from '../policy-list-enrichment.service';

export type PolicyType = 'Contratación' | 'Publicación' | 'Otro';

function pageRowSignature(rows: PolicyUI[]): string {
  return rows.map(r => r.policyDefinitionId).join('|');
}

@Component({
  selector: 'lib-policy-view',
  standalone: true,
  imports: [AsyncPipe, PaginationComponent, FilterInputComponent, CommonModule, BreadcrumbsComponent, TranslateModule],
  templateUrl: './policy-view.component.html',
  styleUrl: './policy-view.component.css',
})
export class PolicyViewComponent implements OnInit, OnDestroy {
  private readonly assetService = inject(AssetService);
  private readonly router = inject(Router);
  private readonly stateService = inject(DashboardStateService);
  private readonly enrichmentService = inject(PolicyListEnrichmentService);
  private readonly translate = inject(TranslateService);

  private readonly destroy$ = new Subject<void>();
  private readonly searchInput$ = new Subject<string>();
  private readonly pageEnrich$ = new Subject<PolicyUI[]>();
  private readonly rowsSubject = new BehaviorSubject<PolicyUI[]>([]);
  private backgroundEnrichmentToken = 0;
  private readonly filteredRowsSubject = new BehaviorSubject<PolicyUI[]>([]);
  private readonly pageRowsSubject = new BehaviorSubject<PolicyUI[]>([]);

  policies$: Observable<PolicyUI[]> = this.rowsSubject.asObservable();
  filteredPolicies$: Observable<PolicyUI[]> = this.filteredRowsSubject.asObservable();
  pagePolicies$: Observable<PolicyUI[]> = this.pageRowsSubject.asObservable();

  readonly pageItemCount = 5;

  filterType = signal<'all' | PolicyType>('all');
  private searchTerm = '';

  get breadcrumbItemsTranslated(): BreadcrumbItem[] {
    return [
      { label: this.translate.instant('menu.home'), route: '/home' },
      { label: this.translate.instant('menu.policies') },
    ];
  }

  readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: this.translate.instant('menu.home'), route: '/home' },
    { label: this.translate.instant('menu.policies') },
  ];

  ngOnInit() {
    this.setupPageEnrichment();
    this.searchInput$.pipe(debounceTime(450), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(text => {
      this.searchTerm = text.toLowerCase();
      this.publishFilteredAndPage(true);
    });
    this.translate.onLangChange.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.relabelAllRowsOnLangChange();
    });
    this.stateService.currentEdcConfig$.pipe(takeUntil(this.destroy$)).subscribe(config => {
      this.enrichmentService.setEdcConfig(config);
      this.enrichmentService.clearCache();
      void this.loadPoliciesFromAssetCache();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupPageEnrichment(): void {
    this.pageEnrich$
      .pipe(
        debounceTime(300),
        map(pageRows => ({ pageRows, sig: pageRowSignature(pageRows) })),
        distinctUntilChanged((a, b) => a.sig === b.sig),
        switchMap(({ pageRows }) => {
          const snapshot = pageRows.map(row => ({ ...row }));
          return this.enrichmentService
            .enrichPageRows(snapshot, this.translate)
            .then(() => snapshot)
            .catch(() => snapshot);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(enriched => {
        this.mergeEnrichedRows(enriched);
        void this.enrichBackgroundRows();
      });
  }

  private async enrichBackgroundRows(): Promise<void> {
    const token = ++this.backgroundEnrichmentToken;
    const pageIds = new Set(this.pageRowsSubject.value.map(row => row.id));
    const pending = this.rowsSubject.value.filter(
      row => !pageIds.has(row.id) && (row.enrichmentStatus === 'idle' || row.enrichmentStatus === 'error'),
    );

    for (let i = 0; i < pending.length; i += this.pageItemCount) {
      if (token !== this.backgroundEnrichmentToken) {
        return;
      }
      const batch = pending.slice(i, i + this.pageItemCount);
      await this.enrichmentService.enrichPageRows(batch, this.translate).catch(() => undefined);
      if (token !== this.backgroundEnrichmentToken) {
        return;
      }
      this.mergeEnrichedRows(batch);
    }
  }

  private relabelAllRowsOnLangChange(): void {
    const all = this.rowsSubject.value;
    if (all.length === 0) {
      return;
    }
    this.enrichmentService.relabelRows(all, this.translate);
    this.rowsSubject.next([...all]);
    this.pageRowsSubject.next([...this.pageRowsSubject.value]);
  }

  private mergeEnrichedRows(enriched: PolicyUI[]): void {
    const byId = new Map(enriched.map(r => [r.id, r]));
    const applyUpdate = (row: PolicyUI): void => {
      const updated = byId.get(row.id);
      if (!updated) {
        return;
      }
      row.name = updated.name;
      row.description = updated.description;
      row.enrichmentStatus = updated.enrichmentStatus;
    };

    for (const row of this.rowsSubject.value) {
      applyUpdate(row);
    }
    for (const row of this.filteredRowsSubject.value) {
      applyUpdate(row);
    }
    for (const row of this.pageRowsSubject.value) {
      applyUpdate(row);
    }

    this.rowsSubject.next([...this.rowsSubject.value]);
    if (this.searchTerm) {
      const filtered = this.filterRows(this.rowsSubject.value);
      this.filteredRowsSubject.next(filtered);
    } else {
      this.filteredRowsSubject.next([...this.filteredRowsSubject.value]);
    }
    this.pageRowsSubject.next([...this.pageRowsSubject.value]);
  }

  private async loadPoliciesFromAssetCache(): Promise<void> {
    const snapshot = await this.assetService.getAssetsCacheSnapshotOrLoad();
    const assets = snapshot?.data ?? [];
    const mapped = this.mapAssetsToPolicyRows(assets);
    this.setRows(mapped);
  }

  private setRows(rows: PolicyUI[]): void {
    this.rowsSubject.next(rows);
    this.publishFilteredAndPage(true);
  }

  private filterRows(allRows: PolicyUI[]): PolicyUI[] {
    return allRows.filter(p => {
      const matchesText =
        p.name.toLowerCase().includes(this.searchTerm) ||
        p.description.toLowerCase().includes(this.searchTerm) ||
        p.assetDisplayName.toLowerCase().includes(this.searchTerm) ||
        p.policyDefinitionId.toLowerCase().includes(this.searchTerm);

      const matchesType = this.filterType() === 'all' || p.type === this.filterType();

      return matchesText && matchesType;
    });
  }

  private publishFilteredAndPage(enqueueEnrichment = false): void {
    this.backgroundEnrichmentToken++;
    const allRows = this.rowsSubject.value;
    const filtered = this.filterRows(allRows);
    this.filteredRowsSubject.next(filtered);
    const page = filtered.slice(0, this.pageItemCount);
    this.pageRowsSubject.next(page);
    if (enqueueEnrichment) {
      this.queuePageEnrichment(page);
    }
  }

  private queuePageEnrichment(pageRows: PolicyUI[]): void {
    if (pageRows.length > 0) {
      this.pageEnrich$.next(pageRows);
    }
  }

  private mapAssetsToPolicyRows(assets: readonly Asset[]): PolicyUI[] {
    const pending = this.translate.instant('policies.list.pending');
    const rows: PolicyUI[] = [];
    for (const asset of assets) {
      const assetEntityId = this.resolveAssetEntityId(asset) ?? this.fallbackAssetKey(asset);
      const assetDisplayName = resolveAssetCatalogDisplayName(asset).trim() || assetEntityId;
      const date = formatAssetCreatedAtDdMmYyyy(asset);
      const accessId = this.readAssetRootString(asset, 'accessPolicyId');
      if (accessId) {
        rows.push({
          id: `${assetEntityId}|access|${accessId}`,
          policyDefinitionId: accessId,
          name: pending,
          type: 'Publicación',
          description: pending,
          date,
          assetDisplayName,
          enrichmentStatus: 'idle',
        });
      }
      const contractId = this.readAssetRootString(asset, 'contractPolicyId');
      if (contractId) {
        rows.push({
          id: `${assetEntityId}|contract|${contractId}`,
          policyDefinitionId: contractId,
          name: pending,
          type: 'Contratación',
          description: pending,
          date,
          assetDisplayName,
          enrichmentStatus: 'idle',
        });
      }
    }
    return rows;
  }

  private resolveAssetEntityId(asset: Asset): string | undefined {
    const entity = asset as Record<string, unknown>;
    const directId = entity['id'];
    if (typeof directId === 'string' && directId.length > 0) {
      return directId;
    }
    const jsonLdId = entity['@id'];
    if (typeof jsonLdId === 'string' && jsonLdId.length > 0) {
      return jsonLdId;
    }
    return undefined;
  }

  private readAssetRootString(asset: Asset, key: string): string | undefined {
    const v = (asset as Record<string, unknown>)[key];
    return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;
  }

  private fallbackAssetKey(asset: Asset): string {
    const jsonLdId = (asset as Record<string, unknown>)['@id'];
    return typeof jsonLdId === 'string' && jsonLdId.length > 0 ? jsonLdId : 'unknown-asset';
  }

  filter(text: string) {
    this.searchInput$.next((text || '').trim());
  }

  applyTypeFilter() {
    this.publishFilteredAndPage(true);
  }

  paginationEvent(pageItems: PolicyUI[]) {
    this.pageRowsSubject.next(pageItems);
    this.queuePageEnrichment(pageItems);
  }

  goToDetail(policy: PolicyUI) {
    const rol: 'Contratación' | 'Publicación' = policy.type === 'Publicación' ? 'Publicación' : 'Contratación';
    this.router.navigate(['/policies/detail', policy.policyDefinitionId], {
      queryParams: { rol, fecha: policy.date, name: policy.name },
    });
  }

  createPolicy() {
    this.router.navigate(['/policies/create']);
  }
}
