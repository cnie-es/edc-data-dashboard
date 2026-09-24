import { ConsumerProviderSwitchComponent } from '@eclipse-edc/dashboard-core';
import { createOutputSpy, mount } from 'cypress/angular';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

/**
 * Traducciones de fixture: el texto de cada opcion sale de `{{ 'consumer' | translate }}`,
 * asi que sin traducciones cargadas no queda texto por el que seleccionar la opcion.
 */
const i18n = TranslateModule.forRoot({
  lang: 'es',
  fallbackLang: 'es',
  loader: {
    provide: TranslateLoader,
    useValue: { getTranslation: () => of({ consumer: 'Consumidor', provider: 'Proveedor' }) },
  },
});

/**
 * Estos tests seleccionaban con `input[aria-label="consumer"]` y accionaban el radio con
 * `.check()`. Ninguna de las dos cosas casa con la plantilla: no declara ningun `aria-label`
 * y sus radios son `.sr-only`, que Cypress se niega a accionar por estar ocultos. Se pasa a
 * seleccionar por el texto de la etiqueta, que es lo que ve el usuario, y a hacer clic en esa
 * etiqueta, que es como se acciona un radio envuelto en un <label>.
 */
describe('ConsumerProviderSwitchComponent', () => {
  it('should render both options', () => {
    mount(ConsumerProviderSwitchComponent, {
      imports: [i18n],
      componentProperties: {
        initialType: 'CONSUMER',
      },
    });

    cy.get('input').should('exist');
  });

  it('should check the initial type as CONSUMER', () => {
    mount(ConsumerProviderSwitchComponent, {
      imports: [i18n],
      componentProperties: {
        initialType: 'CONSUMER',
      },
    });

    cy.contains('label', 'Consumidor').find('input').should('be.checked');
    cy.contains('label', 'Proveedor').find('input').should('not.be.checked');
  });

  it('should emit event when switching to PROVIDER', () => {
    const changeSpy = createOutputSpy('changeSpy');

    mount(ConsumerProviderSwitchComponent, {
      imports: [i18n],
      componentProperties: {
        initialType: 'CONSUMER',
        changed: changeSpy,
      },
    });

    cy.contains('label', 'Proveedor').click();
    cy.get('@changeSpy').should('have.been.calledWith', 'PROVIDER');
  });

  it('should emit event when switching to CONSUMER', () => {
    const changeSpy = createOutputSpy('changeSpy');

    mount(ConsumerProviderSwitchComponent, {
      imports: [i18n],
      componentProperties: {
        initialType: 'PROVIDER',
        changed: changeSpy,
      },
    });

    cy.contains('label', 'Consumidor').click();
    cy.get('@changeSpy').should('have.been.calledWith', 'CONSUMER');
  });
});
