import { Injectable, inject } from '@angular/core';
import type { PolicyDefinition } from '@think-it-labs/edc-connector-client';
import type { TranslateService } from '@ngx-translate/core';
import { allowDashboardMocks, type EdcConfig } from '@eclipse-edc/dashboard-core';
import { PolicyService } from './policy.service';
import {
  buildPolicyListLabels,
  buildPolicyLoadErrorLabels,
  parsePolicyOdrl,
  type PolicyListKind,
} from './policy-display.util';
import { getMockPolicyDefinitionForRouteId } from './policy-detail/policy-definition-mock.response';
import type { PolicyUI } from './policy.models';
import type { OfferPolicyEnrichable } from './offer-policy-enrichable';

@Injectable({
  providedIn: 'root',
})
export class PolicyListEnrichmentService {
  private readonly policyService = inject(PolicyService);

  private readonly cache = new Map<string, PolicyDefinition>();
  private edcConfig: EdcConfig | undefined;

  setEdcConfig(config: EdcConfig | undefined): void {
    this.edcConfig = config;
  }

  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Rebuilds name/description from cached definitions (no API calls). Used after language change.
   */
  relabelRows(rows: PolicyUI[], translate: TranslateService): void {
    const pending = translate.instant('policies.list.pending');
    for (const row of rows) {
      if (row.enrichmentStatus === 'idle' || row.enrichmentStatus === 'loading') {
        row.name = pending;
        row.description = pending;
        continue;
      }
      if (row.enrichmentStatus === 'error') {
        const fallback = buildPolicyLoadErrorLabels(row.policyDefinitionId, translate, {
          assetDisplayName: row.assetDisplayName,
        });
        row.name = fallback.name;
        row.description = fallback.description;
        continue;
      }
      const definition = this.cache.get(row.policyDefinitionId);
      if (!definition) {
        continue;
      }
      const kind = row.type === 'Publicación' || row.type === 'Contratación' ? row.type : 'Contratación';
      const parsed = parsePolicyOdrl(definition);
      const labels = buildPolicyListLabels(parsed, kind, translate, {
        assetDisplayName: row.assetDisplayName,
      });
      row.name = labels.name;
      row.description = labels.description;
    }
  }

  /**
   * Rebuilds offer card policy labels from cache (no API). Used after language change.
   */
  relabelOfferCards(cards: OfferPolicyEnrichable[], translate: TranslateService): void {
    const pending = translate.instant('policies.list.pending');
    for (const card of cards) {
      if (!card.contractPolicyId) {
        continue;
      }
      if (card.policyEnrichmentStatus === 'idle' || card.policyEnrichmentStatus === 'loading') {
        card.policySummary = pending;
        // `providerLabel` is deliberately left alone: the card renders a skeleton while pending, so
        // the placeholder would never be shown, but the card resolves the label against the
        // participants API — stamping it here fires `GET /participants/Cargando…`.
        continue;
      }
      if (card.policyEnrichmentStatus === 'error') {
        const fallback = buildPolicyLoadErrorLabels(card.contractPolicyId, translate, {
          assetDisplayName: card.assetDisplayName,
        });
        card.policySummary = fallback.name;
        continue;
      }
      const definition = this.cache.get(card.contractPolicyId);
      if (!definition) {
        continue;
      }
      const parsed = parsePolicyOdrl(definition);
      const labels = buildPolicyListLabels(parsed, 'Contratación', translate, {
        assetDisplayName: card.assetDisplayName,
      });
      card.policySummary = labels.name;
      this.applyOfferCardAssignerLabel(card, parsed);
    }
  }

  private applyOfferCardAssignerLabel(card: OfferPolicyEnrichable, parsed: ReturnType<typeof parsePolicyOdrl>): void {
    const assigner = parsed.assigner?.trim();
    if (assigner) {
      card.providerLabel = assigner;
    }
  }

  /**
   * Fetches a single policy definition and returns the display name for the given kind.
   */
  async enrichSinglePolicyName(
    policyDefinitionId: string,
    assetDisplayName: string,
    kind: PolicyListKind,
    translate: TranslateService,
  ): Promise<string> {
    const id = policyDefinitionId.trim();
    if (!id) {
      return '';
    }

    const definition = await this.resolveDefinition(id);
    if (!definition) {
      return buildPolicyLoadErrorLabels(id, translate, { assetDisplayName }).name;
    }

    const parsed = parsePolicyOdrl(definition);
    return buildPolicyListLabels(parsed, kind, translate, { assetDisplayName }).name;
  }

  /**
   * Fetches a single contract policy definition and returns the Contratación display name.
   */
  async enrichSingleContractPolicyName(
    policyDefinitionId: string,
    assetDisplayName: string,
    translate: TranslateService,
  ): Promise<string> {
    return this.enrichSinglePolicyName(policyDefinitionId, assetDisplayName, 'Contratación', translate);
  }

