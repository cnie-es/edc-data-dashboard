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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EdcConnectorClientError, EdcConnectorClientErrorType } from '@think-it-labs/edc-connector-client';
import { PolicyCreateComponent } from './policy-create.component';
import { PolicyService } from '../policy.service';

describe('PolicyCreateComponent', () => {
  let component: PolicyCreateComponent;
  let fixture: ComponentFixture<PolicyCreateComponent>;
  let policyService: jasmine.SpyObj<PolicyService>;

  beforeEach(async () => {
    policyService = jasmine.createSpyObj<PolicyService>('PolicyService', ['createPolicyDefinition']);

    await TestBed.configureTestingModule({
      imports: [PolicyCreateComponent, TranslateModule.forRoot()],
      providers: [{ provide: PolicyService, useValue: policyService }],
    }).compileComponents();

    fixture = TestBed.createComponent(PolicyCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set errorMessageKey when createPolicyDefinition fails with EdcConnectorClientError', async () => {
    policyService.createPolicyDefinition.and.returnValue(
      Promise.reject(new EdcConnectorClientError(EdcConnectorClientErrorType.BadRequest, 'api msg')),
    );
    component.policyType = 'Set';
    component.permissionsJson = '';
    component.prohibitionsJson = '';
    component.obligationsJson = '';

    component.createPolicyDefinition();
    await fixture.whenStable();

    expect(component.errorMessageKey).toBe('common.errors.edc.badRequest');
  });

  it('should set errorMessageKey for invalid permissions JSON', () => {
    component.policyType = 'Set';
    component.permissionsJson = '{invalid';
    component.prohibitionsJson = '';
    component.obligationsJson = '';

    component.createPolicyDefinition();

    expect(component.errorMessageKey).toBe('policies.errors.invalidPermissionsJson');
  });
});
