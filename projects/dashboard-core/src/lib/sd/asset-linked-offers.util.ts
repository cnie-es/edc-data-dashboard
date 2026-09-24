/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

import type { EdcClientService } from '../services/edc-client.service';
import type { QuerySpec } from '@think-it-labs/edc-connector-client';
import { getContractDefinitionTargetAssetId } from '../services/sd-matched-assets-warmup.util';

const PAGE_LIMIT = 50;

type ContractDefinitionsQuerySpec = QuerySpec & { '@type': 'QuerySpec' };

/**
 * Returns whether any contract definition targets the given EDC asset id (`assetsSelector` id criterion).
 */
export async function assetHasLinkedOffers(edc: EdcClientService, assetId: string): Promise<boolean> {
  const id = assetId.trim();
  if (!id) {
    return false;
  }
  const client = await edc.getClient();
  let offset = 0;
  for (;;) {
    const spec: ContractDefinitionsQuerySpec = {
      '@type': 'QuerySpec',
      offset,
      limit: PAGE_LIMIT,
    };
    const page = await client.management.contractDefinitions.queryAll(spec);
    for (const def of page) {
      const target = getContractDefinitionTargetAssetId(def);
      if (target === id) {
        return true;
      }
    }
    if (page.length === 0 || page.length < PAGE_LIMIT) {
      break;
    }
    offset += PAGE_LIMIT;
  }
  return false;
}
