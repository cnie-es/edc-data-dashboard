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

import { EdcConfig } from '../../projects/dashboard-core/src/lib/models/edc-config';

describe('asset view e2e tests', () => {
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
    }).as('testAssets');

    cy.intercept('POST', `${edcConfig.managementUrl}/v3/assets*`, {
      fixture: 'assets/create-200.json',
      statusCode: 200,
    }).as('createAsset');

    cy.intercept('PUT', `${edcConfig.managementUrl}/v3/assets*`, {
      statusCode: 204,
    }).as('updateAsset');

    cy.intercept('DELETE', `${edcConfig.managementUrl}/v3/assets/*`, {
      statusCode: 204,
    }).as('deleteAsset');

    cy.intercept('GET', `${edcConfig.managementUrl}/v3/dataplanes*`, {
      fixture: 'dataplanes/getAll-200.json',
      statusCode: 200,
    }).as('getDataplanes');

    cy.visit('/');
    cy.get('ul.menu button').contains('Content_Paste').click();
  });

  it('shows view correctly with asset table rows', () => {
    cy.get('lib-filter-input').should('have.length', 1);
    cy.get('lib-pagination')
      .should('have.length', 1)
      .find('div.join > button')
      .each($btn => {
        cy.wrap($btn).should('be.disabled');
      });
    cy.contains('button', 'Create').should('have.length', 1);

    cy.get('lib-asset-table').should('not.contain', 'No assets created yet');

    cy.wait('@testAssets').then(() => {
      cy.get('lib-asset-table tbody tr').should('have.length.at.least', 2);
    });
  });

  it('can filter assets', () => {
    cy.wait('@testAssets');
    cy.get('lib-filter-input input').type('asset1');

    cy.get('lib-asset-table tbody tr').should('have.length', 1);
  });

  it('can show details of asset', () => {
    cy.wait('@testAssets');
    cy.get('lib-asset-table').contains('button', 'View').first().click();

    cy.url().should('match', /\/assets\/self-descriptions\//);
  });

  it('can create asset', () => {
    cy.contains('button', 'Create').click();
    cy.wait('@getDataplanes').then(() => {
      const createButton = cy.get('lib-asset-create').contains('button', 'Create Asset');
      cy.get('lib-asset-create select').first().select(0);
      cy.get('lib-asset-create').find('input[name="baseUrl"]').type('http://e2e');
      createButton.click();
    });

    cy.wait('@createAsset').then(() => {
      cy.wait('@testAssets').then(() => {
        cy.get('lib-alert .alert-success').should('exist');
      });
    });
  });

  it('can not create asset without data type', () => {
    cy.contains('button', 'Create').click();
    cy.get('lib-asset-create').contains('button', 'Create Asset').should('be.disabled');
  });

  it('can not create HttpData asset without baseUrl', () => {
    cy.contains('button', 'Create').click();
    cy.get('lib-asset-create select').first().select(0);
    cy.get('lib-asset-create').contains('button', 'Create Asset').should('be.disabled');
  });
});
