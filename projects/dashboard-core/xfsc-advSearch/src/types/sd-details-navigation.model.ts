import type { SelfDescriptorModel } from '../models/self-descriptor.model';

export interface SdDetailsNavigationState {
  sd?: SelfDescriptorModel;
  returnTo?: string;
}
