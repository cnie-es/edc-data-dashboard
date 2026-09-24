/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@angular/core';
import type { Asset } from '@think-it-labs/edc-connector-client';
import {
  ensureMockOfferResourcesLoaded,
  getMockOfferAssetsFromRegistry,
  getMockSelfDescriptionFromRegistry,
} from './mock-offer-resources.registry';

@Injectable({ providedIn: 'root' })
export class MockOfferResourcesService {
  ensureLoaded(): Promise<void> {
    return ensureMockOfferResourcesLoaded();
  }

  getMockAssets(): Asset[] {
    return getMockOfferAssetsFromRegistry();
  }

  getSelfDescriptionByOfferId(offerId: string): Record<string, unknown> | undefined {
    return getMockSelfDescriptionFromRegistry(offerId);
  }
}
