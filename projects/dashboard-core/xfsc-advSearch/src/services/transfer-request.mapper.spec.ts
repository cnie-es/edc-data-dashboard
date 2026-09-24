import { toTransferStartRequest } from './transfer-request.mapper';

describe('toTransferStartRequest', () => {
  it('maps negotiation status field names to contract-consumption API names', () => {
    expect(
      toTransferStartRequest({
        contractAgreementId: '07580754-efce-47f2-98f0-b0481e3d6cc9',
        counterPartyAddress: 'https://provider.example/edc/protocol',
        templateId: 'HttpData-PUSH',
        dataDestination: {
          type: 'HttpData',
          baseUrl: 'http://127.0.0.1:9090/recibir',
          path: '/receive',
        },
      }),
    ).toEqual({
      contractId: '07580754-efce-47f2-98f0-b0481e3d6cc9',
      providerEndpoint: 'https://provider.example/edc/protocol',
      templateId: 'HttpData-PUSH',
      dataDestination: {
        type: 'HttpData',
        baseUrl: 'http://127.0.0.1:9090/recibir',
        path: '/receive',
      },
    });
  });
});
