import type { EdcTransferRequestData, TransferStartRequest } from '../types/contract-negotiation.model';

export function toTransferStartRequest(data: EdcTransferRequestData): TransferStartRequest {
  return {
    contractId: data.contractAgreementId,
    providerEndpoint: data.counterPartyAddress,
    templateId: data.templateId,
    dataDestination: data.dataDestination,
  };
}
