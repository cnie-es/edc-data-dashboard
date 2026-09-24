import type { Asset } from '@think-it-labs/edc-connector-client';
import type { EdcClientService } from '../services/edc-client.service';
import { assetHasLinkedOffers } from './asset-linked-offers.util';
import { mergeEdcAssetIntoCorpusDetailVm } from './corpus-edc-asset-detail-merge.util';
import {
  mapCorpusOfferingSelfDescription,
  type OfferSelfDescriptionDetailViewModel,
} from './corpus-offering-self-description.mapper';
import {
  getMockSelfDescriptionBody,
  MOCK_CORPUS_OFFERING_SELF_DESCRIPTION,
} from './corpus-offering-self-description.mock';
import { catchError, from, map, of, switchMap, type Observable } from 'rxjs';

/** Minimal XFSC client surface used to load self-description bodies. */
export interface CorpusSelfDescriptionDetailFetcher {
  detailedSearchSD(selfDescriptorID: string): Observable<unknown>;
}

export interface CorpusSelfDescriptionDetailLoadResult {
  vm?: OfferSelfDescriptionDetailViewModel;
  hasLinkedOffers: boolean;
  errorMessageKey?: string;
}

export interface LoadCorpusSelfDescriptionDetailOptions {
  sdId: string;
  useMocks: boolean;
  xfsc: CorpusSelfDescriptionDetailFetcher;
  edc?: EdcClientService;
  edcAssetId?: string;
  /** When set, sparse VM fields are filled from EDC asset properties. */
  edcAsset?: Asset;
}

/** Maps raw XFSC self-description JSON to a detail VM (Mis ofertas / Mis activos parity). */
export function mapBodyToCorpusDetailVm(
  body: Record<string, unknown>,
  edcAsset?: Asset,
): OfferSelfDescriptionDetailViewModel {
  return mergeEdcAssetIntoCorpusDetailVm(mapCorpusOfferingSelfDescription(body), edcAsset);
}

export function loadCorpusSelfDescriptionDetail(
  options: LoadCorpusSelfDescriptionDetailOptions,
): Observable<CorpusSelfDescriptionDetailLoadResult> {
  const sdId = options.sdId.trim();
  if (!sdId) {
    return of({
      vm: undefined,
      hasLinkedOffers: false,
      errorMessageKey: 'assets.detail.errorInvalidId',
    });
  }

  const mockBody = options.useMocks
    ? (getMockSelfDescriptionBody(sdId) ?? { ...MOCK_CORPUS_OFFERING_SELF_DESCRIPTION })
    : undefined;
  const source$ = mockBody ? of(mockBody) : options.xfsc.detailedSearchSD(sdId);

  return source$.pipe(
    switchMap(body => {
      const mapped = mapBodyToCorpusDetailVm(body as Record<string, unknown>, options.edcAsset);
      const assetId = options.edcAssetId?.trim();
      if (!assetId || !options.edc) {
        return of({ vm: mapped, hasLinkedOffers: false });
      }
      return from(assetHasLinkedOffers(options.edc, assetId)).pipe(
        catchError(() => of(false)),
        map(hasLinked => ({ vm: mapped, hasLinkedOffers: hasLinked })),
      );
    }),
    catchError(() =>
      of({
        vm: undefined,
        hasLinkedOffers: false,
        errorMessageKey: 'assets.detail.errorLoadFailed',
      }),
    ),
  );
}

export function decodeSdRouteParam(raw: string): string {
  const t = raw.trim();
  if (!t) {
    return '';
  }
  try {
    return decodeURIComponent(t);
  } catch {
    return t;
  }
}
