import { Injectable, inject } from '@angular/core';
import { EdcClientService } from '@eclipse-edc/dashboard-core';
import { ContractAgreement, ContractNegotiation, QuerySpec } from '@think-it-labs/edc-connector-client';

@Injectable({
  providedIn: 'root',
})
export class NegotiationsService {
  private readonly edc = inject(EdcClientService);

  public async getAllContractNegotiations(querySpec?: QuerySpec): Promise<ContractNegotiation[]> {
    return (await this.edc.getClient()).management.contractNegotiations.queryAll(querySpec);
  }

  public async getAgreementForNegotiation(negotiationId: string): Promise<ContractAgreement> {
    return (await this.edc.getClient()).management.contractNegotiations.getAgreement(negotiationId);
  }
}