  async resolvePolicyAssigner(policyDefinitionId: string): Promise<string | undefined> {
    const id = policyDefinitionId.trim();
    if (!id) {
      return undefined;
    }

    const definition = await this.resolveDefinition(id);
    if (!definition) {
      return undefined;
    }

    return parsePolicyOdrl(definition).assigner?.trim() || undefined;
  }

  /**
   * Fetches contract policy definitions for unique ids on the current offer page and sets display names.
   */
  async enrichOfferCardPolicyNames(cards: OfferPolicyEnrichable[], translate: TranslateService): Promise<void> {
    const withPolicy = cards.filter(c => c.contractPolicyId.trim().length > 0);
    const uniqueIds = [...new Set(withPolicy.map(c => c.contractPolicyId))];
    if (uniqueIds.length === 0) {
      return;
    }

    const pending = translate.instant('policies.list.pending');
    for (const card of withPolicy) {
      if (card.policyEnrichmentStatus === 'idle' || card.policyEnrichmentStatus === 'error') {
        card.policyEnrichmentStatus = 'loading';
        card.policySummary = pending;
        // See `relabelOfferCards`: never stamp `providerLabel` with the pending placeholder.
      }
    }

    await Promise.all(uniqueIds.map(id => this.fetchAndApplyToOfferCards(id, withPolicy, translate)));
  }

  /**
   * Fetches policy definitions for unique ids on the current page (max 5 rows) and updates row labels.
   */
  async enrichPageRows(rows: PolicyUI[], translate: TranslateService): Promise<void> {
    const uniqueIds = [...new Set(rows.map(r => r.policyDefinitionId).filter(Boolean))];
    if (uniqueIds.length === 0) {
      return;
    }

    for (const row of rows) {
      if (row.enrichmentStatus === 'idle' || row.enrichmentStatus === 'error') {
        row.enrichmentStatus = 'loading';
      }
    }

    await Promise.all(uniqueIds.map(id => this.fetchAndApplyToRows(id, rows, translate)));
  }

  private async fetchAndApplyToRows(
    policyDefinitionId: string,
    rows: PolicyUI[],
    translate: TranslateService,
  ): Promise<void> {
    const matching = rows.filter(r => r.policyDefinitionId === policyDefinitionId);
    if (matching.length === 0) {
      return;
    }

    const definition = await this.resolveDefinition(policyDefinitionId);
    if (!definition) {
      for (const row of matching) {
        const fallback = buildPolicyLoadErrorLabels(policyDefinitionId, translate, {
          assetDisplayName: row.assetDisplayName,
        });
        row.name = fallback.name;
        row.description = fallback.description;
        row.enrichmentStatus = 'error';
      }
      return;
    }

    for (const row of matching) {
      const kind = row.type === 'Publicación' || row.type === 'Contratación' ? row.type : 'Contratación';
      const parsed = parsePolicyOdrl(definition);
      const labels = buildPolicyListLabels(parsed, kind as PolicyListKind, translate, {
        assetDisplayName: row.assetDisplayName,
      });
      row.name = labels.name;
      row.description = labels.description;
      row.enrichmentStatus = 'ready';
    }
  }

  private async fetchAndApplyToOfferCards(
    policyDefinitionId: string,
    cards: OfferPolicyEnrichable[],
    translate: TranslateService,
  ): Promise<void> {
    const matching = cards.filter(c => c.contractPolicyId === policyDefinitionId);
    if (matching.length === 0) {
      return;
    }

    const definition = await this.resolveDefinition(policyDefinitionId);
    if (!definition) {
      for (const card of matching) {
        const fallback = buildPolicyLoadErrorLabels(policyDefinitionId, translate, {
          assetDisplayName: card.assetDisplayName,
        });
        card.policySummary = fallback.name;
        card.policyEnrichmentStatus = 'error';
      }
      return;
    }

    for (const card of matching) {
      const parsed = parsePolicyOdrl(definition);
      const labels = buildPolicyListLabels(parsed, 'Contratación', translate, {
        assetDisplayName: card.assetDisplayName,
      });
      card.policySummary = labels.name;
      card.policyEnrichmentStatus = 'ready';
      this.applyOfferCardAssignerLabel(card, parsed);
    }
  }

  private async resolveDefinition(policyDefinitionId: string): Promise<PolicyDefinition | null> {
    const cached = this.cache.get(policyDefinitionId);
    if (cached) {
      return cached;
    }

    if (allowDashboardMocks(this.edcConfig)) {
      const mock = getMockPolicyDefinitionForRouteId(policyDefinitionId);
      if (mock) {
        const asDef = mock as PolicyDefinition;
        this.cache.set(policyDefinitionId, asDef);
        return asDef;
      }
    }

    try {
      const def = await this.policyService.getPolicyDefinitionById(policyDefinitionId);
      this.cache.set(policyDefinitionId, def);
      return def;
    } catch {
      return null;
    }
  }
}
