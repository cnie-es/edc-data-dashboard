// Karma for this library only runs specs under projects/dashboard-core/src/.
import { TestBed } from '@angular/core/testing';
import { EdcClientService } from '@eclipse-edc/dashboard-core';
import { ContractAgreement, ContractNegotiation, QuerySpec } from '@think-it-labs/edc-connector-client';
import { NegotiationsService } from '../../../../negotiations/src/negotiations.service';

describe('NegotiationsService', () => {
  function setup(edc: { getClient: jasmine.Spy }): NegotiationsService {
    TestBed.configureTestingModule({
      providers: [NegotiationsService, { provide: EdcClientService, useValue: edc }],
    });
    return TestBed.inject(NegotiationsService);
  }

  function providerQuerySpec(): QuerySpec {
    return {
      sortField: 'createdAt',
      sortOrder: 'DESC',
      filterExpression: [{ operandLeft: 'type', operator: '=', operandRight: 'PROVIDER' }],
    };
  }

  it('delegates getAllContractNegotiations to EDC contractNegotiations.queryAll', async () => {
    const negotiations: ContractNegotiation[] = [{ id: 'n1' } as ContractNegotiation];
    const queryAll = jasmine.createSpy('queryAll').and.resolveTo(negotiations);
    const getClient = jasmine.createSpy('getClient').and.resolveTo({
      management: { contractNegotiations: { queryAll, getAgreement: jasmine.createSpy() } },
    });
    const service = setup({ getClient });
    const spec = providerQuerySpec();

    const result = await service.getAllContractNegotiations(spec);

    expect(getClient).toHaveBeenCalled();
    expect(queryAll).toHaveBeenCalledWith(spec);
    expect(result).toBe(negotiations);
  });

  it('delegates getAgreementForNegotiation to EDC client', async () => {
    const agreement = { id: 'ag-1' } as ContractAgreement;
    const getAgreement = jasmine.createSpy('getAgreement').and.resolveTo(agreement);
    const getClient = jasmine.createSpy('getClient').and.resolveTo({
      management: { contractNegotiations: { queryAll: jasmine.createSpy(), getAgreement } },
    });
    const service = setup({ getClient });
    const result = await service.getAgreementForNegotiation('neg-1');
    expect(getClient).toHaveBeenCalled();
    expect(getAgreement).toHaveBeenCalledWith('neg-1');
    expect(result).toBe(agreement);
  });
});
