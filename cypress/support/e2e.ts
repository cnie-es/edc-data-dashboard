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

// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// When a command from ./commands is ready to use, import with `import './commands'` syntax
// import './commands';

/**
 * La app resuelve su modo de autenticacion desde `config/keycloak-config.json`, que en el
 * repo trae `authMode: "manual-token"`. Con ese modo, `authRequiredGuard` no encuentra token
 * y redirige a `/manual-token-login`, asi que `cy.visit('/')` nunca llega al dashboard: no hay
 * menu que pulsar y los specs mueren en su `beforeEach`. En `bypass` el guard deja pasar
 * (auth-required.guard.ts:14) y `UserRolesService` concede ambos roles, de modo que el menu se
 * renderiza completo.
 */
beforeEach(() => {
  cy.intercept('GET', '**/config/keycloak-config.json', {
    statusCode: 200,
    body: {
      url: 'https://keycloak.test',
      realm: 'test-realm',
      clientId: 'data-dashboard',
      authMode: 'bypass',
    },
  });
});
