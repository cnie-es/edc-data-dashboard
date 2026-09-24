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

import { Injectable, inject } from '@angular/core';
import { EdcClientService } from '@eclipse-edc/dashboard-core';
import type {
  ContractDefinition,
  ContractDefinitionInput,
  IdResponse,
  QuerySpec,
} from '@think-it-labs/edc-connector-client';
import { normalizeContractDefinition } from './offer-card-view-model';

type ContractDefinitionsQuerySpec = QuerySpec & { '@type': 'QuerySpec' };

@Injectable({
  providedIn: 'root',
})
export class ContractDefinitionsService {
  private readonly edc = inject(EdcClientService);

  /**
   * Retrieves all contract definitions from the management API.
   * Optionally applies a title-based backend filter.
   * Falls back to an unfiltered request if the backend does not support the filter.
   * @returns A promise that resolves to an array of contract definitions.
   */
  public async getAllContractDefinitions(titleSearch?: string): Promise<ContractDefinition[]> {
    const client = await this.edc.getClient();
    let contractDefinitions: ContractDefinition[];
    const baseQuerySpec: ContractDefinitionsQuerySpec = this.createBaseQuerySpec();

    if (titleSearch?.trim()) {
      const querySpec: ContractDefinitionsQuerySpec = {
        ...baseQuerySpec,
        sortOrder: 'DESC' as const,
        filterExpression: [
          {
            operandLeft: 'title',
            operator: 'like',
            operandRight: `%${titleSearch.trim()}%`,
          },
        ],
      };

      try {
        contractDefinitions = await client.management.contractDefinitions.queryAll(querySpec);
      } catch {
        contractDefinitions = await client.management.contractDefinitions.queryAll(baseQuerySpec);
      }
    } else {
      contractDefinitions = await client.management.contractDefinitions.queryAll(baseQuerySpec);
    }

    return contractDefinitions.map(normalizeContractDefinition);
  }

  private createBaseQuerySpec(): ContractDefinitionsQuerySpec {
    return {
      '@type': 'QuerySpec',
      offset: 0,
      limit: 50,
    };
  }

  /**
   * Creates a new contract definition using the provided contract definition input.
   * @param contractDefinitionInput - The input data required to create a new contract definition.
   * @returns A promise that resolves to the ID response of the created contract definition.
   */
  public async createContractDefinition(contractDefinitionInput: ContractDefinitionInput): Promise<IdResponse> {
    return (await this.edc.getClient()).management.contractDefinitions.create(contractDefinitionInput);
  }

  /**
   * Updates an existing contract definition with the provided contract definition input.
   * @param contractDefinitionInput - The input data required to update the contract definition.
   * @returns A promise that resolves when the contract definition is successfully updated.
   */
  public async updateContractDefinition(contractDefinitionInput: ContractDefinitionInput): Promise<void> {
    return (await this.edc.getClient()).management.contractDefinitions.update(contractDefinitionInput);
  }

  /**
   * Deletes a contract definition based on the provided ID.
   * @param contractDefinition - The unique identifier of the contract definition to be deleted.
   * @returns A promise that resolves when the contract definition is successfully deleted.
   */
  public async deleteContractDefinition(contractDefinition: ContractDefinition): Promise<void> {
    return (await this.edc.getClient()).management.contractDefinitions.delete(contractDefinition.id);
  }
}
