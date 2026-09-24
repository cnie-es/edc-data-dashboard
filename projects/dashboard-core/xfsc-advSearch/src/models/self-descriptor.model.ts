export interface SelfDescriptorModel {
  selfDescriptionId: string;
  claimsGraphUri0: string[];
  offeringType?: string;
  name: string;
  description: string;
  inLanguage: string;
  serviceAccessPoint?: string;
  text?: string;
}

export const createSelfDescriptor = (input: {
  selfDescriptionId: string;
  claimsGraphUri0: string[];
  name: string;
  description: string;
  inLanguage: string;
  offeringType?: string;
  serviceAccessPoint?: string;
  text?: string;
}): SelfDescriptorModel => ({
  selfDescriptionId: input.selfDescriptionId,
  claimsGraphUri0: input.claimsGraphUri0,
  name: input.name,
  description: input.description,
  inLanguage: input.inLanguage,
  offeringType: input.offeringType,
  serviceAccessPoint: input.serviceAccessPoint,
  text: input.text,
});
