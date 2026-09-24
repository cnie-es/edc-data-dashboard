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

describe('contract definition view e2e tests', () => {
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

  it('renders offers list with expected visual sections', () => {
    cy.wait('@exampleContractDefs');
    cy.contains('Mis ofertas: listado').should('exist');
    cy.contains('Filtros:').should('exist');
    cy.get('input[placeholder=""]').should('exist');
    cy.contains('Ordenar por:').should('exist');
  });

  it('navigates to create page from top CTA', () => {
    cy.contains('Crear nueva oferta').click();
    cy.url().should('include', '/contract-definitions/new');
    cy.contains('Crear nueva oferta').should('exist');
    cy.contains('Crear Corpus').should('exist');
  });

  it('navigates from offer type selection to sdtooling wizard with pill stepper', () => {
    const minimalShacl = `@prefix gax-validation: <http://w3id.org/gaia-x/validation#> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix simpl: <http://w3id.org/gaia-x/simpl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
gax-validation:DataCorpusShape a sh:NodeShape ;
    sh:targetClass simpl:DataOffering ;
    sh:property [
        sh:path simpl:generalServiceProperties ;
        sh:node gax-validation:CorpusGeneralServicePropertiesShape ;
        sh:minCount 1 ;
        sh:maxCount 1
    ] .
gax-validation:CorpusGeneralServicePropertiesShape a sh:NodeShape ;
    sh:property [ sh:path simpl:name ; sh:datatype xsd:string ; sh:minCount 1 ] ;
    sh:targetClass simpl:GeneralServiceProperties .`;

    cy.intercept('GET', '**/sdtooling-api/v2/schemas', {
      body: { Service: [{ id: 'CorpusSchema_ES', title: 'Corpus', resourceType: 'data' }] },
      statusCode: 200,
    }).as('offerSchemasCatalog');

    cy.intercept('GET', '**/sdtooling-api/v2/schemas/CorpusSchema_ES/content*', {
      body: {
        schemaId: 'CorpusSchema_ES',
        schemaUIType: 'sdCreation',
        content: minimalShacl,
      },
      statusCode: 200,
    }).as('offerSchemaContent');

    cy.intercept('GET', '**/sdtooling-api/v1/resourceAddresses/sharingMethods*', {
      body: { offeringType: 'DATA', sharingMethods: ['HTTP'] },
      statusCode: 200,
    }).as('sharingMethods');

    cy.intercept('GET', '**/sdtooling-api/v1/policies/actions', {
      body: { options: [{ label: 'Fetch', value: 'fetch' }] },
      statusCode: 200,
    }).as('policyActions');

    cy.intercept('GET', '**/sdtooling-api/v1/policies/identityAttributes', {
      body: { options: [{ label: 'Any', value: 'any' }] },
      statusCode: 200,
    }).as('policyAttributes');

    cy.contains('Crear nueva oferta').click();
    cy.url().should('include', '/contract-definitions/new');
    cy.wait('@offerSchemasCatalog');

    cy.contains('button', 'Crear Corpus').click();
    cy.url().should('include', '/sdtooling');
    cy.url().should('include', 'schemaId=CorpusSchema_ES');
    cy.wait('@offerSchemaContent');

    cy.get('[data-cy="offer-wizard-stepper-panel"]').should('exist');
    cy.get('.offer-wizard-step-active').should('exist');
    cy.contains('h1', 'Crear nueva oferta').should('exist');
    cy.get('[data-cy="offer-wizard-form-panel"]').should('exist');
  });

  it('filters assets and moves to step 2', () => {
    cy.visit('/contract-definitions/create');
    cy.get('[data-cy="create-save-continue"]').should('be.disabled');

    cy.get('[data-cy="create-asset-search"] input[placeholder=""]').type('deforestation');
    cy.contains('Collection of Articles on Deforestation on Amazonia and prospects').should('exist');
    cy.contains('Modelo de crecimiento de poblacion en ciudades').should('not.exist');

    cy.get('[data-cy="create-asset-radio-asset-create-03"]').click();
    cy.get('[data-cy="create-save-continue"]').should('be.enabled').click();

    cy.url().should('include', '/contract-definitions/create?step=2&assetId=asset-create-03');
    cy.contains('Política de contratación').should('exist');
    cy.get('[data-cy="create-policy-table"]').should('exist');
  });

  it('supports filters modal and chips in asset step (ui-only)', () => {
    cy.visit('/contract-definitions/create');

    cy.get('[data-cy="open-filters-modal"]').click();
    cy.get('[data-cy="contract-filters-modal"]').should('be.visible');

    cy.get('[data-cy="asset-type-options-list"] input[type="checkbox"]').first().check({ force: true });
    cy.get('[data-cy="keyword-options-list"] input[type="checkbox"]').first().check({ force: true });
    cy.get('[data-cy="apply-filters-modal"]').click();

    cy.get('[data-cy="applied-filter-chips"]').should('exist');
    cy.get('[data-cy="applied-filter-chips"] .badge').should('have.length', 2);
    cy.get('[data-cy="create-asset-row-asset-create-01"]').should('exist');
  });

  it('filters policies and enables continue button after selecting one', () => {
    cy.visit('/contract-definitions/create');
    cy.get('[data-cy="create-asset-radio-asset-create-01"]').click();
    cy.get('[data-cy="create-save-continue"]').click();

    cy.get('[data-cy="create-step2-save-continue"]').should('be.disabled');
    cy.get('[data-cy="create-policy-search"] input[placeholder=""]').type('dominio');
    cy.contains('Dominio público').should('exist');
    cy.contains('Licencia LDS').should('not.exist');

    cy.get('[data-cy="create-policy-radio-policy-create-03"]').click();
    cy.get('[data-cy="create-step2-save-continue"]').should('be.enabled').click();
    cy.url().should(
      'include',
      '/contract-definitions/create?step=3&assetId=asset-create-01&contractPolicyId=policy-create-03',
    );
    cy.contains('Política de publicación').should('exist');

    cy.get('[data-cy="create-step3-save-continue"]').should('be.disabled');
    cy.get('[data-cy="create-publication-policy-search"] input[placeholder=""]').type('sin restricción');
    cy.contains('Sin restricción').should('exist');
    cy.contains('Union Europea').should('not.exist');

    cy.get('[data-cy="create-publication-policy-radio-publication-policy-03"]').click();
    cy.get('[data-cy="create-step3-save-continue"]').should('be.enabled').click();
    cy.url().should(
      'include',
      '/contract-definitions/create?step=4&assetId=asset-create-01&contractPolicyId=policy-create-03&publicationPolicyId=publication-policy-03',
    );
    cy.contains('Revisar y publicar').should('exist');
    cy.get('[data-cy="create-step4-summary-publication"]').should('contain.text', 'Sin restricción');
    cy.get('[data-cy="create-step4-public-toggle"]').click();
    cy.get('[data-cy="create-step4-publish"]').should('be.enabled').click();
    cy.get('[data-cy="create-step4-publish-feedback"]').should('exist');
    cy.url().should('include', '/contract-definitions');
    cy.contains('Mis ofertas: listado').should('exist');
  });

  it('renders details CTA in each offer card', () => {
    cy.contains('button', 'Ver oferta').should('be.visible');
  });

  it('navigates to offer self-description detail when Ver oferta is clicked', () => {
    cy.intercept('POST', `${edcConfig.managementUrl}/v3/assets/request*`, {
      fixture: 'assets/query-offer-detail-200.json',
      statusCode: 200,
    }).as('offerDetailAssets');

    cy.intercept('GET', '**/xfsc-advsearch-be/v1/selfDescriptions/*', {
      fixture: 'corpus-offering-self-description-200.json',
      statusCode: 200,
    }).as('offerSelfDescription');

    cy.visit('/');
    cy.contains('button', 'Mis ofertas').click();
    cy.wait('@offerDetailAssets');

    cy.get('[data-cy="offer-view-details"]').first().should('be.enabled').click();
    cy.wait('@offerSelfDescription');
    cy.url().should('include', '/contract-definitions/offer/mock-corpus-offering-001');
    cy.contains('ABSITA dataset1').should('exist');

    cy.get('.corpus-offer-detail__keyword-pill').contains('image').should('exist');
    cy.get('.corpus-offer-detail__keyword-pill').contains('monolingual').should('exist');
    cy.get('.corpus-offer-detail__keyword-pill').should('not.contain.text', 'ms:image');
    cy.get('.corpus-offer-detail').contains('pdf').should('exist');
    cy.get('.corpus-offer-detail').contains('seconds').should('exist');
    cy.get('.corpus-offer-detail').should('not.contain.text', 'omtd:pdf');
    cy.get('.corpus-offer-detail__dp-pill').should('not.contain.text', 'noA');
  });

  it('displays cleaned vocabulary labels on Mis ofertas offer detail', () => {
    cy.intercept('GET', '**/config/edc-connector-config.json', {
      body: [{ ...edcConfig, dashboardMocksEnabled: true }],
      statusCode: 200,
    });

    cy.visit('/');
    cy.contains('button', 'Mis ofertas').click();

    cy.get('[data-cy="offer-view-details"]').first().should('be.enabled').click();
    cy.url().should('match', /\/contract-definitions\/offer\/mock-corpus-offering-001/);
    cy.contains('ABSITA dataset (mock)').should('exist');

    cy.get('.corpus-offer-detail__keyword-pill').contains('text').should('exist');
    cy.get('.corpus-offer-detail__keyword-pill').contains('audio').should('exist');
    cy.get('.corpus-offer-detail__keyword-pill').contains('monolingual').should('exist');
    cy.get('.corpus-offer-detail__keyword-pill').should('not.contain.text', 'ms:text');
    cy.get('.corpus-offer-detail__keyword-pill').should('not.contain.text', 'ms:monolingual');

    cy.get('.corpus-offer-detail').contains('zip').should('exist');
    cy.get('.corpus-offer-detail').contains('xml').should('exist');
    cy.get('.corpus-offer-detail').contains('tokens').should('exist');
    cy.get('.corpus-offer-detail').should('not.contain.text', 'omtd:pdf');
    cy.get('.corpus-offer-detail').should('not.contain.text', 'ms:seconds');

    cy.get('.corpus-offer-detail__dp-pill').contains('No').should('have.length.at.least', 2);
    cy.get('.corpus-offer-detail__dp-pill').should('not.contain.text', 'noA');
  });

  it('filters by title using search input', () => {
    cy.get('input[placeholder=""]').type('Asset 03');
    cy.contains('Asset 03').should('exist');
    cy.get('input[placeholder=""]').clear().type('no-match-value');
    cy.contains('Asset 03').should('not.exist');
  });

  it('opens filters modal, supports all filter sections, and renders chips after apply', () => {
    cy.get('[data-cy="open-filters-modal"]').click();
    cy.get('[data-cy="contract-filters-modal"]').should('be.visible');
    cy.contains('Seleccionar filtros').should('exist');
    cy.contains('Tipo de activo').should('exist');
    cy.contains('Tipo de medio').should('exist');
    cy.contains('Función del modelo').should('exist');
    cy.contains('Palabras clave').should('exist');

    cy.get('[data-cy="asset-type-options-list"] input[type="checkbox"]').first().check({ force: true });
    cy.get('[data-cy="media-type-options-list"] input[type="checkbox"]').first().check({ force: true });
    cy.get('[data-cy="model-function-options-list"] input[type="checkbox"]').first().check({ force: true });

    cy.get('[data-cy="keyword-options-list"] input[type="checkbox"]').should('have.length', 10);
    cy.get('[data-cy="toggle-all-keywords"]').click();
    cy.get('[data-cy="keyword-options-list"] input[type="checkbox"]').its('length').should('be.greaterThan', 10);

    cy.contains('[data-cy="keyword-options-list"] label', 'entity linking').click();
    cy.contains('[data-cy="keyword-options-list"] label', 'coreference resolution').click();
    cy.get('[data-cy="apply-filters-modal"]').click();

    cy.get('[data-cy="applied-filter-chips"]').should('exist');
    cy.get('[data-cy="applied-filter-chips"]').contains('Tipo de activo:').should('exist');
    cy.get('[data-cy="applied-filter-chips"]').contains('Tipo de medio:').should('exist');
    cy.get('[data-cy="applied-filter-chips"]').contains('Función del modelo:').should('exist');
    cy.get('[data-cy="applied-filter-chips"]').contains('Palabras clave:').should('exist');
    cy.get('[data-cy="applied-filter-chips"] .badge').should('have.length', 5);

    cy.get('[data-cy="remove-filter-chip"]').first().click();
    cy.get('[data-cy="applied-filter-chips"] .badge').should('have.length', 4);
  });
});
