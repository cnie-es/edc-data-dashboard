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

import { Component, EventEmitter, Input, OnChanges, Output, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { PolicyService } from '../policy.service';
import { PolicyType } from '@think-it-labs/edc-connector-client/dist/src/entities/policy/policy';
import {
  compact,
  IdResponse,
  PolicyBuilder,
  PolicyDefinition,
  PolicyDefinitionInput,
  PolicyInput,
} from '@think-it-labs/edc-connector-client';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  AlertComponent,
  AppConfig,
  BreadcrumbsComponent,
  DashboardErrorService,
  DashboardResolvableError,
  type BreadcrumbItem,
} from '@eclipse-edc/dashboard-core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'lib-policy-create',
  standalone: true,
  imports: [FormsModule, RouterModule, BreadcrumbsComponent, TranslateModule, AlertComponent],
  templateUrl: './policy-create.component.html',
  styleUrl: './policy-create.component.css',
})
export class PolicyCreateComponent implements OnChanges {
  private readonly policyService = inject(PolicyService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly dashboardError = inject(DashboardErrorService);
  protected readonly Object = Object;

  private translate = inject(TranslateService);

  get breadcrumbItemsTranslated(): BreadcrumbItem[] {
    return this.breadcrumbItems.map(item => ({
      ...item,
      label: this.translate.instant(item.label),
    }));
  }

  readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: 'menu.home', route: '/home' },
    { label: 'menu.policies', route: '/policies' },
    { label: 'policies.createpolicy' },
  ];

  route = inject(ActivatedRoute);

  @Input() appConfig!: AppConfig;
  @Input() policyDefinition?: PolicyDefinition;

  @Output() created = new EventEmitter<IdResponse>();
  @Output() updated = new EventEmitter<void>();
  mode: 'create' | 'update' = 'create';

  errorMessageKey?: string;
  errorParams?: Record<string, string | number>;

  id = '';
  policyType?: PolicyType;
  permissionsJson = '';
  prohibitionsJson = '';
  obligationsJson = '';

  policyForm: FormGroup;

  constructor() {
    this.policyForm = this.formBuilder.group({
      id: [''],
      policyType: [''],
    });
  }

  async ngOnChanges() {
    if (this.policyDefinition) {
      const compactPolicy = await compact(this.policyDefinition.policy);
      this.mode = 'update';
      this.id = this.policyDefinition['@id'];

      const typeSplit: string[] = compactPolicy['@type'].split('/');
      this.policyType = typeSplit[typeSplit.length - 1] as PolicyType;
      if (this.policyDefinition.policy.permissions.length > 0) {
        this.permissionsJson = JSON.stringify(await compact(this.policyDefinition.policy.permissions));
      }
      if (this.policyDefinition.policy.prohibitions.length > 0) {
        this.prohibitionsJson = JSON.stringify(await compact(this.policyDefinition.policy.prohibitions));
      }

      if (this.policyDefinition.policy.obligations.length > 0) {
        this.obligationsJson = JSON.stringify(await compact(this.policyDefinition.policy.obligations));
      }
    }
  }

  showForm = signal(false);
  selectedPolicyType = signal('');

  openForm(type: string) {
    this.selectedPolicyType.set(type);
    this.showForm.set(true);
  }

  createPolicyDefinition(): void {
    try {
      const policyInput: PolicyDefinitionInput = this.createPolicyInput();
      this.policyService
        .createPolicyDefinition(policyInput)
        .then((idResponse: IdResponse) => {
          this.created.emit(idResponse);
        })
        .catch((err: unknown) => {
          this.setInlineError(err);
        });
    } catch (err: unknown) {
      this.setInlineError(err);
    }
  }

  editPolicyDefinition(): void {
    try {
      const policyInput: PolicyDefinitionInput = this.createPolicyInput();
      this.policyService
        .updatePolicy(policyInput.id!, policyInput)
        .then(() => this.updated.emit())
        .catch((err: unknown) => {
          this.setInlineError(err);
        });
    } catch (err: unknown) {
      this.setInlineError(err);
    }
  }

  private setInlineError(error: unknown): void {
    const resolved = this.dashboardError.showInline(error, { domain: 'policies' });
    this.errorMessageKey = resolved.messageKey;
    this.errorParams = resolved.params;
  }

  private createPolicyInput(): PolicyDefinitionInput {
    const policyInput: PolicyInput = {
      '@type': this.policyType,
      profiles: [],
    };

    try {
      if (this.permissionsJson && this.permissionsJson !== '') {
        policyInput.permission = JSON.parse(this.permissionsJson);
      }
    } catch {
      throw new DashboardResolvableError({
        messageKey: 'policies.errors.invalidPermissionsJson',
        severity: 'error',
      });
    }

    try {
      if (this.prohibitionsJson && this.prohibitionsJson !== '') {
        policyInput.prohibition = JSON.parse(this.prohibitionsJson);
      }
    } catch {
      throw new DashboardResolvableError({
        messageKey: 'policies.errors.invalidProhibitionsJson',
        severity: 'error',
      });
    }

    try {
      if (this.obligationsJson && this.obligationsJson !== '') {
        policyInput.obligation = JSON.parse(this.obligationsJson);
      }
    } catch {
      throw new DashboardResolvableError({
        messageKey: 'policies.errors.invalidObligationsJson',
        severity: 'error',
      });
    }

    let policy;
    if (this.policyType) {
      policy = new PolicyBuilder().type(this.policyType).raw(policyInput).build();
    } else {
      policy = new PolicyBuilder()
        .type('Set' as PolicyType)
        .raw(policyInput)
        .build();
    }

    const policyDefinitionInput: PolicyDefinitionInput = {
      policy: policy,
    };

    if (this.id) {
      policyDefinitionInput.id = this.id;
      policyDefinitionInput['@id'] = this.id;
    }

    return policyDefinitionInput;
  }
}
