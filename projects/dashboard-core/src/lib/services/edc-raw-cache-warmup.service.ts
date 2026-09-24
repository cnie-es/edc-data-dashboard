import { Injectable, inject } from '@angular/core';
import type { OnDestroy } from '@angular/core';
import type { Subscription } from 'rxjs';
import { Subject, merge, from, EMPTY, catchError, distinctUntilChanged, filter, map, switchMap, tap, take } from 'rxjs';
import { CACHE_REFRESH_MS, RawEndpointCacheService } from './raw-endpoint-cache.service';
import { DashboardStateService } from './dashboard-state.service';
import type { EdcConfig } from '../models/edc-config';
import { deriveCacheNamespaceFromBearerToken } from './cache-namespace.util';
import { SdMatchedAssetsWarmupService } from './sd-matched-assets-warmup.service';

/** Stable key so distinctUntilChanged ignores object reference churn. */
function edcConfigIdentity(config: EdcConfig): string {
  return JSON.stringify({
    connectorName: config.connectorName,
    managementUrl: config.managementUrl,
    defaultUrl: config.defaultUrl,
    protocolUrl: config.protocolUrl,
    controlUrl: config.controlUrl,
    federatedCatalogEnabled: config.federatedCatalogEnabled,
    federatedCatalogUrl: config.federatedCatalogUrl,
  });
}

/**
 * After authentication, warms raw endpoint caches and refreshes them on a fixed interval.
 * Runs as a root singleton: the refresh timer is not tied to Router, route components, or page lifecycle.
 * Does not change how feature pages load data.
 */
@Injectable({
  providedIn: 'root',
})
export class EdcRawCacheWarmupService implements OnDestroy {
  private readonly sdMatchedAssets = inject(SdMatchedAssetsWarmupService);
  private readonly rawCache = inject(RawEndpointCacheService);
  private readonly dashboardState = inject(DashboardStateService);

  private intervalId?: ReturnType<typeof setInterval>;
  private intervalNamespace?: string;
  private lastAuthNamespace?: string;
  private authWarmupSequence = 0;

  private readonly postAuthWarmupTrigger$ = new Subject<number>();
  private connectorWarmupPipelineSub?: Subscription;

  /**
   * Call when a valid access token is available. Safe to call repeatedly (e.g. on each guarded navigation).
   */
  scheduleAfterAuth(accessToken: string): void {
    const namespace = deriveCacheNamespaceFromBearerToken(accessToken);
    const namespaceChanged = this.lastAuthNamespace !== namespace;
    const isDuplicateSchedule =
      !namespaceChanged && this.intervalId !== undefined && this.intervalNamespace === namespace;

    if (isDuplicateSchedule) {
      console.debug(`[${this.constructor.name}] scheduleAfterAuth deduped for unchanged namespace`, { namespace });
      return;
    }

    this.lastAuthNamespace = namespace;
    console.debug(`[${this.constructor.name}] scheduleAfterAuth called`, { namespace, namespaceChanged });
    this.rawCache.setNamespace(namespace);

    if (!this.intervalId || this.intervalNamespace !== namespace) {
      if (this.intervalId) {
        console.debug(`[${this.constructor.name}] Clearing previous periodic refresh interval`, {
          previousNamespace: this.intervalNamespace,
        });
        clearInterval(this.intervalId);
        this.intervalId = undefined;
      }
      this.intervalNamespace = namespace;
      console.debug(`[${this.constructor.name}] Starting periodic refresh interval`, { namespace });
      this.intervalId = setInterval(() => {
        void this.runPeriodicForceRefresh();
      }, CACHE_REFRESH_MS);
    }

    this.ensureConnectorWarmupPipeline();
    this.authWarmupSequence += 1;
    this.postAuthWarmupTrigger$.next(this.authWarmupSequence);
  }

  ngOnDestroy(): void {
    this.connectorWarmupPipelineSub?.unsubscribe();
    this.connectorWarmupPipelineSub = undefined;
    this.postAuthWarmupTrigger$.complete();

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Subscribes once: warms cache when a connector appears or its identity changes, and when auth namespace
   * changes while a connector is already selected (new IndexedDB namespace).
   */
  private ensureConnectorWarmupPipeline(): void {
    if (this.connectorWarmupPipelineSub) {
      return;
    }
    console.debug(`[${this.constructor.name}] Initializing connector warmup pipeline`);

    const definedConfig$ = this.dashboardState.currentEdcConfig$.pipe(
      filter((c): c is EdcConfig => c !== undefined && c !== null),
      distinctUntilChanged((a, b) => edcConfigIdentity(a) === edcConfigIdentity(b)),
      map(config => ({
        triggerLabel: 'connector-change',
        dedupeKey: `${this.rawCache.getNamespace()}|${edcConfigIdentity(config)}`,
      })),
    );

    const afterAuthWithConfig$ = this.postAuthWarmupTrigger$.pipe(
      switchMap(authSequence =>
        this.dashboardState.currentEdcConfig$.pipe(
          take(1),
          tap(config => {
            if (!config) {
              console.debug(`[${this.constructor.name}] Post-auth warmup waiting for connector`, {
                authSequence,
                namespace: this.rawCache.getNamespace(),
              });
            }
          }),
          filter((c): c is EdcConfig => c !== undefined && c !== null),
          map(config => ({
            triggerLabel: `post-auth-${authSequence}`,
            dedupeKey: `${this.rawCache.getNamespace()}|${edcConfigIdentity(config)}`,
          })),
        ),
      ),
    );

    this.connectorWarmupPipelineSub = merge(definedConfig$, afterAuthWithConfig$)
      .pipe(
        distinctUntilChanged((a, b) => a.dedupeKey === b.dedupeKey),
        tap(event => {
          console.debug(`[${this.constructor.name}] Warmup trigger emitted`, {
            trigger: event.triggerLabel,
            namespace: this.rawCache.getNamespace(),
          });
        }),
        switchMap(event =>
          from(this.warmupForceRefreshAfterAuth(event.triggerLabel)).pipe(
            catchError((error: unknown) => {
              console.warn(`[${this.constructor.name}] SD-matched assets cache warmup failed:`, error);
              return EMPTY;
            }),
          ),
        ),
      )
      .subscribe();
  }

  private async warmupForceRefreshAfterAuth(trigger: string): Promise<void> {
    console.debug(`[${this.constructor.name}] Warmup start`, {
      trigger,
      namespace: this.rawCache.getNamespace(),
      mode: 'sdMatchedAssets',
    });
    await this.sdMatchedAssets.run({ trigger });
    console.debug(`[${this.constructor.name}] Warmup end`, { trigger });
  }

  private async runPeriodicForceRefresh(): Promise<void> {
    try {
      console.debug(`[${this.constructor.name}] Periodic refresh tick`, {
        namespace: this.rawCache.getNamespace(),
      });
      await this.sdMatchedAssets.run({ trigger: 'periodic' });
      console.debug(`[${this.constructor.name}] Periodic refresh completed`, {
        namespace: this.rawCache.getNamespace(),
      });
    } catch (error) {
      console.warn(`[${this.constructor.name}] Periodic cache refresh failed:`, error);
    }
  }
}
