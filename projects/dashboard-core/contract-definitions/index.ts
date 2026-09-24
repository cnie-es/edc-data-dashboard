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

export * from './src/contract-definitions-view/contract-definitions-view.component';
export * from './src/contract-definitions.service';
export * from './src/contract-definition-create-page/contract-definition-create-page.component';
export * from './src/contract-definition-details-page/contract-definition-details-page.component';
export * from './src/offer-self-description-detail-page/offer-self-description-detail-page.component';
export * from './src/offer-create-selection/offer-create-selection.component';
export * from './src/contract-definition-card/contract-definition-card.component';
export * from './src/offer-card-view-model';
export {
  applyUsagePolicyLabelsToOfferCard,
  buildOfferCardViewModelFromSelfDescriptionDetail,
  buildPlaceholderOfferCardFromSearchSummary,
} from './src/offer-card-from-self-description.mapper';
