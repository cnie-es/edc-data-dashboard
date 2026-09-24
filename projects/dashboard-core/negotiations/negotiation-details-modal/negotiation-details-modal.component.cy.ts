import { NegotiationDetailsModalComponent } from './negotiation-details-modal.component';
import { TranslateModule } from '@ngx-translate/core';

describe('NegotiationDetailsModalComponent', () => {
  it('should mount', () => {
    cy.mount(NegotiationDetailsModalComponent, {
      imports: [TranslateModule.forRoot()],
    });
  });
});
