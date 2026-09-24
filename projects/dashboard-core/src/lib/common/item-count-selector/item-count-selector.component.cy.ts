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

import { createOutputSpy, mount } from 'cypress/angular';
import { ItemCountSelectorComponent } from '@eclipse-edc/dashboard-core';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

/**
 * Traducciones de fixture. El componente resuelve su texto con ngx-translate; sin
 * traducciones cargadas el pipe devuelve la clave y las aserciones de texto fallan.
 * Mismo criterio que los .spec.ts de Karma, que usan translate.setTranslation.
 */
const i18n = TranslateModule.forRoot({
  lang: 'es',
  fallbackLang: 'es',
  loader: {
    provide: TranslateLoader,
    useValue: { getTranslation: () => of({ show_items_per_page: 'Mostrar {{count}} items por pagina' }) },
  },
});

describe('ItemCountSelectorComponent', () => {
  it('should display the correct label', () => {
    mount(ItemCountSelectorComponent, {
      imports: [i18n],
    });

    cy.get('button').contains('Mostrar 10 items por pagina').should('exist');
  });

  it('should have the default selected item count', () => {
    const defaultCount = 10;
    mount(ItemCountSelectorComponent, {
      imports: [i18n],
      componentProperties: {
        currentItemCount: defaultCount,
      },
    });

    cy.get('button').contains(`Mostrar ${defaultCount} items por pagina`).should('exist');
  });

  it('should emit itemCountChanged event on selection change', () => {
    const itemCountChangedSpy = createOutputSpy('itemCountChangedSpy');
    mount(ItemCountSelectorComponent, {
      imports: [i18n],
      componentProperties: {
        itemCountChanged: itemCountChangedSpy,
      },
    });

    cy.get('button').contains('Mostrar 10 items por pagina').click();
    cy.get('.dropdown-content button').contains(/^15$/).click();
    cy.get('@itemCountChangedSpy').should('have.been.calledWith', 15);
  });

  it('should blur the select element after change', () => {
    mount(ItemCountSelectorComponent, {
      imports: [i18n],
    });

    cy.get('button').contains('Mostrar 10 items por pagina').click();
    cy.get('.dropdown-content button').contains(/^20$/).click();
    cy.document().its('activeElement.tagName').should('eq', 'BODY');
  });

  it('should contain all options', () => {
    mount(ItemCountSelectorComponent, {
      imports: [i18n],
    });

    cy.get('button').contains('Mostrar 10 items por pagina').click();
    cy.get('.dropdown-content button').should('have.length', 6);
    cy.get('.dropdown-content button').each((option, index) => {
      const values = ['5', '10', '15', '20', '50', '100'];
      cy.wrap(option).should('have.text', values[index]);
    });
  });
});
