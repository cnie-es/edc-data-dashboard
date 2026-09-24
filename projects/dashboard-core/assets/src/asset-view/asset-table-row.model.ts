import { Asset } from '@think-it-labs/edc-connector-client';

export interface AssetTableRow {
  id: string;
  creationDate: string;
  creationTimestamp: number;
  type: string;
  assetName: string;
  description: string;
  detailPayload: unknown;
  sourceAsset?: Asset;
}
