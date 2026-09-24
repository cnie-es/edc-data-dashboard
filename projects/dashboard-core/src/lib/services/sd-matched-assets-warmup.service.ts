/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, filter, take, map } from 'rxjs';
import type { Asset } from '@think-it-labs/edc-connector-client';
import type { QuerySpec } from '@think-it-labs/edc-connector-client';
import {
  createResourceDescriptionsRequestParams,
  parseSdResourceDescriptionsResponse,
  resolveSdToolingV1BaseUrl,
} from '../sd-tooling/sd-resource-descriptions.model';
import type { EdcConfig } from '../models/edc-config';
import { DashboardStateService } from './dashboard-state.service';
import { useSdWarmupMock } from './dashboard-mocks.util';
import { EdcClientService } from './edc-client.service';
import { RawEndpointCacheService } from './raw-endpoint-cache.service';
import {
  assetMatchesClaims,
  collectClaimsGraphUris,
  countAssetsWithResolvableOfferUri,
  createMockMatchedAssetsForCache,
  enrichMatchedAssetsWithContractPolicies,
  mergeContractDefinitionPageIntoPolicyMap,
  resolveAssetEntityId,
  type ContractPolicyIds,
} from './sd-matched-assets-warmup.util';

const ASSETS_KEY = 'assets/request' as const;
const POLICIES_KEY = 'policydefinitions/request' as const;
const PAGE_LIMIT = 50;

type AssetQuerySpec = QuerySpec & { '@type': 'QuerySpec' };

@Injectable({
  providedIn: 'root',
})
export class SdMatchedAssetsWarmupService {
  private readonly http = inject(HttpClient);
  private readonly edc = inject(EdcClientService);
  private readonly rawCache = inject(RawEndpointCacheService);
  private readonly dashboardState = inject(DashboardStateService);

  /**
   * Clears policy cache, fetches SD resource descriptions + connector assets (paged), matches by `sdId` / `claimsGraphUri`,
   * and writes only matched assets into the raw assets cache.
   */
  async run(options?: { trigger?: string }): Promise<void> {
    const trigger = options?.trigger ?? 'sd-matched-assets';
    const config = await firstValueFrom(
      this.dashboardState.currentEdcConfig$.pipe(
        filter((c): c is EdcConfig => c !== undefined && c !== null),
        take(1),
      ),
    );

    const useSdMock = useSdWarmupMock(config);
    console.debug(`[${this.constructor.name}] Run start`, { trigger, mock: useSdMock });

    await this.rawCache.clear(POLICIES_KEY);

    if (useSdMock) {
      const matched = createMockMatchedAssetsForCache();
      await this.rawCache.forceRefresh(ASSETS_KEY, async () => matched);
      console.debug(`[${this.constructor.name}] Run end (mock)`, { trigger, matchedCount: matched.length });
      return;
    }

    const claims = await this.fetchAllClaimsUrisFromSdTooling(config, trigger);
    console.debug(`[${this.constructor.name}] Claims URIs collected`, { trigger, count: claims.size });

    const allAssets = await this.fetchAllAssetsPages();
    const matched = allAssets.filter(a => assetMatchesClaims(a, claims));

    if (matched.length === 0 && allAssets.length > 0) {
      console.warn(`[${this.constructor.name}] No SD–asset matches`, {
        trigger,
        claimsCount: claims.size,
        assetsScanned: allAssets.length,
        assetsWithOfferUri: countAssetsWithResolvableOfferUri(allAssets),
      });
    }

    const matchedIds = new Set(
      matched.map(a => resolveAssetEntityId(a)).filter((id): id is string => typeof id === 'string' && id.length > 0),
    );
    const policyByAssetId = await this.fetchContractPolicyIdsByMatchedAssetIds(matchedIds);
    const matchedWithPolicies = enrichMatchedAssetsWithContractPolicies(matched, policyByAssetId);

    await this.rawCache.forceRefresh(ASSETS_KEY, async () => matchedWithPolicies);
    console.debug(`[${this.constructor.name}] Run end`, {
      trigger,
      assetsScanned: allAssets.length,
      matchedCount: matched.length,
      contractPolicyMappings: policyByAssetId.size,
    });
  }

  private async fetchAllClaimsUrisFromSdTooling(config: EdcConfig, trigger: string): Promise<Set<string>> {
    const v1Base = resolveSdToolingV1BaseUrl(config.sdToolingApiBaseUrl);
    const endpoint = `${v1Base}/resourceDescriptions`;
    const params = new HttpParams({
      fromObject: createResourceDescriptionsRequestParams('publicationDate'),
    });
    const page = await firstValueFrom(
      this.http.get<unknown>(endpoint, { params }).pipe(map(r => parseSdResourceDescriptionsResponse(r))),
    );
    const items = page.items ?? [];
    console.debug(`[${this.constructor.name}] SD resourceDescriptions`, {
      trigger,
      itemCount: items.length,
      totalCount: page.totalCount,
    });
    return collectClaimsGraphUris(items);
  }

  private async fetchAllAssetsPages(): Promise<Asset[]> {
    const client = await this.edc.getClient();
    const all: Asset[] = [];
    let offset = 0;

    for (;;) {
      const spec: AssetQuerySpec = {
        '@type': 'QuerySpec',
        offset,
        limit: PAGE_LIMIT,
      };
      const page = await client.management.assets.queryAll(spec);
      if (page.length === 0 || page.length < PAGE_LIMIT) {
        all.push(...page);
        break;
      }
      all.push(...page);
      offset += PAGE_LIMIT;
    }

    return all;
  }

  /**
   * Pages contract definitions; keeps only policy ids for assets in `matchedIds` (first definition per asset wins).
   */
  private async fetchContractPolicyIdsByMatchedAssetIds(
    matchedIds: ReadonlySet<string>,
  ): Promise<Map<string, ContractPolicyIds>> {
    const policyByAssetId = new Map<string, ContractPolicyIds>();
    if (matchedIds.size === 0) {
      return policyByAssetId;
    }

    const client = await this.edc.getClient();
    let offset = 0;

    for (;;) {
      if (policyByAssetId.size >= matchedIds.size) {
        break;
      }
      const spec: AssetQuerySpec = {
        '@type': 'QuerySpec',
        offset,
        limit: PAGE_LIMIT,
      };
      const page = await client.management.contractDefinitions.queryAll(spec);
      mergeContractDefinitionPageIntoPolicyMap(page, matchedIds, policyByAssetId);
      if (page.length === 0 || page.length < PAGE_LIMIT) {
        break;
      }
      offset += PAGE_LIMIT;
    }

    return policyByAssetId;
  }
}
