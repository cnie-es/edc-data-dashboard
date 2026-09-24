import type { ContractNegotiation, TransferProcess } from '@think-it-labs/edc-connector-client';
import {
  readNegotiationCounterPartyId,
  readTransferAssetId,
  readTransferContractId,
} from '../../../transfer/src/transfer-process-fields.util';

describe('transfer-process-fields.util', () => {
  it('reads plain assetId and contractId', () => {
    const tp = {
      assetId: '  asset-1  ',
      contractId: '  contract-1 ',
    } as unknown as TransferProcess;
    expect(readTransferAssetId(tp)).toBe('asset-1');
    expect(readTransferContractId(tp)).toBe('contract-1');
  });

  it('reads expanded JSON-LD keys when plain fields are absent', () => {
    const edc = 'https://w3id.org/edc/v0.0.1/ns/';
    const tp = {
      [`${edc}assetId`]: 'asset-ld',
      [`${edc}contractAgreementId`]: 'agreement-ld',
    } as unknown as TransferProcess;
    expect(readTransferAssetId(tp)).toBe('asset-ld');
    expect(readTransferContractId(tp)).toBe('agreement-ld');
  });

  it('reads counterPartyId from compact negotiation JSON', () => {
    const negotiation = {
      '@type': 'ContractNegotiation',
      '@id': '6a7a75cc-726a-441f-bdf0-e689f655e682',
      type: 'PROVIDER',
      counterPartyId: 'devrioja',
      contractAgreementId: '8383d84c-4e02-44d0-a23f-ac55737fd241',
    } as unknown as ContractNegotiation;
    expect(readNegotiationCounterPartyId(negotiation)).toBe('devrioja');
  });

  it('reads counterPartyId from expanded JSON-LD negotiation keys', () => {
    const edc = 'https://w3id.org/edc/v0.0.1/ns/';
    const negotiation = {
      [`${edc}counterPartyId`]: 'devrioja-expanded',
    } as unknown as ContractNegotiation;
    expect(readNegotiationCounterPartyId(negotiation)).toBe('devrioja-expanded');
  });

  it('reads counterPartyId via optionalValue when plain fields are absent', () => {
    const negotiation = {
      optionalValue: <T>(_ns: string, prop: string) =>
        (prop === 'counterPartyId' ? 'devrioja-client' : undefined) as T | undefined,
    } as unknown as ContractNegotiation;
    expect(readNegotiationCounterPartyId(negotiation)).toBe('devrioja-client');
  });
});
