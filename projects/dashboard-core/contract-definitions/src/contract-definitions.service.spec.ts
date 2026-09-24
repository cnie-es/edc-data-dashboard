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
import { ContractDefinitionsService } from './contract-definitions.service';
import type { ContractDefinition } from '@think-it-labs/edc-connector-client';

describe('ContractDefinitionsService', () => {
  let service: ContractDefinitionsService;
  let queryAllSpy: jasmine.Spy;

  beforeEach(() => {
    queryAllSpy = jasmine.createSpy('queryAll').and.resolveTo([] as ContractDefinition[]);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: EdcClientService,
          useValue: {
            getClient: jasmine.createSpy('getClient').and.resolveTo({
              management: {
                contractDefinitions: {
                  queryAll: queryAllSpy,
                },
              },
            }),
          },
        },
      ],
    });
    service = TestBed.inject(ContractDefinitionsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('calls contractdefinitions request with base QuerySpec when no search is provided', async () => {
    await service.getAllContractDefinitions();

    expect(queryAllSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        '@type': 'QuerySpec',
        offset: 0,
        limit: 50,
      }),
    );
  });
});
