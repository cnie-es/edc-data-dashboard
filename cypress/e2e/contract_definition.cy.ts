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

import type { EdcConfig } from '../../projects/dashboard-core/src/lib/models/edc-config';

describe('contract definition page tests', () => {
  const edcConfigs: EdcConfig[] = Cypress.env('edcConfig');
  const edcConfig = edcConfigs[0];

  beforeEach(() => {
    cy.intercept('GET', '**/config/edc-connector-config.json', {
      body: edcConfigs,
      statusCode: 200,
    });

    cy.intercept('POST', `${edcConfig.managementUrl}/v3/assets/request*`, {
      fixture: 'assets/query-200.json',
      statusCode: 200,
    }).as('exampleAssets');

    cy.intercept('POST', `${edcConfig.managementUrl}/v3/policydefinitions/request*`, {
      fixture: 'policies/query-200.json',
      statusCode: 200,
    }).as('examplePolicies');

    cy.intercept('POST', `${edcConfig.managementUrl}/v3/contractdefinitions/request*`, {
      fixture: 'contract-definitions/query-200.json',
      statusCode: 200,
    }).as('exampleContractDefs');

    cy.visit('/');
    cy.contains('button', 'Mis ofertas').click();
  });

  it('keeps a lightweight smoke check for list view', () => {
    cy.contains('Mis ofertas: listado').should('exist');
    cy.get('lib-contract-definition-card').should('have.length.at.least', 1);
  });

  it('opens filters modal from list view', () => {
    cy.get('[data-cy="open-filters-modal"]').click();
    cy.get('[data-cy="contract-filters-modal"]').should('be.visible');
  });
});
