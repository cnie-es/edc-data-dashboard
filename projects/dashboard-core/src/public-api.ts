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

/*
 * Public API Surface of dashboard-core
 */

export * from './lib/services/dashboard-state.service';
export { allowDashboardMocks, useFixtureMocks, useSdWarmupMock } from './lib/services/dashboard-mocks.util';
export * from './lib/services/edc-client.service';
export * from './lib/services/modal-and-alert.service';
export * from './lib/services/dashboard-error.service';
export * from './lib/services/data-type-registry.service';
export * from './lib/services/raw-endpoint-cache.service';
export * from './lib/services/cache-namespace.util';
export * from './lib/services/edc-raw-cache-warmup.service';
export * from './lib/services/sd-matched-assets-warmup.service';
export * from './lib/services/offer-creation-schemas.service';
export * from './lib/services/offer-creation-schemas.model';
export * from './lib/services/participant-name.service';
export * from './lib/sd-tooling/sd-resource-descriptions.model';
export * from './lib/i18n/resolve-dashboard-lang';
export * from './lib/offer-create/resolve-offer-create-schema-id';
export * from './lib/dashboard-app/dashboard-app.component';
export * from './lib/common/jsonld-viewer/jsonld-viewer.component';
export * from './lib/common/filter-input/filter-input.component';
export * from './lib/common/breadcrumbs/breadcrumbs.component';
export * from './lib/common/corpus-self-description-detail-layout/corpus-self-description-detail-layout.component';
export * from './lib/common/pagination/pagination.component';
export * from './lib/common/item-count-selector/item-count-selector.component';
export * from './lib/common/alert/alert.component';
export * from './lib/common/list-loading-state/list-loading-state.component';
export * from './lib/common/connector-config-form/connector-config-form.component';
export * from './lib/common/consumer-provider-switch/consumer-provider-switch.component';
export * from './lib/common/multiselect-with-search/multiselect-with-search.component';
export * from './lib/common/deletion-confirm/deletion-confirm.component';
export * from './lib/common/json-object-table/json-object-table.component';
export * from './lib/common/json-object-input/json-object-input.component';
export * from './lib/common/data-address/data-address-form/data-address-form.component';
export * from './lib/common/data-address/data-type-input/data-type-input.component';
export * from './lib/common/data-address/fallback-data-type/fallback-data-type.component';
export * from './lib/common/data-address/http-data-type/http-data-type.component';
export * from './lib/common/data-address/aws-s3-data-type/aws-s3-data-type.component';
export * from './lib/common/data-address/azure-storage-data-type/azure-storage-data-type.component';
export * from './lib/models/menu-item';
export * from './lib/models/app-config';
export * from './lib/models/edc-config';
export * from './lib/models/json-value';
export * from './lib/models/pair';
export * from './lib/models/constants';
export * from './lib/models/runtime-feature-flags';
export * from './lib/models/edc-bearer-token-provider';
export * from './lib/models/connector-perspective';

export * from './lib/sd/sd-display.util';
export { SdDisplayMapper } from './lib/sd/sd-display.mapper';
export * from './lib/sd/corpus-offering-self-description.mapper';
export { applyCorpusDetailDisplayOverrides } from './lib/sd/corpus-display-overrides.util';
export * from './lib/sd/corpus-offering-self-description.mock';
export * from './lib/sd/corpus-self-description-detail.loader';
export * from './lib/sd/resolve-self-description-id-for-edc-asset.util';
export * from './lib/sd/own-offer-self-descriptions.service';
export * from './lib/sd/corpus-edc-asset-detail-merge.util';
export * from './lib/common/corpus-self-description-detail-view/corpus-self-description-detail-view.component';
export { assetHasLinkedOffers } from './lib/sd/asset-linked-offers.util';
export {
  getAssetSdId,
  resolveAssetEntityId,
  SD_MATCHED_ASSETS_MOCK_ACCESS_POLICY_ID,
  SD_MATCHED_ASSETS_MOCK_CONTRACT_POLICY_ID,
} from './lib/services/sd-matched-assets-warmup.util';
