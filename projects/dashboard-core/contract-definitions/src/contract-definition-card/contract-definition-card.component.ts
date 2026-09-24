import { Component, EventEmitter, Input, Output, DoCheck, inject } from '@angular/core';
import { ParticipantNameService } from '@eclipse-edc/dashboard-core';
import type { ContractDefinition } from '@think-it-labs/edc-connector-client';
import { TranslateModule } from '@ngx-translate/core';
import type { OfferCardViewModel } from '../offer-card-view-model';
import { formatOfferPublishedAt } from '../format-offer-published-at';

@Component({
  selector: 'lib-contract-definition-card',
  imports: [TranslateModule],
  templateUrl: './contract-definition-card.component.html',
  styleUrl: './contract-definition-card.component.css',
  standalone: true,
})
export class ContractDefinitionCardComponent implements DoCheck {
  @Input() contractDefinition!: OfferCardViewModel;
  @Input() showButtons = true;
  @Input() disableOpenDetails = false;
  /**
   * La oferta la publica este mismo conector. Se marca con un distintivo y se impide abrir el
   * detalle: contratarla fallaría, y su ficha está disponible en Mis ofertas.
   */
  @Input() isOwnOffer = false;

  @Output() openDetailsEvent = new EventEmitter<OfferCardViewModel>();
  @Output() editContractDefinitionEvent = new EventEmitter<ContractDefinition>();
  @Output() deleteContractDefinitionEvent = new EventEmitter<ContractDefinition>();

  formatPublishedDate(dateValue: string): string {
    return formatOfferPublishedAt(dateValue);
  }

  // resolved provider name (if providerLabel was an id)
  resolvedProvider?: string;
  /** Last providerLabel value we resolved, so we re-resolve when background enrichment mutates it in place. */
  private lastResolvedProvider?: string;

  private readonly participantNameService = inject(ParticipantNameService);

  ngDoCheck(): void {
    // While the policy is still loading the card renders a skeleton, and `providerLabel` may hold a
    // transient placeholder rather than a participant id. Resolving it would hit
    // `GET /participants/<placeholder>` for a value that is never displayed.
    if (this.isPolicyPending()) {
      return;
    }

    // providerLabel is mutated in place by policy enrichment (uid arrives after the initial connectorName),
    // so track the value — not the @Input reference — and re-resolve when it changes.
    const provider = this.contractDefinition?.providerLabel?.trim();
    if (provider === this.lastResolvedProvider) {
      return;
    }
    this.lastResolvedProvider = provider;

    if (!provider) {
      this.resolvedProvider = undefined;
      return;
    }

    this.participantNameService
      .getName(provider)
      .then(name => {
        if (this.lastResolvedProvider === provider) {
          this.resolvedProvider = name;
        }
      })
      .catch(() => {
        if (this.lastResolvedProvider === provider) {
          this.resolvedProvider = undefined;
        }
      });
  }

  isPolicyPending(): boolean {
    // Optional access: ngDoCheck can run before the @Input is bound.
    const status = this.contractDefinition?.policyEnrichmentStatus;
    return status === 'idle' || status === 'loading';
  }

  getAssetTypeKey(title: string): string {
    if (!title) return title;

    const lower = title.trim().toLowerCase();

    const patterns: { pattern: string; key: string }[] = [
      { pattern: 'corpus', key: 'filters.assetType.corpus' },
      { pattern: 'model', key: 'filters.assetType.mlmodel' },
      { pattern: 'api', key: 'filters.assetType.api' },
      { pattern: 'lexical', key: 'filters.assetType.lexicalconceptualresource' },
      { pattern: 'lcr', key: 'filters.assetType.lexicalconceptualresource' },
    ];

    for (const p of patterns) {
      if (lower.includes(p.pattern)) {
        return p.key;
      }
    }

    // Si no coincide, devolvemos el título original (sin traducir) como fallback
    return title;
  }
}
