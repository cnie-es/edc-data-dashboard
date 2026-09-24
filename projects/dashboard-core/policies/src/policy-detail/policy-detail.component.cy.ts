import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { mount } from 'cypress/angular';
import { AssetService } from '@eclipse-edc/dashboard-core/assets';

import { PolicyService } from '../policy.service';
import { PolicyDetailComponent } from './policy-detail.component';

describe('PolicyDetailComponent', () => {
  it('should mount with stubs', () => {
    mount(PolicyDetailComponent, {
      imports: [TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: PolicyService,
          useValue: {
            getAllPolicies: () => Promise.resolve([]),
            getPolicyDefinitionById: () => Promise.resolve({ '@id': 'stub', '@type': 'PolicyDefinition' }),
          },
        },
        {
          provide: AssetService,
          useValue: {
            getAssetsCacheSnapshotOrLoad: () =>
              Promise.resolve({ data: [], fetchedAt: Date.now(), expiresAt: Date.now() + 1, isRefreshing: false }),
          },
        },
        { provide: ActivatedRoute, useValue: {
            snapshot: { paramMap: convertToParamMap({ id: 'stub-policy' }), queryParamMap: convertToParamMap({}) },
          } },
        { provide: Router, useValue: { navigate: () => undefined } },
      ],
    });

    cy.contains('button', 'Ver listado').should('exist');
  });
});
