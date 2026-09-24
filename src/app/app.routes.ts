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

import type { Routes } from '@angular/router';
import { authRequiredGuard } from './guards/auth-required.guard';
import { publisherRequiredGuard } from './guards/publisher-required.guard';

const publisherGuards = [authRequiredGuard, publisherRequiredGuard];

export const routes: Routes = [
  {
    path: 'manual-token-login',
    loadComponent: () =>
      import('./manual-token-login/manual-token-login.component').then(m => m.ManualTokenLoginComponent),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    canActivate: [authRequiredGuard],
    loadComponent: () => import('@eclipse-edc/dashboard-core/home').then(m => m.HomeViewComponent),
  },
  {
    path: 'assets/self-descriptions/:sdId',
    canActivate: publisherGuards,
    loadComponent: () =>
      import('@eclipse-edc/dashboard-core/assets').then(m => m.AssetSelfDescriptionDetailPageComponent),
  },
  {
    path: 'assets',
    canActivate: publisherGuards,
    loadComponent: () => import('@eclipse-edc/dashboard-core/assets').then(m => m.AssetViewComponent),
  },
  {
    path: 'policies',
    canActivate: publisherGuards,
    loadComponent: () => import('@eclipse-edc/dashboard-core/policies').then(m => m.PolicyViewComponent),
  },
  {
    path: 'policies/create',
    canActivate: publisherGuards,
    loadComponent: () => import('@eclipse-edc/dashboard-core/policies').then(m => m.PolicyCreateComponent),
  },
  {
    path: 'policies/detail/:id',
    canActivate: publisherGuards,
    loadComponent: () => import('@eclipse-edc/dashboard-core/policies').then(m => m.PolicyDetailComponent),
  },
  {
    path: 'policies/create/contratacion',
    canActivate: publisherGuards,
    loadComponent: () => import('@eclipse-edc/dashboard-core/policies').then(m => m.PolicyCreateContratacionComponent),
  },
  {
    path: 'policies/create/lds',
    canActivate: publisherGuards,
    loadComponent: () => import('@eclipse-edc/dashboard-core/policies').then(m => m.PolicyCreateLdsComponent),
  },
  {
    path: 'contract-definitions',
    canActivate: publisherGuards,
    loadComponent: () =>
      import('@eclipse-edc/dashboard-core/contract-definitions').then(m => m.ContractDefinitionsViewComponent),
  },
  {
    path: 'contract-definitions/create',
    canActivate: publisherGuards,
    loadComponent: () =>
      import('@eclipse-edc/dashboard-core/contract-definitions').then(m => m.ContractDefinitionCreatePageComponent),
  },
  {
    path: 'contract-definitions/new',
    canActivate: publisherGuards,
    loadComponent: () =>
      import('@eclipse-edc/dashboard-core/contract-definitions').then(m => m.OfferCreateSelectionComponent),
  },
  {
    path: 'contract-definitions/details/:id',
    canActivate: publisherGuards,
    loadComponent: () =>
      import('@eclipse-edc/dashboard-core/contract-definitions').then(m => m.ContractDefinitionDetailsPageComponent),
  },
  {
    path: 'contract-definitions/offer/:offerId',
    canActivate: publisherGuards,
    loadComponent: () =>
      import('@eclipse-edc/dashboard-core/contract-definitions').then(m => m.OfferSelfDescriptionDetailPageComponent),
  },
  {
    path: 'contracts',
    canActivate: [authRequiredGuard],
    loadComponent: () => import('@eclipse-edc/dashboard-core/negotiations').then(m => m.ContractViewComponent),
  },

  {
    path: 'catalog',
    canActivate: [authRequiredGuard],
    loadComponent: () => import('@eclipse-edc/dashboard-core/catalog').then(m => m.CatalogViewComponent),
  },
  {
    path: 'xfsc-advsearch/self-descriptions/:id',
    canActivate: [authRequiredGuard],
    loadComponent: () => import('@eclipse-edc/dashboard-core/xfsc-advSearch').then(m => m.SdDetailsViewComponent),
  },
  {
    path: 'xfsc-advsearch',
    redirectTo: 'catalog',
    pathMatch: 'full',
  },
  {
    path: 'transfer-history',
    canActivate: [authRequiredGuard],
    loadComponent: () => import('@eclipse-edc/dashboard-core/transfer').then(m => m.TransferHistoryViewComponent),
  },
  {
    path: 'sdtooling',
    canActivate: [authRequiredGuard],
    loadComponent: () => import('@eclipse-edc/dashboard-core/sdtooling').then(m => m.SdToolingViewComponent),
  },
];
