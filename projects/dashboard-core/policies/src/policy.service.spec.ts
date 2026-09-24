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

import { TestBed } from '@angular/core/testing';

import { EdcClientService } from '@eclipse-edc/dashboard-core';
import type { EdcConnectorClient } from '@think-it-labs/edc-connector-client';

import { PolicyService } from './policy.service';

describe('PolicyService', () => {
  let service: PolicyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PolicyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getPolicyDefinitionById delegates to management client', async () => {
    const getSpy = jasmine.createSpy('get').and.resolveTo({ '@id': 'policy-uuid', '@type': 'PolicyDefinition' });
    const edcSpy = jasmine.createSpyObj<EdcClientService>('EdcClientService', ['getClient']);
    edcSpy.getClient.and.resolveTo({
      management: { policyDefinitions: { get: getSpy } },
    } as unknown as EdcConnectorClient);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: EdcClientService, useValue: edcSpy }, PolicyService],
    });
    const s = TestBed.inject(PolicyService);

    const result = await s.getPolicyDefinitionById('policy-uuid');
    expect(getSpy).toHaveBeenCalledWith('policy-uuid');
    expect((result as { '@id': string })['@id']).toBe('policy-uuid');
  });
});
