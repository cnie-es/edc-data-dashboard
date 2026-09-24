import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { mapCorpusOfferingSelfDescription } from '@eclipse-edc/dashboard-core';
import {
  applyUsagePolicyLabelsToOfferCard,
  buildOfferCardViewModelFromSelfDescriptionDetail,
  buildPlaceholderOfferCardFromSearchSummary,
  type OfferCardViewModel,
} from '@eclipse-edc/dashboard-core/contract-definitions';
import { SimplAdvancedSearchService, type SelfDescriptorModel } from '@eclipse-edc/dashboard-core/xfsc-advSearch';
import { firstValueFrom } from 'rxjs';

function normalizeSdId(selfDescriptionId: string): string {
  return selfDescriptionId.trim().toLowerCase();
}

@Injectable({
  providedIn: 'root',
})
export class CatalogOfferCardEnrichmentService {
  private readonly xfscSearch = inject(SimplAdvancedSearchService);
  private readonly translate = inject(TranslateService);

  private readonly cacheBySdId = new Map<string, OfferCardViewModel>();
  private readonly inflightBySdId = new Map<string, Promise<OfferCardViewModel>>();

  clearCache(): void {
    this.cacheBySdId.clear();
    this.inflightBySdId.clear();
  }

  getCached(selfDescriptionId: string): OfferCardViewModel | undefined {
    return this.cacheBySdId.get(normalizeSdId(selfDescriptionId));
  }

  /**
   * Resolves offer cards for the current page: cached hits return immediately;
   * others fetch detailedSearchSD in parallel (deduped per self-description id).
   */
  async enrichPage(summaries: readonly SelfDescriptorModel[]): Promise<OfferCardViewModel[]> {
    return Promise.all(summaries.map(summary => this.resolveCard(summary)));
  }

  private async resolveCard(summary: SelfDescriptorModel): Promise<OfferCardViewModel> {
    const sdId = summary.selfDescriptionId?.trim();
    if (!sdId) {
      return buildPlaceholderOfferCardFromSearchSummary({
        selfDescriptionId: '',
        name: summary.name,
        description: summary.description,
        offeringType: summary.offeringType,
        policyEnrichmentStatus: 'error',
      });
    }

    const key = normalizeSdId(sdId);
    const cached = this.cacheBySdId.get(key);
    if (cached) {
      return cached;
    }

    const inflight = this.inflightBySdId.get(key);
    if (inflight) {
      return inflight;
    }

    const promise = this.fetchAndMapCard(summary, sdId)
      .then(card => {
        this.cacheBySdId.set(key, card);
        return card;
      })
      .finally(() => {
        this.inflightBySdId.delete(key);
      });

    this.inflightBySdId.set(key, promise);
    return promise;
  }

  private async fetchAndMapCard(summary: SelfDescriptorModel, sdId: string): Promise<OfferCardViewModel> {
    try {
      const body = await firstValueFrom(this.xfscSearch.detailedSearchSD(sdId));
      const vm = mapCorpusOfferingSelfDescription(body as Record<string, unknown>);
      const card = buildOfferCardViewModelFromSelfDescriptionDetail(vm, sdId);
      return applyUsagePolicyLabelsToOfferCard(card, vm, this.translate);
    } catch {
      return buildPlaceholderOfferCardFromSearchSummary({
        selfDescriptionId: sdId,
        name: summary.name,
        description: summary.description,
        offeringType: summary.offeringType,
        policyEnrichmentStatus: 'error',
      });
    }
  }

  /** Returns placeholders with loading status while detailed fetch runs. */
  buildLoadingPlaceholders(summaries: readonly SelfDescriptorModel[]): OfferCardViewModel[] {
    return summaries.map(summary => {
      const sdId = summary.selfDescriptionId?.trim() ?? '';
      const cached = sdId ? this.getCached(sdId) : undefined;
      if (cached) {
        return cached;
      }
      return buildPlaceholderOfferCardFromSearchSummary({
        selfDescriptionId: sdId,
        name: summary.name,
        description: summary.description,
        offeringType: summary.offeringType,
        policyEnrichmentStatus: 'loading',
      });
    });
  }
}
